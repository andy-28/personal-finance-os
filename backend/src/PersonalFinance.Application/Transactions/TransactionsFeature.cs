using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.Transactions.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Application.Transactions;

public sealed record CreateIncomeCommand(Guid AccountId, Guid CategoryId, decimal Amount, DateOnly TransactionDate, string? Payee, string? Note) : IRequest<Result<TransactionDto>>;
public sealed record CreateExpenseCommand(Guid AccountId, Guid CategoryId, decimal Amount, DateOnly TransactionDate, string? Payee, string? Note) : IRequest<Result<TransactionDto>>;
public sealed record CreateTransferCommand(Guid FromAccountId, Guid ToAccountId, decimal Amount, DateOnly TransactionDate, string? Note) : IRequest<Result<TransactionDto>>;
public sealed record CreateOpeningBalanceCommand(Guid AccountId, decimal Amount, DateOnly TransactionDate, string? Note) : IRequest<Result<TransactionDto>>;
public sealed record GetTransactionsQuery(DateOnly? From, DateOnly? To, Guid? AccountId, Guid? CategoryId, TransactionType? Type, TransactionStatus? Status, int Page, int PageSize) : IRequest<Result<PagedTransactionsDto>>;
public sealed record GetTransactionByIdQuery(Guid Id) : IRequest<Result<TransactionDto>>;
public sealed record UpdateTransactionCommand(Guid Id, TransactionMutationDto Request) : IRequest<Result<TransactionDto>>;
public sealed record VoidTransactionCommand(Guid Id) : IRequest<Result>;

