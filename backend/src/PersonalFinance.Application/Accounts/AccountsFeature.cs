using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Accounts.Models;
using PersonalFinance.Application.Common;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Application.Accounts;

public sealed record CreateAccountCommand(string Name, AccountType Type, string? CurrencyCode, string? InstitutionName) : IRequest<Result<AccountDto>>;
public sealed record GetAccountsQuery(bool IncludeArchived) : IRequest<Result<IReadOnlyList<AccountDto>>>;
public sealed record GetAccountByIdQuery(Guid Id) : IRequest<Result<AccountDto>>;
public sealed record GetAccountSummaryQuery : IRequest<Result<AccountSummaryDto>>;
public sealed record UpdateAccountCommand(Guid Id, string Name, AccountType Type, string CurrencyCode, string? InstitutionName) : IRequest<Result<AccountDto>>;
public sealed record ReorderAccountsCommand(IReadOnlyList<Guid> AccountIds) : IRequest<Result>;
public sealed record ArchiveAccountCommand(Guid Id) : IRequest<Result>;
public sealed record RestoreAccountCommand(Guid Id) : IRequest<Result<AccountDto>>;

public sealed class AccountRequestValidator : AbstractValidator<CreateAccountCommand>
{
    public AccountRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CurrencyCode).Must(code => string.IsNullOrWhiteSpace(code) || IsCurrency(code)).WithMessage("Currency code must be a 3-letter ISO 4217 code.");
        RuleFor(x => x.InstitutionName).MaximumLength(100);
    }

    private static bool IsCurrency(string? value) => value is not null && value.Trim().Length == 3 && value.Trim().All(char.IsLetter);
}

public sealed class UpdateAccountCommandValidator : AbstractValidator<UpdateAccountCommand>
{
    public UpdateAccountCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CurrencyCode).NotEmpty().Must(code => code.Trim().Length == 3 && code.Trim().All(char.IsLetter));
        RuleFor(x => x.InstitutionName).MaximumLength(100);
    }
}

public sealed class ReorderAccountsCommandValidator : AbstractValidator<ReorderAccountsCommand>
{
    public ReorderAccountsCommandValidator() => RuleFor(x => x.AccountIds).NotEmpty().Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Account ids must be unique.");
}

