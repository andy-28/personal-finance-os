using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Authentication.Models;
using PersonalFinance.Application.Common;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Application.Authentication;

public sealed record RegisterCommand(string Email, string Password, string DisplayName) : IRequest<Result<AuthResponse>>;
public sealed record LoginCommand(string Email, string Password) : IRequest<Result<AuthResponse>>;
public sealed record RefreshCommand(string RefreshToken) : IRequest<Result<AuthResponse>>;
public sealed record LogoutCommand(string RefreshToken) : IRequest<Result>;
public sealed record GetCurrentUserQuery : IRequest<Result<UserDto>>;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain a number.");
    }
}

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class RefreshCommandValidator : AbstractValidator<RefreshCommand>
{
    public RefreshCommandValidator() => RuleFor(x => x.RefreshToken).NotEmpty();
}

public sealed class LogoutCommandValidator : AbstractValidator<LogoutCommand>
{
    public LogoutCommandValidator() => RuleFor(x => x.RefreshToken).NotEmpty();
}

public sealed class AuthenticationHandler :
    IRequestHandler<RegisterCommand, Result<AuthResponse>>,
    IRequestHandler<LoginCommand, Result<AuthResponse>>,
    IRequestHandler<RefreshCommand, Result<AuthResponse>>,
    IRequestHandler<LogoutCommand, Result>,
    IRequestHandler<GetCurrentUserQuery, Result<UserDto>>
{
    private static readonly (string Name, CategoryType Type, string Icon)[] DefaultCategories =
    [
        ("Food", CategoryType.Expense, "utensils"),
        ("Transportation", CategoryType.Expense, "car"),
        ("Housing", CategoryType.Expense, "home"),
        ("Utilities", CategoryType.Expense, "plug"),
        ("Entertainment", CategoryType.Expense, "film"),
        ("Shopping", CategoryType.Expense, "shopping-bag"),
        ("Health", CategoryType.Expense, "heart-pulse"),
        ("Education", CategoryType.Expense, "book-open"),
        ("Travel", CategoryType.Expense, "plane"),
        ("Other Expense", CategoryType.Expense, "circle-dot"),
        ("Salary", CategoryType.Income, "briefcase"),
        ("Bonus", CategoryType.Income, "gift"),
        ("Investment Income", CategoryType.Income, "trending-up"),
        ("Other Income", CategoryType.Income, "circle-dot")
    ];

    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUser _currentUser;

    public AuthenticationHandler(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IDateTimeProvider dateTimeProvider,
        ICurrentUser currentUser)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _dateTimeProvider = dateTimeProvider;
        _currentUser = currentUser;
    }

    public async Task<Result<AuthResponse>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);
        if (_db.Users.Any(user => user.NormalizedEmail == normalizedEmail))
        {
            return Result<AuthResponse>.Failure(Error.Conflict("Email", "Email is already registered."));
        }

        var utcNow = _dateTimeProvider.UtcNow;
        var user = User.Create(request.Email, _passwordHasher.Hash(request.Password), request.DisplayName, utcNow);
        var tokenPair = _tokenService.CreateTokenPair(user);
        var refreshToken = user.AddRefreshToken(tokenPair.RefreshTokenHash, tokenPair.RefreshTokenExpiresAtUtc, utcNow);

        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddUser(user);
            _db.AddRefreshToken(refreshToken);
            var orderByType = new Dictionary<CategoryType, int>();
            foreach (var definition in DefaultCategories)
            {
                var displayOrder = orderByType.TryGetValue(definition.Type, out var current) ? current : 0;
                _db.AddCategory(Category.Create(user.Id, definition.Name, definition.Type, null, definition.Icon, displayOrder, utcNow));
                orderByType[definition.Type] = displayOrder + 1;
            }

            await _db.SaveChangesAsync(ct);
        }, cancellationToken);

        return Result<AuthResponse>.Success(ToAuthResponse(user, tokenPair));
    }

    public async Task<Result<AuthResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);
        var user = _db.Users.FirstOrDefault(candidate => candidate.NormalizedEmail == normalizedEmail);
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse>.Failure(Error.Unauthorized("Credentials", "Email or password is invalid."));
        }

        var utcNow = _dateTimeProvider.UtcNow;
        var tokenPair = _tokenService.CreateTokenPair(user);
        var refreshToken = user.AddRefreshToken(tokenPair.RefreshTokenHash, tokenPair.RefreshTokenExpiresAtUtc, utcNow);
        _db.AddRefreshToken(refreshToken);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(ToAuthResponse(user, tokenPair));
    }

    public async Task<Result<AuthResponse>> Handle(RefreshCommand request, CancellationToken cancellationToken)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);
        var existing = _db.RefreshTokens.FirstOrDefault(token => token.TokenHash == hash);
        var utcNow = _dateTimeProvider.UtcNow;
        if (existing is null || !existing.IsActive(utcNow))
        {
            return Result<AuthResponse>.Failure(Error.Unauthorized("RefreshToken", "Refresh token is invalid."));
        }

        var user = _db.Users.FirstOrDefault(candidate => candidate.Id == existing.UserId);
        if (user is null)
        {
            return Result<AuthResponse>.Failure(Error.Unauthorized("RefreshToken", "Refresh token is invalid."));
        }

        var tokenPair = _tokenService.CreateTokenPair(user);
        var replacement = user.AddRefreshToken(tokenPair.RefreshTokenHash, tokenPair.RefreshTokenExpiresAtUtc, utcNow);
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddRefreshToken(replacement);
            existing.Revoke(utcNow, replacement.Id);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);

        return Result<AuthResponse>.Success(ToAuthResponse(user, tokenPair));
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);
        var token = _db.RefreshTokens.FirstOrDefault(candidate => candidate.TokenHash == hash);
        if (token is not null && !token.IsRevoked)
        {
            token.Revoke(_dateTimeProvider.UtcNow);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }

    public Task<Result<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Task.FromResult(Result<UserDto>.Failure(Error.Unauthorized("CurrentUser", "Authentication is required.")));
        }

        var user = _db.Users.FirstOrDefault(candidate => candidate.Id == _currentUser.UserId);
        return Task.FromResult(user is null
            ? Result<UserDto>.Failure(Error.Unauthorized("CurrentUser", "Authentication is required."))
            : Result<UserDto>.Success(ToUserDto(user)));
    }

    private static AuthResponse ToAuthResponse(User user, TokenPair tokenPair) => new(ToUserDto(user), tokenPair.AccessToken, tokenPair.RefreshToken);
    private static UserDto ToUserDto(User user) => new(user.Id, user.Email, user.DisplayName, user.CreatedAtUtc);
}
