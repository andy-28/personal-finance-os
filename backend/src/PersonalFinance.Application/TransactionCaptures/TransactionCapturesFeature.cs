using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.TransactionCaptures.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.TransactionCaptures;

namespace PersonalFinance.Application.TransactionCaptures;

public sealed record GetTransactionCapturesQuery(TransactionCaptureStatus? Status) : IRequest<Result<IReadOnlyList<TransactionCaptureDto>>>;
public sealed record CreateTransactionCaptureCommand(TransactionCaptureRequest Request, TransactionCaptureSource Source) : IRequest<Result<TransactionCaptureDto>>;
public sealed record DismissTransactionCaptureCommand(Guid Id) : IRequest<Result<TransactionCaptureDto>>;
public sealed record GetCaptureApiTokensQuery : IRequest<Result<IReadOnlyList<CaptureApiTokenDto>>>;
public sealed record CreateCaptureApiTokenCommand(string Name) : IRequest<Result<CreatedCaptureApiTokenDto>>;
public sealed record RevokeCaptureApiTokenCommand(Guid Id) : IRequest<Result>;

public sealed class TransactionCaptureRequestValidator : AbstractValidator<TransactionCaptureRequest>
{
    public TransactionCaptureRequestValidator()
    {
        RuleFor(request => request.Amount).GreaterThan(0).LessThanOrEqualTo(999999999999m);
        RuleFor(request => request.Currency).Must(value => string.IsNullOrWhiteSpace(value) || value.Trim().Length == 3 && value.Trim().All(char.IsLetter)).WithMessage("Currency must be a 3-letter ISO 4217 code.");
        RuleFor(request => request.Description).NotEmpty().MaximumLength(160);
        RuleFor(request => request.MerchantRaw).MaximumLength(200);
        RuleFor(request => request.PaymentInstrumentId).NotEmpty();
        RuleFor(request => request.SourceReference).MaximumLength(120);
        RuleFor(request => request.Note).MaximumLength(1000);
    }
}

public sealed class CreateTransactionCaptureCommandValidator : AbstractValidator<CreateTransactionCaptureCommand>
{
    public CreateTransactionCaptureCommandValidator()
    {
        RuleFor(command => command.Request).NotNull().SetValidator(new TransactionCaptureRequestValidator());
    }
}