public sealed class AccountsHandler :
    IRequestHandler<CreateAccountCommand, Result<AccountDto>>,
    IRequestHandler<GetAccountsQuery, Result<IReadOnlyList<AccountDto>>>,
    IRequestHandler<GetAccountByIdQuery, Result<AccountDto>>,
    IRequestHandler<GetAccountSummaryQuery, Result<AccountSummaryDto>>,
    IRequestHandler<UpdateAccountCommand, Result<AccountDto>>,
    IRequestHandler<ReorderAccountsCommand, Result>,
    IRequestHandler<ArchiveAccountCommand, Result>,
    IRequestHandler<RestoreAccountCommand, Result<AccountDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public AccountsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<Result<AccountDto>> Handle(CreateAccountCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<AccountDto>();
        var order = _db.Accounts.Where(account => account.UserId == userId.Value && !account.IsArchived).Select(account => account.DisplayOrder).ToArray().DefaultIfEmpty(-1).Max() + 1;
        var account = Account.Create(userId.Value, request.Name, request.Type, request.CurrencyCode, request.InstitutionName, order, _dateTimeProvider.UtcNow);
        _db.AddAccount(account);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<AccountDto>.Success(ToDto(account, 0, false));
    }

    public Task<Result<IReadOnlyList<AccountDto>>> Handle(GetAccountsQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<AccountDto>>.Failure(Error.Unauthorized("Auth", "Authentication is required.")));
        var accounts = _db.Accounts
            .Where(account => account.UserId == userId && (request.IncludeArchived || !account.IsArchived))
            .OrderBy(account => account.DisplayOrder)
            .ThenBy(account => account.CreatedAtUtc)
            .ToArray();
        var balances = GetPostedBalances(userId.Value);
        var openingBalanceAccounts = GetOpeningBalanceAccountIds(userId.Value);
        var dtos = accounts.Select(account => ToDto(account, balances.GetValueOrDefault(account.Id), openingBalanceAccounts.Contains(account.Id))).ToArray();
        return Task.FromResult(Result<IReadOnlyList<AccountDto>>.Success(dtos));
    }

    public Task<Result<AccountDto>> Handle(GetAccountByIdQuery request, CancellationToken cancellationToken)
    {
        var account = FindOwned(request.Id);
        if (account is null) return Task.FromResult(NotFound<AccountDto>());
        var balances = GetPostedBalances(account.UserId);
        var openingBalanceAccounts = GetOpeningBalanceAccountIds(account.UserId);
        return Task.FromResult(Result<AccountDto>.Success(ToDto(account, balances.GetValueOrDefault(account.Id), openingBalanceAccounts.Contains(account.Id))));
    }

    public Task<Result<AccountSummaryDto>> Handle(GetAccountSummaryQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<AccountSummaryDto>.Failure(Error.Unauthorized("Auth", "Authentication is required.")));
        var activeAccounts = _db.Accounts.Where(account => account.UserId == userId.Value && !account.IsArchived).ToArray();
        var balances = GetPostedBalances(userId.Value);
        var rows = activeAccounts
            .GroupBy(account => account.CurrencyCode)
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var asset = group.Where(account => !IsLiability(account.Type)).Sum(account => balances.GetValueOrDefault(account.Id));
                var liability = group.Where(account => IsLiability(account.Type)).Sum(account => balances.GetValueOrDefault(account.Id));
                return new AccountSummaryCurrencyDto(group.Key, asset, liability, asset - liability);
            })
            .ToArray();
        return Task.FromResult(Result<AccountSummaryDto>.Success(new AccountSummaryDto(rows)));
    }

    public async Task<Result<AccountDto>> Handle(UpdateAccountCommand request, CancellationToken cancellationToken)
    {
        var account = FindOwned(request.Id);
        if (account is null) return NotFound<AccountDto>();
        account.Update(request.Name, request.Type, request.CurrencyCode, request.InstitutionName, _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        var balance = GetPostedBalances(account.UserId).GetValueOrDefault(account.Id);
        var hasOpening = GetOpeningBalanceAccountIds(account.UserId).Contains(account.Id);
        return Result<AccountDto>.Success(ToDto(account, balance, hasOpening));
    }

    public async Task<Result> Handle(ReorderAccountsCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result.Failure(Error.Unauthorized("Auth", "Authentication is required."));
        var active = _db.Accounts.Where(account => account.UserId == userId && !account.IsArchived).ToArray();
        if (request.AccountIds.Count != active.Length || request.AccountIds.Except(active.Select(account => account.Id)).Any())
        {
            return Result.Failure(Error.Validation("AccountIds", "Account ids must exactly match active accounts."));
        }

        var utcNow = _dateTimeProvider.UtcNow;
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            for (var i = 0; i < request.AccountIds.Count; i++)
            {
                active.First(account => account.Id == request.AccountIds[i]).SetDisplayOrder(i, utcNow);
            }

            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result.Success();
    }

    public async Task<Result> Handle(ArchiveAccountCommand request, CancellationToken cancellationToken)
    {
        var account = FindOwned(request.Id);
        if (account is null) return Result.Failure(Error.NotFound("Account", "Account was not found."));
        if (account.IsArchived) return Result.Failure(Error.Conflict("Account", "Account is already archived."));
        account.Archive(_dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<AccountDto>> Handle(RestoreAccountCommand request, CancellationToken cancellationToken)
    {
        var account = FindOwned(request.Id);
        if (account is null) return NotFound<AccountDto>();
        var userId = RequireUserId()!.Value;
        var order = _db.Accounts.Where(candidate => candidate.UserId == userId && !candidate.IsArchived).Select(candidate => candidate.DisplayOrder).ToArray().DefaultIfEmpty(-1).Max() + 1;
        account.Restore(order, _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        var balance = GetPostedBalances(userId).GetValueOrDefault(account.Id);
        var hasOpening = GetOpeningBalanceAccountIds(userId).Contains(account.Id);
        return Result<AccountDto>.Success(ToDto(account, balance, hasOpening));
    }

    private Dictionary<Guid, decimal> GetPostedBalances(Guid userId)
    {
        return (from entry in _db.TransactionEntries
                join transaction in _db.Transactions on entry.TransactionId equals transaction.Id
                where transaction.UserId == userId && transaction.Status == TransactionStatus.Posted
                group entry by entry.AccountId into accountEntries
                select new { AccountId = accountEntries.Key, Balance = accountEntries.Sum(entry => entry.Amount) })
            .ToDictionary(row => row.AccountId, row => row.Balance);
    }

    private HashSet<Guid> GetOpeningBalanceAccountIds(Guid userId)
    {
        var openingIds = _db.Transactions.Where(transaction => transaction.UserId == userId && transaction.Type == TransactionType.OpeningBalance && transaction.Status == TransactionStatus.Posted).Select(transaction => transaction.Id).ToArray();
        return _db.TransactionEntries.Where(entry => openingIds.Contains(entry.TransactionId)).Select(entry => entry.AccountId).ToHashSet();
    }

    private Guid? RequireUserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private Account? FindOwned(Guid id) => RequireUserId() is { } userId ? _db.Accounts.FirstOrDefault(account => account.Id == id && account.UserId == userId) : null;
    private static bool IsLiability(AccountType type) => type is AccountType.CreditCard or AccountType.Loan;
    private static string BalanceLabel(AccountType type) => type switch
    {
        AccountType.CreditCard => "Current recorded debt",
        AccountType.Loan => "Current recorded liability",
        _ => "Current balance"
    };

    private static Result<T> Unauthorized<T>() => Result<T>.Failure(Error.Unauthorized("Auth", "Authentication is required."));
    private static Result<T> NotFound<T>() => Result<T>.Failure(Error.NotFound("Account", "Account was not found."));
    private static AccountDto ToDto(Account account, decimal balance, bool hasOpeningBalance) => new(account.Id, account.Name, account.Type, account.CurrencyCode, account.InstitutionName, account.DisplayOrder, account.IsArchived, account.CreatedAtUtc, account.UpdatedAtUtc, balance, BalanceLabel(account.Type), hasOpeningBalance);
}