public sealed class CreateIncomeCommandValidator : AbstractValidator<CreateIncomeCommand>
{
    public CreateIncomeCommandValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Payee).MaximumLength(150);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
{
    public CreateExpenseCommandValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Payee).MaximumLength(150);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class CreateTransferCommandValidator : AbstractValidator<CreateTransferCommand>
{
    public CreateTransferCommandValidator()
    {
        RuleFor(x => x.FromAccountId).NotEmpty();
        RuleFor(x => x.ToAccountId).NotEmpty().NotEqual(x => x.FromAccountId);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class CreateOpeningBalanceCommandValidator : AbstractValidator<CreateOpeningBalanceCommand>
{
    public CreateOpeningBalanceCommandValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Amount).NotEqual(0);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class UpdateTransactionCommandValidator : AbstractValidator<UpdateTransactionCommand>
{
    public UpdateTransactionCommandValidator()
    {
        RuleFor(x => x.Request.Amount).NotEqual(0);
        RuleFor(x => x.Request.Payee).MaximumLength(150);
        RuleFor(x => x.Request.Note).MaximumLength(1000);
    }
}

public sealed class TransactionsHandler :
    IRequestHandler<CreateIncomeCommand, Result<TransactionDto>>,
    IRequestHandler<CreateExpenseCommand, Result<TransactionDto>>,
    IRequestHandler<CreateTransferCommand, Result<TransactionDto>>,
    IRequestHandler<CreateOpeningBalanceCommand, Result<TransactionDto>>,
    IRequestHandler<GetTransactionsQuery, Result<PagedTransactionsDto>>,
    IRequestHandler<GetTransactionByIdQuery, Result<TransactionDto>>,
    IRequestHandler<UpdateTransactionCommand, Result<TransactionDto>>,
    IRequestHandler<VoidTransactionCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public TransactionsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<Result<TransactionDto>> Handle(CreateIncomeCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<TransactionDto>();
        var accountResult = GetActiveAccount(userId.Value, request.AccountId);
        if (accountResult.IsFailure) return Result<TransactionDto>.Failure(accountResult.Errors.ToArray());
        if (IsLiability(accountResult.Value.Type)) return Result<TransactionDto>.Failure(Error.Validation("Account", "Income cannot be posted directly to liability accounts."));
        var categoryResult = GetActiveCategory(userId.Value, request.CategoryId, CategoryType.Income);
        if (categoryResult.IsFailure) return Result<TransactionDto>.Failure(categoryResult.Errors.ToArray());

        var transaction = Transaction.CreateIncome(userId.Value, request.AccountId, request.CategoryId, request.Amount, request.TransactionDate, request.Payee, request.Note, _dateTimeProvider.UtcNow);
        await SaveNewTransaction(transaction, cancellationToken);
        return Result<TransactionDto>.Success(ToDto(transaction, [accountResult.Value], [categoryResult.Value]));
    }

    public async Task<Result<TransactionDto>> Handle(CreateExpenseCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<TransactionDto>();
        var accountResult = GetActiveAccount(userId.Value, request.AccountId);
        if (accountResult.IsFailure) return Result<TransactionDto>.Failure(accountResult.Errors.ToArray());
        var categoryResult = GetActiveCategory(userId.Value, request.CategoryId, CategoryType.Expense);
        if (categoryResult.IsFailure) return Result<TransactionDto>.Failure(categoryResult.Errors.ToArray());

        var transaction = Transaction.CreateExpense(userId.Value, request.AccountId, accountResult.Value.Type, request.CategoryId, request.Amount, request.TransactionDate, request.Payee, request.Note, _dateTimeProvider.UtcNow);
        await SaveNewTransaction(transaction, cancellationToken);
        return Result<TransactionDto>.Success(ToDto(transaction, [accountResult.Value], [categoryResult.Value]));
    }

    public async Task<Result<TransactionDto>> Handle(CreateTransferCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<TransactionDto>();
        var fromResult = GetActiveAccount(userId.Value, request.FromAccountId);
        var toResult = GetActiveAccount(userId.Value, request.ToAccountId);
        if (fromResult.IsFailure) return Result<TransactionDto>.Failure(fromResult.Errors.ToArray());
        if (toResult.IsFailure) return Result<TransactionDto>.Failure(toResult.Errors.ToArray());
        var from = fromResult.Value;
        var to = toResult.Value;
        if (IsLiability(from.Type) || IsLiability(to.Type)) return Result<TransactionDto>.Failure(Error.Validation("Account", "Credit card and loan accounts cannot be used in transfers in Sprint 2."));
        if (from.CurrencyCode != to.CurrencyCode) return Result<TransactionDto>.Failure(Error.Validation("CurrencyCode", "Transfers require accounts with the same currency."));

        var transaction = Transaction.CreateTransfer(userId.Value, request.FromAccountId, request.ToAccountId, request.Amount, request.TransactionDate, request.Note, _dateTimeProvider.UtcNow);
        await SaveNewTransaction(transaction, cancellationToken);
        return Result<TransactionDto>.Success(ToDto(transaction, [from, to], []));
    }

    public async Task<Result<TransactionDto>> Handle(CreateOpeningBalanceCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<TransactionDto>();
        var accountResult = GetActiveAccount(userId.Value, request.AccountId);
        if (accountResult.IsFailure) return Result<TransactionDto>.Failure(accountResult.Errors.ToArray());
        if (HasActiveOpeningBalance(userId.Value, request.AccountId, null)) return Result<TransactionDto>.Failure(Error.Conflict("OpeningBalance", "This account already has an active opening balance."));

        var transaction = Transaction.CreateOpeningBalance(userId.Value, request.AccountId, request.Amount, request.TransactionDate, request.Note, _dateTimeProvider.UtcNow);
        await SaveNewTransaction(transaction, cancellationToken);
        return Result<TransactionDto>.Success(ToDto(transaction, [accountResult.Value], []));
    }

    public Task<Result<PagedTransactionsDto>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<PagedTransactionsDto>.Failure(Error.Unauthorized("Auth", "Authentication is required.")));
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize <= 0 ? 50 : request.PageSize, 1, 100);
        var status = request.Status ?? TransactionStatus.Posted;

        if (request.AccountId is { } accountId && !_db.Accounts.Any(account => account.Id == accountId && account.UserId == userId)) return Task.FromResult(Result<PagedTransactionsDto>.Failure(Error.NotFound("Account", "Account was not found.")));
        if (request.CategoryId is { } categoryId && !_db.Categories.Any(category => category.Id == categoryId && category.UserId == userId)) return Task.FromResult(Result<PagedTransactionsDto>.Failure(Error.NotFound("Category", "Category was not found.")));

        var query = _db.Transactions.Where(transaction => transaction.UserId == userId && transaction.Status == status);
        if (request.From is { } from) query = query.Where(transaction => transaction.TransactionDate >= from);
        if (request.To is { } to) query = query.Where(transaction => transaction.TransactionDate <= to);
        if (request.Type is { } type) query = query.Where(transaction => transaction.Type == type);
        if (request.CategoryId is { } categoryFilter) query = query.Where(transaction => transaction.CategoryId == categoryFilter);
        if (request.AccountId is { } accountFilter)
        {
            var transactionIds = _db.TransactionEntries.Where(entry => entry.AccountId == accountFilter).Select(entry => entry.TransactionId).Distinct().ToArray();
            query = query.Where(transaction => transactionIds.Contains(transaction.Id));
        }

        var totalCount = query.Count();
        var transactions = query.OrderByDescending(transaction => transaction.TransactionDate).ThenByDescending(transaction => transaction.CreatedAtUtc).Skip((page - 1) * pageSize).Take(pageSize).ToArray();
        var items = BuildDtos(transactions);
        return Task.FromResult(Result<PagedTransactionsDto>.Success(new PagedTransactionsDto(items, page, pageSize, totalCount, ((totalCount + pageSize - 1) / pageSize))));
    }

    public Task<Result<TransactionDto>> Handle(GetTransactionByIdQuery request, CancellationToken cancellationToken)
    {
        var transaction = FindOwned(request.Id);
        return Task.FromResult(transaction is null ? NotFound<TransactionDto>() : Result<TransactionDto>.Success(BuildDtos([transaction])[0]));
    }

    public async Task<Result<TransactionDto>> Handle(UpdateTransactionCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<TransactionDto>();
        var transaction = FindOwned(request.Id);
        if (transaction is null) return NotFound<TransactionDto>();
        if (transaction.Status == TransactionStatus.Voided) return Result<TransactionDto>.Failure(Error.Conflict("Transaction", "Voided transactions cannot be updated."));

        var oldEntries = _db.TransactionEntries.Where(entry => entry.TransactionId == transaction.Id).ToArray();
        var utcNow = _dateTimeProvider.UtcNow;
        var result = transaction.Type switch
        {
            TransactionType.Income => UpdateIncome(userId.Value, transaction, request.Request, utcNow),
            TransactionType.Expense => UpdateExpense(userId.Value, transaction, request.Request, utcNow),
            TransactionType.Transfer => UpdateTransfer(userId.Value, transaction, request.Request, utcNow),
            TransactionType.OpeningBalance => UpdateOpeningBalance(userId.Value, transaction, request.Request, utcNow),
            _ => Result.Success()
        };
        if (result.IsFailure) return Result<TransactionDto>.Failure(result.Errors.ToArray());

        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.RemoveTransactionEntries(oldEntries);
            _db.AddTransactionEntries(transaction.Entries);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result<TransactionDto>.Success(BuildDtos([transaction])[0]);
    }

    public async Task<Result> Handle(VoidTransactionCommand request, CancellationToken cancellationToken)
    {
        var transaction = FindOwned(request.Id);
        if (transaction is null) return Result.Failure(Error.NotFound("Transaction", "Transaction was not found."));
        transaction.Void(_dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private Result UpdateIncome(Guid userId, Transaction transaction, TransactionMutationDto request, DateTimeOffset utcNow)
    {
        if (request.AccountId is null || request.CategoryId is null) return Result.Failure(Error.Validation("Transaction", "Income requires accountId and categoryId."));
        var accountResult = GetActiveAccount(userId, request.AccountId.Value);
        if (accountResult.IsFailure) return Result.Failure(accountResult.Errors.ToArray());
        if (IsLiability(accountResult.Value.Type)) return Result.Failure(Error.Validation("Account", "Income cannot be posted directly to liability accounts."));
        var categoryResult = GetActiveCategory(userId, request.CategoryId.Value, CategoryType.Income);
        if (categoryResult.IsFailure) return Result.Failure(categoryResult.Errors.ToArray());
        transaction.UpdateIncome(request.AccountId.Value, request.CategoryId.Value, request.Amount, request.TransactionDate, request.Payee, request.Note, utcNow);
        return Result.Success();
    }

    private Result UpdateExpense(Guid userId, Transaction transaction, TransactionMutationDto request, DateTimeOffset utcNow)
    {
        if (request.AccountId is null || request.CategoryId is null) return Result.Failure(Error.Validation("Transaction", "Expense requires accountId and categoryId."));
        var accountResult = GetActiveAccount(userId, request.AccountId.Value);
        if (accountResult.IsFailure) return Result.Failure(accountResult.Errors.ToArray());
        var categoryResult = GetActiveCategory(userId, request.CategoryId.Value, CategoryType.Expense);
        if (categoryResult.IsFailure) return Result.Failure(categoryResult.Errors.ToArray());
        transaction.UpdateExpense(request.AccountId.Value, accountResult.Value.Type, request.CategoryId.Value, request.Amount, request.TransactionDate, request.Payee, request.Note, utcNow);
        return Result.Success();
    }

    private Result UpdateTransfer(Guid userId, Transaction transaction, TransactionMutationDto request, DateTimeOffset utcNow)
    {
        if (request.FromAccountId is null || request.ToAccountId is null) return Result.Failure(Error.Validation("Transaction", "Transfer requires fromAccountId and toAccountId."));
        var fromResult = GetActiveAccount(userId, request.FromAccountId.Value);
        var toResult = GetActiveAccount(userId, request.ToAccountId.Value);
        if (fromResult.IsFailure) return Result.Failure(fromResult.Errors.ToArray());
        if (toResult.IsFailure) return Result.Failure(toResult.Errors.ToArray());
        if (IsLiability(fromResult.Value.Type) || IsLiability(toResult.Value.Type)) return Result.Failure(Error.Validation("Account", "Credit card and loan accounts cannot be used in transfers in Sprint 2."));
        if (fromResult.Value.CurrencyCode != toResult.Value.CurrencyCode) return Result.Failure(Error.Validation("CurrencyCode", "Transfers require accounts with the same currency."));
        transaction.UpdateTransfer(request.FromAccountId.Value, request.ToAccountId.Value, request.Amount, request.TransactionDate, request.Note, utcNow);
        return Result.Success();
    }

    private Result UpdateOpeningBalance(Guid userId, Transaction transaction, TransactionMutationDto request, DateTimeOffset utcNow)
    {
        if (request.AccountId is null) return Result.Failure(Error.Validation("Transaction", "Opening balance requires accountId."));
        var accountResult = GetActiveAccount(userId, request.AccountId.Value);
        if (accountResult.IsFailure) return Result.Failure(accountResult.Errors.ToArray());
        if (HasActiveOpeningBalance(userId, request.AccountId.Value, transaction.Id)) return Result.Failure(Error.Conflict("OpeningBalance", "This account already has an active opening balance."));
        transaction.UpdateOpeningBalance(request.AccountId.Value, request.Amount, request.TransactionDate, request.Note, utcNow);
        return Result.Success();
    }

    private async Task SaveNewTransaction(Transaction transaction, CancellationToken cancellationToken)
    {
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddTransaction(transaction);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    private bool HasActiveOpeningBalance(Guid userId, Guid accountId, Guid? exceptTransactionId)
    {
        var openingIds = _db.Transactions.Where(transaction => transaction.UserId == userId && transaction.Type == TransactionType.OpeningBalance && transaction.Status == TransactionStatus.Posted && transaction.Id != exceptTransactionId).Select(transaction => transaction.Id).ToArray();
        return _db.TransactionEntries.Any(entry => entry.AccountId == accountId && openingIds.Contains(entry.TransactionId));
    }

    private Result<Account> GetActiveAccount(Guid userId, Guid accountId)
    {
        var account = _db.Accounts.FirstOrDefault(candidate => candidate.Id == accountId && candidate.UserId == userId);
        if (account is null) return Result<Account>.Failure(Error.NotFound("Account", "Account was not found."));
        return account.IsArchived ? Result<Account>.Failure(Error.Conflict("Account", "Archived accounts cannot be used for transactions.")) : Result<Account>.Success(account);
    }

    private Result<Category> GetActiveCategory(Guid userId, Guid categoryId, CategoryType expectedType)
    {
        var category = _db.Categories.FirstOrDefault(candidate => candidate.Id == categoryId && candidate.UserId == userId);
        if (category is null) return Result<Category>.Failure(Error.NotFound("Category", "Category was not found."));
        if (category.IsArchived) return Result<Category>.Failure(Error.Conflict("Category", "Archived categories cannot be used for transactions."));
        if (category.Type != expectedType) return Result<Category>.Failure(Error.Validation("Category", $"Category must be {expectedType}."));
        return Result<Category>.Success(category);
    }

    private IReadOnlyList<TransactionDto> BuildDtos(IReadOnlyList<Transaction> transactions)
    {
        var transactionIds = transactions.Select(transaction => transaction.Id).ToArray();
        var entries = _db.TransactionEntries.Where(entry => transactionIds.Contains(entry.TransactionId)).ToArray();
        var accountIds = entries.Select(entry => entry.AccountId).Distinct().ToArray();
        var categoryIds = transactions.Where(transaction => transaction.CategoryId is not null).Select(transaction => transaction.CategoryId!.Value).Distinct().ToArray();
        var accounts = _db.Accounts.Where(account => accountIds.Contains(account.Id)).ToDictionary(account => account.Id);
        var categories = _db.Categories.Where(category => categoryIds.Contains(category.Id)).ToDictionary(category => category.Id);
        return transactions.Select(transaction => ToDto(transaction, entries.Where(entry => entry.TransactionId == transaction.Id).ToArray(), accounts, categories)).ToArray();
    }

    private static TransactionDto ToDto(Transaction transaction, IReadOnlyList<Account> accounts, IReadOnlyList<Category> categories)
    {
        var accountsById = accounts.ToDictionary(account => account.Id);
        var categoriesById = categories.ToDictionary(category => category.Id);
        return ToDto(transaction, transaction.Entries.ToArray(), accountsById, categoriesById);
    }

    private static TransactionDto ToDto(Transaction transaction, IReadOnlyList<TransactionEntry> entries, IReadOnlyDictionary<Guid, Account> accounts, IReadOnlyDictionary<Guid, Category> categories)
    {
        var entryDtos = entries.Select(entry => new TransactionEntryDto(entry.AccountId, accounts.TryGetValue(entry.AccountId, out var account) ? account.Name : "Unknown account", entry.Amount)).ToArray();
        var categoryDto = transaction.CategoryId is { } categoryId && categories.TryGetValue(categoryId, out var category)
            ? new TransactionCategoryDto(category.Id, category.Name, category.Icon, category.Type)
            : null;
        var displayAmount = transaction.Type switch
        {
            TransactionType.Expense => Math.Abs(entryDtos.Sum(entry => entry.Amount)),
            TransactionType.Transfer => Math.Abs(entryDtos.Where(entry => entry.Amount < 0).Sum(entry => entry.Amount)),
            _ => Math.Abs(entryDtos.Sum(entry => entry.Amount))
        };
        return new TransactionDto(transaction.Id, transaction.Type, transaction.Status, transaction.TransactionDate, categoryDto, transaction.Payee, transaction.Note, displayAmount, entryDtos, transaction.CreatedAtUtc, transaction.UpdatedAtUtc, transaction.VoidedAtUtc);
    }

    private Transaction? FindOwned(Guid id) => RequireUserId() is { } userId ? _db.Transactions.FirstOrDefault(transaction => transaction.Id == id && transaction.UserId == userId) : null;
    private Guid? RequireUserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private static bool IsLiability(AccountType type) => type is AccountType.CreditCard or AccountType.Loan;
    private static Result<T> Unauthorized<T>() => Result<T>.Failure(Error.Unauthorized("Auth", "Authentication is required."));
    private static Result<T> NotFound<T>() => Result<T>.Failure(Error.NotFound("Transaction", "Transaction was not found."));
}