public sealed class TransactionCapturesHandler :
    IRequestHandler<GetTransactionCapturesQuery, Result<IReadOnlyList<TransactionCaptureDto>>>,
    IRequestHandler<CreateTransactionCaptureCommand, Result<TransactionCaptureDto>>,
    IRequestHandler<DismissTransactionCaptureCommand, Result<TransactionCaptureDto>>,
    IRequestHandler<GetCaptureApiTokensQuery, Result<IReadOnlyList<CaptureApiTokenDto>>>,
    IRequestHandler<CreateCaptureApiTokenCommand, Result<CreatedCaptureApiTokenDto>>,
    IRequestHandler<RevokeCaptureApiTokenCommand, Result>
{
    private const int MaximumActiveTokens = 5;
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _clock;

    public TransactionCapturesHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
    }

    public Task<Result<IReadOnlyList<TransactionCaptureDto>>> Handle(GetTransactionCapturesQuery request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<TransactionCaptureDto>>.Failure(Unauthorized()));
        var query = _db.TransactionCaptures.Where(item => item.UserId == userId);
        if (request.Status is { } status) query = query.Where(item => item.Status == status);
        var captures = query.OrderByDescending(item => item.CapturedAtUtc).Take(200).ToArray();
        return Task.FromResult(Result<IReadOnlyList<TransactionCaptureDto>>.Success(captures.Select(ToDto).ToArray()));
    }

    public async Task<Result<TransactionCaptureDto>> Handle(CreateTransactionCaptureCommand request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Result<TransactionCaptureDto>.Failure(Unauthorized());
        if (request.Source == TransactionCaptureSource.IosShortcut && string.IsNullOrWhiteSpace(request.Request.SourceReference))
            return Result<TransactionCaptureDto>.Failure(Error.Validation("SourceReference", "iPhone Shortcut captures require a source reference for idempotency."));
        var instrument = _db.Accounts.FirstOrDefault(account => account.Id == request.Request.PaymentInstrumentId && account.UserId == userId && !account.IsArchived);
        if (instrument is null) return Result<TransactionCaptureDto>.Failure(Error.NotFound("PaymentInstrumentId", "Payment instrument was not found."));
        if (request.Request.PaymentInstrumentType == PaymentInstrumentType.CreditCard &&
            (instrument.Type != AccountType.CreditCard || !_db.CreditCardAccounts.Any(card => card.UserId == userId && card.AccountId == instrument.Id)))
            return Result<TransactionCaptureDto>.Failure(Error.Validation("PaymentInstrumentId", "A configured credit card is required."));
        if (request.Request.PaymentInstrumentType == PaymentInstrumentType.Account && instrument.Type == AccountType.CreditCard)
            return Result<TransactionCaptureDto>.Failure(Error.Validation("PaymentInstrumentType", "Credit cards must use the CreditCard instrument type."));

        TransactionCapture? capture = null;
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            if (!string.IsNullOrWhiteSpace(request.Request.SourceReference))
            {
                capture = _db.TransactionCaptures.FirstOrDefault(item => item.UserId == userId && item.Source == request.Source && item.SourceReference == request.Request.SourceReference.Trim());
                if (capture is not null) return;
            }
            capture = TransactionCapture.Create(userId.Value, request.Source, request.Request.Amount, request.Request.Currency,
                request.Request.OccurredAt, request.Request.Description, request.Request.MerchantRaw,
                request.Request.PaymentInstrumentType, instrument.Id, request.Request.SourceReference, request.Request.Note, _clock.UtcNow);
            _db.AddTransactionCapture(capture);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result<TransactionCaptureDto>.Success(ToDto(capture!));
    }

    public async Task<Result<TransactionCaptureDto>> Handle(DismissTransactionCaptureCommand request, CancellationToken cancellationToken)
    {
        var capture = OwnedCapture(request.Id);
        if (capture is null) return Result<TransactionCaptureDto>.Failure(NotFound());
        capture.Dismiss(_clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<TransactionCaptureDto>.Success(ToDto(capture));
    }

    public Task<Result<IReadOnlyList<CaptureApiTokenDto>>> Handle(GetCaptureApiTokensQuery request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<CaptureApiTokenDto>>.Failure(Unauthorized()));
        var tokens = _db.CaptureApiTokens.Where(token => token.UserId == userId).OrderByDescending(token => token.CreatedAtUtc).ToArray();
        return Task.FromResult(Result<IReadOnlyList<CaptureApiTokenDto>>.Success(tokens.Select(ToDto).ToArray()));
    }

    public async Task<Result<CreatedCaptureApiTokenDto>> Handle(CreateCaptureApiTokenCommand request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Result<CreatedCaptureApiTokenDto>.Failure(Unauthorized());
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 100)
            return Result<CreatedCaptureApiTokenDto>.Failure(Error.Validation("Name", "Token name is required and must be 100 characters or fewer."));
        if (_db.CaptureApiTokens.Count(token => token.UserId == userId && token.RevokedAtUtc == null) >= MaximumActiveTokens)
            return Result<CreatedCaptureApiTokenDto>.Failure(Error.Conflict("CaptureApiToken", $"At most {MaximumActiveTokens} active capture tokens are allowed."));
        var plaintext = CaptureTokenSecret.Create();
        var token = CaptureApiToken.Create(userId.Value, request.Name, CaptureTokenSecret.Hash(plaintext), _clock.UtcNow);
        _db.AddCaptureApiToken(token);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<CreatedCaptureApiTokenDto>.Success(new CreatedCaptureApiTokenDto(ToDto(token), plaintext));
    }

    public async Task<Result> Handle(RevokeCaptureApiTokenCommand request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Result.Failure(Unauthorized());
        var token = _db.CaptureApiTokens.FirstOrDefault(item => item.Id == request.Id && item.UserId == userId);
        if (token is null) return Result.Failure(Error.NotFound("CaptureApiToken", "Capture token was not found."));
        token.Revoke(_clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private TransactionCaptureDto ToDto(TransactionCapture item)
    {
        var instrumentName = _db.Accounts.FirstOrDefault(account => account.Id == item.PaymentInstrumentId && account.UserId == item.UserId)?.Name ?? "Unknown";
        var relatedEventId = _db.FinancialEventCaptureLinks.FirstOrDefault(link => link.TransactionCaptureId == item.Id)?.FinancialEventId;
        var eventItem = relatedEventId is { } eventId
            ? _db.FinancialEvents.FirstOrDefault(financialEvent => financialEvent.Id == eventId && financialEvent.UserId == item.UserId)
            : null;
        var relatedEvent = eventItem is null ? null : new RelatedFinancialEventDto(eventItem.Id, eventItem.Name, eventItem.Kind.ToString(), eventItem.Status.ToString());
        return new TransactionCaptureDto(item.Id, item.Source, item.Amount, item.CurrencyCode, item.OccurredAtUtc, item.CapturedAtUtc,
            item.Description, item.MerchantRaw, item.PaymentInstrumentType, item.PaymentInstrumentId, instrumentName, item.Status,
            item.SourceReference, item.Note, item.DismissedAtUtc, relatedEvent);
    }

    private static CaptureApiTokenDto ToDto(CaptureApiToken token) => new(token.Id, token.Name, token.CreatedAtUtc, token.LastUsedAtUtc, token.RevokedAtUtc);
    private Guid? UserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private TransactionCapture? OwnedCapture(Guid id) => UserId() is { } userId ? _db.TransactionCaptures.FirstOrDefault(item => item.Id == id && item.UserId == userId) : null;
    private static Error Unauthorized() => Error.Unauthorized("Auth", "Authentication is required.");
    private static Error NotFound() => Error.NotFound("TransactionCapture", "Transaction capture was not found.");
}
