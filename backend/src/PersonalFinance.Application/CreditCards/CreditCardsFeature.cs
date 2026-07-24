using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.CreditCards.Models;
using PersonalFinance.Application.Transactions.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.StatementImports;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Application.CreditCards;

public sealed record GetCreditCardsQuery : IRequest<Result<IReadOnlyList<CreditCardDto>>>;
public sealed record GetCreditCardDetailQuery(Guid AccountId) : IRequest<Result<CreditCardDetailDto>>;
public sealed record GetCreditCardSummaryQuery(Guid AccountId) : IRequest<Result<CreditCardDto>>;
public sealed record GetCreditCardTransactionsQuery(Guid AccountId) : IRequest<Result<IReadOnlyList<TransactionDto>>>;
public sealed record CreateCreditCardCommand(CreditCardRequest Request) : IRequest<Result<CreditCardDto>>;
public sealed record UpdateCreditCardCommand(Guid AccountId, CreditCardRequest Request) : IRequest<Result<CreditCardDto>>;
public sealed record CreateCreditCardPurchaseCommand(CreditCardPurchaseRequest Request) : IRequest<Result<TransactionDto>>;
public sealed record CreateCreditCardRefundCommand(CreditCardRefundRequest Request) : IRequest<Result<TransactionDto>>;
public sealed record CreateCreditCardPaymentCommand(CreditCardPaymentRequest Request) : IRequest<Result<TransactionDto>>;
public sealed record CreateInstallmentPlanCommand(InstallmentPlanRequest Request) : IRequest<Result<InstallmentPlanDto>>;
public sealed record GetInstallmentPlansQuery(Guid? CreditCardAccountId) : IRequest<Result<IReadOnlyList<InstallmentPlanDto>>>;
public sealed record PostInstallmentScheduleItemCommand(Guid PlanId, Guid ItemId, PostInstallmentScheduleItemRequest Request) : IRequest<Result<TransactionDto>>;

public sealed class CreditCardRequestValidator : AbstractValidator<CreditCardRequest>
{
    public CreditCardRequestValidator()
    {
        RuleFor(x => x.IssuerName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CardName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastFourDigits).Matches("^[0-9]{4}$").When(x => !string.IsNullOrWhiteSpace(x.LastFourDigits));
        RuleFor(x => x.CreditLimit).GreaterThan(0).When(x => x.CreditLimit is not null);
        RuleFor(x => x.StatementClosingDay).InclusiveBetween(1, 31);
        RuleFor(x => x.PaymentDueDay).InclusiveBetween(1, 31);
        RuleFor(x => x.CurrencyCode).Must(code => string.IsNullOrWhiteSpace(code) || code.Trim().Length == 3 && code.Trim().All(char.IsLetter)).WithMessage("Currency code must be a 3-letter ISO 4217 code.");
    }
}

public sealed class CreditCardPurchaseRequestValidator : AbstractValidator<CreditCardPurchaseRequest>
{
    public CreditCardPurchaseRequestValidator()
    {
        RuleFor(x => x.CreditCardAccountId).NotEmpty();
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Merchant).MaximumLength(150);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class CreditCardRefundRequestValidator : AbstractValidator<CreditCardRefundRequest>
{
    public CreditCardRefundRequestValidator()
    {
        RuleFor(x => x.CreditCardAccountId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class CreditCardPaymentRequestValidator : AbstractValidator<CreditCardPaymentRequest>
{
    public CreditCardPaymentRequestValidator()
    {
        RuleFor(x => x.CreditCardAccountId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class InstallmentPlanRequestValidator : AbstractValidator<InstallmentPlanRequest>
{
    public InstallmentPlanRequestValidator()
    {
        RuleFor(x => x.CreditCardAccountId).NotEmpty();
        RuleFor(x => x.Merchant).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.OriginalAmount).GreaterThan(0);
        RuleFor(x => x.InstallmentCount).GreaterThan(0);
    }
}

public sealed class CreditCardsHandler :
    IRequestHandler<GetCreditCardsQuery, Result<IReadOnlyList<CreditCardDto>>>,
    IRequestHandler<GetCreditCardDetailQuery, Result<CreditCardDetailDto>>,
    IRequestHandler<GetCreditCardSummaryQuery, Result<CreditCardDto>>,
    IRequestHandler<GetCreditCardTransactionsQuery, Result<IReadOnlyList<TransactionDto>>>,
    IRequestHandler<CreateCreditCardCommand, Result<CreditCardDto>>,
    IRequestHandler<UpdateCreditCardCommand, Result<CreditCardDto>>,
    IRequestHandler<CreateCreditCardPurchaseCommand, Result<TransactionDto>>,
    IRequestHandler<CreateCreditCardRefundCommand, Result<TransactionDto>>,
    IRequestHandler<CreateCreditCardPaymentCommand, Result<TransactionDto>>,
    IRequestHandler<CreateInstallmentPlanCommand, Result<InstallmentPlanDto>>,
    IRequestHandler<GetInstallmentPlansQuery, Result<IReadOnlyList<InstallmentPlanDto>>>,
    IRequestHandler<PostInstallmentScheduleItemCommand, Result<TransactionDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public CreditCardsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public Task<Result<IReadOnlyList<CreditCardDto>>> Handle(GetCreditCardsQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<CreditCardDto>>.Failure(UnauthorizedError()));
        return Task.FromResult(Result<IReadOnlyList<CreditCardDto>>.Success(BuildCreditCardDtos(userId.Value)));
    }

    public Task<Result<CreditCardDetailDto>> Handle(GetCreditCardDetailQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<CreditCardDetailDto>.Failure(UnauthorizedError()));
        var card = GetOwnedCard(userId.Value, request.AccountId);
        if (card is null) return Task.FromResult(Result<CreditCardDetailDto>.Failure(NotFoundError()));
        var summary = BuildCreditCardDtos(userId.Value, [card]).Single();
        var recentTransactions = BuildCreditCardTransactionDtos(userId.Value, request.AccountId).Take(10).ToArray();
        var plans = BuildInstallmentDtos(userId.Value, request.AccountId);
        return Task.FromResult(Result<CreditCardDetailDto>.Success(new CreditCardDetailDto(summary, recentTransactions, plans)));
    }

    public Task<Result<CreditCardDto>> Handle(GetCreditCardSummaryQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<CreditCardDto>.Failure(UnauthorizedError()));
        var card = GetOwnedCard(userId.Value, request.AccountId);
        return Task.FromResult(card is null ? Result<CreditCardDto>.Failure(NotFoundError()) : Result<CreditCardDto>.Success(BuildCreditCardDtos(userId.Value, [card]).Single()));
    }

    public Task<Result<IReadOnlyList<TransactionDto>>> Handle(GetCreditCardTransactionsQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<TransactionDto>>.Failure(UnauthorizedError()));
        if (GetOwnedCard(userId.Value, request.AccountId) is null) return Task.FromResult(Result<IReadOnlyList<TransactionDto>>.Failure(NotFoundError()));
        return Task.FromResult(Result<IReadOnlyList<TransactionDto>>.Success(BuildCreditCardTransactionDtos(userId.Value, request.AccountId)));
    }

    public async Task<Result<CreditCardDto>> Handle(CreateCreditCardCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<CreditCardDto>.Failure(UnauthorizedError());
        var validation = ValidatePaymentAccount(userId.Value, request.Request.AccountId, request.Request.PaymentAccountId);
        if (validation.IsFailure) return Result<CreditCardDto>.Failure(validation.Errors.ToArray());

        Account account;
        if (request.Request.AccountId is { } accountId)
        {
            var accountResult = GetActiveAccount(userId.Value, accountId);
            if (accountResult.IsFailure) return Result<CreditCardDto>.Failure(accountResult.Errors.ToArray());
            account = accountResult.Value;
            if (account.Type != AccountType.CreditCard) return Result<CreditCardDto>.Failure(Error.Validation("Account", "Credit card configuration requires a CreditCard account."));
            if (_db.CreditCardAccounts.Any(card => card.AccountId == account.Id)) return Result<CreditCardDto>.Failure(Error.Conflict("CreditCard", "This account already has credit card configuration."));
        }
        else
        {
            var order = _db.Accounts.Where(existing => existing.UserId == userId.Value && !existing.IsArchived).Select(existing => existing.DisplayOrder).ToArray().DefaultIfEmpty(-1).Max() + 1;
            account = Account.Create(userId.Value, request.Request.AccountName ?? request.Request.CardName, AccountType.CreditCard, request.Request.CurrencyCode, request.Request.IssuerName, order, _dateTimeProvider.UtcNow);
            _db.AddAccount(account);
        }

        var card = CreditCardAccount.Create(userId.Value, account.Id, request.Request.IssuerName, request.Request.CardName, request.Request.LastFourDigits, request.Request.CreditLimit, request.Request.StatementClosingDay, request.Request.PaymentDueDay, request.Request.PaymentAccountId, _dateTimeProvider.UtcNow);
        _db.AddCreditCardAccount(card);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<CreditCardDto>.Success(BuildCreditCardDtos(userId.Value, [card]).Single());
    }

    public async Task<Result<CreditCardDto>> Handle(UpdateCreditCardCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<CreditCardDto>.Failure(UnauthorizedError());
        var card = GetOwnedCard(userId.Value, request.AccountId);
        if (card is null) return Result<CreditCardDto>.Failure(NotFoundError());
        var validation = ValidatePaymentAccount(userId.Value, request.AccountId, request.Request.PaymentAccountId);
        if (validation.IsFailure) return Result<CreditCardDto>.Failure(validation.Errors.ToArray());
        card.Update(request.Request.IssuerName, request.Request.CardName, request.Request.LastFourDigits, request.Request.CreditLimit, request.Request.StatementClosingDay, request.Request.PaymentDueDay, request.Request.PaymentAccountId, _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<CreditCardDto>.Success(BuildCreditCardDtos(userId.Value, [card]).Single());
    }

    public async Task<Result<TransactionDto>> Handle(CreateCreditCardPurchaseCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<TransactionDto>.Failure(UnauthorizedError());
        var card = GetOwnedActiveCard(userId.Value, request.Request.CreditCardAccountId);
        if (card is null) return Result<TransactionDto>.Failure(NotFoundError());
        var categoryResult = GetActiveCategory(userId.Value, request.Request.CategoryId, CategoryType.Expense);
        if (categoryResult.IsFailure) return Result<TransactionDto>.Failure(categoryResult.Errors.ToArray());
        var transaction = Transaction.CreateCreditCardPurchase(userId.Value, request.Request.CreditCardAccountId, request.Request.CategoryId, request.Request.Amount, request.Request.PurchaseDate, request.Request.Merchant, request.Request.Note, _dateTimeProvider.UtcNow);
        var metadata = CreditCardTransactionMetadata.Create(userId.Value, transaction.Id, request.Request.CreditCardAccountId, request.Request.PurchaseDate, request.Request.PostedDate, request.Request.Merchant, null, _dateTimeProvider.UtcNow);
        await SaveTransactionWithMetadata(transaction, metadata, cancellationToken);
        return Result<TransactionDto>.Success(ToTransactionDto(transaction));
    }

    public async Task<Result<TransactionDto>> Handle(CreateCreditCardRefundCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<TransactionDto>.Failure(UnauthorizedError());
        var card = GetOwnedActiveCard(userId.Value, request.Request.CreditCardAccountId);
        if (card is null) return Result<TransactionDto>.Failure(NotFoundError());
        if (request.Request.OriginalTransactionId is { } originalId)
        {
            var original = _db.Transactions.FirstOrDefault(transaction => transaction.Id == originalId && transaction.UserId == userId.Value && transaction.Type == TransactionType.CreditCardPurchase);
            if (original is null) return Result<TransactionDto>.Failure(Error.NotFound("Transaction", "Original purchase transaction was not found."));
        }

        var transaction = Transaction.CreateCreditCardRefund(userId.Value, request.Request.CreditCardAccountId, request.Request.Amount, request.Request.RefundDate, request.Request.Note, _dateTimeProvider.UtcNow);
        var metadata = CreditCardTransactionMetadata.Create(userId.Value, transaction.Id, request.Request.CreditCardAccountId, request.Request.RefundDate, null, null, request.Request.OriginalTransactionId, _dateTimeProvider.UtcNow);
        await SaveTransactionWithMetadata(transaction, metadata, cancellationToken);
        return Result<TransactionDto>.Success(ToTransactionDto(transaction));
    }

    public async Task<Result<TransactionDto>> Handle(CreateCreditCardPaymentCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<TransactionDto>.Failure(UnauthorizedError());
        var card = GetOwnedActiveCard(userId.Value, request.Request.CreditCardAccountId);
        if (card is null) return Result<TransactionDto>.Failure(NotFoundError());
        var paymentAccountId = request.Request.PaymentAccountId ?? card.PaymentAccountId;
        if (paymentAccountId is null) return Result<TransactionDto>.Failure(Error.Validation("PaymentAccountId", "Payment account is required."));
        var validation = ValidatePaymentAccount(userId.Value, request.Request.CreditCardAccountId, paymentAccountId);
        if (validation.IsFailure) return Result<TransactionDto>.Failure(validation.Errors.ToArray());

        var transaction = Transaction.CreateCreditCardPayment(userId.Value, paymentAccountId.Value, request.Request.CreditCardAccountId, request.Request.Amount, request.Request.PaymentDate, request.Request.Note, _dateTimeProvider.UtcNow);
        var metadata = CreditCardTransactionMetadata.Create(userId.Value, transaction.Id, request.Request.CreditCardAccountId, request.Request.PaymentDate, null, null, null, _dateTimeProvider.UtcNow);
        await SaveTransactionWithMetadata(transaction, metadata, cancellationToken);
        return Result<TransactionDto>.Success(ToTransactionDto(transaction));
    }

    public async Task<Result<InstallmentPlanDto>> Handle(CreateInstallmentPlanCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<InstallmentPlanDto>.Failure(UnauthorizedError());
        if (GetOwnedActiveCard(userId.Value, request.Request.CreditCardAccountId) is null) return Result<InstallmentPlanDto>.Failure(NotFoundError());
        var plan = InstallmentPlan.Create(userId.Value, request.Request.CreditCardAccountId, request.Request.Merchant, request.Request.Description, request.Request.PurchaseDate, request.Request.OriginalAmount, request.Request.InstallmentCount, request.Request.FirstInstallmentDate, _dateTimeProvider.UtcNow);
        _db.AddInstallmentPlan(plan);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<InstallmentPlanDto>.Success(ToInstallmentDto(plan, plan.ScheduleItems.ToArray()));
    }

    public Task<Result<IReadOnlyList<InstallmentPlanDto>>> Handle(GetInstallmentPlansQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<InstallmentPlanDto>>.Failure(UnauthorizedError()));
        return Task.FromResult(Result<IReadOnlyList<InstallmentPlanDto>>.Success(BuildInstallmentDtos(userId.Value, request.CreditCardAccountId)));
    }

    public async Task<Result<TransactionDto>> Handle(PostInstallmentScheduleItemCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<TransactionDto>.Failure(UnauthorizedError());
        var plan = _db.InstallmentPlans.FirstOrDefault(candidate => candidate.Id == request.PlanId && candidate.UserId == userId.Value);
        if (plan is null) return Result<TransactionDto>.Failure(Error.NotFound("InstallmentPlan", "Installment plan was not found."));
        if (GetOwnedActiveCard(userId.Value, plan.CreditCardAccountId) is null) return Result<TransactionDto>.Failure(NotFoundError());
        var item = _db.InstallmentScheduleItems.FirstOrDefault(candidate => candidate.Id == request.ItemId && candidate.InstallmentPlanId == plan.Id);
        if (item is null) return Result<TransactionDto>.Failure(Error.NotFound("InstallmentScheduleItem", "Installment schedule item was not found."));
        if (item.Status != InstallmentScheduleItemStatus.Pending) return Result<TransactionDto>.Failure(Error.Conflict("InstallmentScheduleItem", "Only pending installment schedule items can be posted."));
        var categoryId = request.Request.CategoryId ?? _db.Categories.Where(category => category.UserId == userId.Value && category.Type == CategoryType.Expense && !category.IsArchived).OrderBy(category => category.DisplayOrder).Select(category => category.Id).FirstOrDefault();
        if (categoryId == Guid.Empty) return Result<TransactionDto>.Failure(Error.Validation("CategoryId", "An expense category is required to post an installment."));
        var categoryResult = GetActiveCategory(userId.Value, categoryId, CategoryType.Expense);
        if (categoryResult.IsFailure) return Result<TransactionDto>.Failure(categoryResult.Errors.ToArray());
        var postingDate = request.Request.PostingDate ?? item.DueDate;
        var transaction = Transaction.CreateCreditCardPurchase(userId.Value, plan.CreditCardAccountId, categoryId, item.Amount, postingDate, plan.Merchant, request.Request.Note ?? plan.Description, _dateTimeProvider.UtcNow);
        var metadata = CreditCardTransactionMetadata.Create(userId.Value, transaction.Id, plan.CreditCardAccountId, postingDate, null, plan.Merchant, null, _dateTimeProvider.UtcNow);
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddTransaction(transaction);
            _db.AddCreditCardTransactionMetadata(metadata);
            item.MarkPosted(transaction.Id);
            var items = _db.InstallmentScheduleItems.Where(candidate => candidate.InstallmentPlanId == plan.Id).ToArray();
            plan.RefreshStatus(items, _dateTimeProvider.UtcNow);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result<TransactionDto>.Success(ToTransactionDto(transaction));
    }

    private IReadOnlyList<CreditCardDto> BuildCreditCardDtos(Guid userId, IReadOnlyList<CreditCardAccount>? cards = null)
    {
        var activeCards = cards ?? _db.CreditCardAccounts.Where(card => card.UserId == userId).ToArray();
        var accountIds = activeCards.Select(card => card.AccountId).ToArray();
        var paymentIds = activeCards.Where(card => card.PaymentAccountId is not null).Select(card => card.PaymentAccountId!.Value).ToArray();
        var accounts = _db.Accounts.Where(account => account.UserId == userId && (accountIds.Contains(account.Id) || paymentIds.Contains(account.Id))).ToDictionary(account => account.Id);
        var balances = GetPostedBalances(userId);
        var today = Today();
        var installmentCommitments = BuildInstallmentDtos(userId, null).GroupBy(plan => plan.CreditCardAccountId).ToDictionary(group => group.Key, group => group.Sum(plan => plan.RemainingCommitmentAmount));
        return activeCards
            .Where(card => accounts.ContainsKey(card.AccountId))
            .OrderBy(card => accounts[card.AccountId].DisplayOrder)
            .Select(card =>
            {
                var account = accounts[card.AccountId];
                var ledgerBalance = balances.GetValueOrDefault(card.AccountId);
                var outstanding = Math.Max(ledgerBalance, 0m);
                var creditBalance = Math.Max(-ledgerBalance, 0m);
                var schedule = StatementPeriodCalculator.Calculate(today, card.StatementClosingDay, card.PaymentDueDay);
                var statement = GetEstimatedStatement(userId, card.AccountId, schedule.CurrentStatementPeriod);
                var billed = GetLatestBilledStatement(userId, card.AccountId, outstanding);
                decimal? available = card.CreditLimit is null ? null : Math.Max(card.CreditLimit.Value - outstanding + creditBalance, 0m);
                decimal? utilization = card.CreditLimit is null ? null : outstanding / card.CreditLimit.Value;
                var paymentName = card.PaymentAccountId is { } paymentId && accounts.TryGetValue(paymentId, out var paymentAccount) ? paymentAccount.Name : null;
                return new CreditCardDto(
                    card.AccountId,
                    account.Name,
                    account.CurrencyCode,
                    card.IssuerName,
                    card.CardName,
                    card.LastFourDigits,
                    card.CreditLimit,
                    card.StatementClosingDay,
                    card.PaymentDueDay,
                    card.PaymentAccountId,
                    paymentName,
                    ledgerBalance,
                    outstanding,
                    creditBalance,
                    available,
                    utilization,
                    billed.StatementAmount,
                    billed.OutstandingAmount,
                    Math.Max(outstanding - billed.OutstandingAmount, 0m),
                    ToPeriodDto(schedule.CurrentStatementPeriod),
                    ToPeriodDto(schedule.PreviousStatementPeriod),
                    statement.Charges,
                    statement.Credits,
                    statement.Net,
                    Math.Max(statement.Net, 0m),
                    statement.Net,
                    schedule.NextClosingDate,
                    schedule.NextPaymentDueDate,
                    installmentCommitments.GetValueOrDefault(card.AccountId));
            })
            .ToArray();
    }

    private StatementAmounts GetEstimatedStatement(Guid userId, Guid creditCardAccountId, StatementPeriod period)
    {
        var metadata = _db.CreditCardTransactionMetadata.Where(row => row.UserId == userId && row.CreditCardAccountId == creditCardAccountId && row.PurchaseDate >= period.StartDate && row.PurchaseDate <= period.EndDate).ToArray();
        var ids = metadata.Select(row => row.TransactionId).ToArray();
        var transactions = _db.Transactions.Where(transaction => ids.Contains(transaction.Id) && transaction.Status == TransactionStatus.Posted && (transaction.Type == TransactionType.CreditCardPurchase || transaction.Type == TransactionType.CreditCardRefund)).ToArray();
        var transactionIds = transactions.Select(transaction => transaction.Id).ToArray();
        var amounts = _db.TransactionEntries.Where(entry => transactionIds.Contains(entry.TransactionId) && entry.AccountId == creditCardAccountId).Select(entry => entry.Amount).ToArray();
        var charges = amounts.Where(amount => amount > 0).Sum();
        var credits = Math.Abs(amounts.Where(amount => amount < 0).Sum());
        return new StatementAmounts(charges, credits, charges - credits);
    }

    private BilledStatementAmounts GetLatestBilledStatement(Guid userId, Guid creditCardAccountId, decimal currentOutstanding)
    {
        var latestBatch = _db.StatementImportBatches
            .Where(batch => batch.UserId == userId
                && batch.CreditCardAccountId == creditCardAccountId
                && batch.Status != StatementImportBatchStatus.Failed
                && batch.Status != StatementImportBatchStatus.Duplicate
                && batch.Status != StatementImportBatchStatus.Discarded
                && batch.StatementAmount != null
                && batch.StatementPeriodEnd != null)
            .OrderByDescending(batch => batch.StatementPeriodEnd)
            .ThenByDescending(batch => batch.CreatedAtUtc)
            .FirstOrDefault();

        if (latestBatch is null)
        {
            return new BilledStatementAmounts(0m, 0m);
        }

        var statementAmount = Math.Max(latestBatch.StatementAmount ?? 0m, 0m);
        var periodEnd = latestBatch.StatementPeriodEnd!.Value;
        var afterStatementTransactionIds = _db.CreditCardTransactionMetadata
            .Where(row => row.UserId == userId
                && row.CreditCardAccountId == creditCardAccountId
                && row.PurchaseDate > periodEnd)
            .Select(row => row.TransactionId)
            .ToArray();
        var postedAfterStatementTransactionIds = _db.Transactions
            .Where(transaction => transaction.UserId == userId
                && afterStatementTransactionIds.Contains(transaction.Id)
                && transaction.Status == TransactionStatus.Posted)
            .Select(transaction => transaction.Id)
            .ToArray();
        var creditsAfterStatement = _db.TransactionEntries
            .Where(entry => postedAfterStatementTransactionIds.Contains(entry.TransactionId))
            .Where(entry => entry.AccountId == creditCardAccountId && entry.Amount < 0)
            .Select(entry => -entry.Amount)
            .ToArray()
            .Sum();

        var billedOutstanding = Math.Max(statementAmount - creditsAfterStatement, 0m);
        return new BilledStatementAmounts(statementAmount, Math.Min(billedOutstanding, currentOutstanding));
    }

    private IReadOnlyList<TransactionDto> BuildCreditCardTransactionDtos(Guid userId, Guid creditCardAccountId)
    {
        var ids = _db.TransactionEntries.Where(entry => entry.AccountId == creditCardAccountId).Select(entry => entry.TransactionId).Distinct().ToArray();
        var transactions = _db.Transactions.Where(transaction => transaction.UserId == userId && ids.Contains(transaction.Id)).OrderByDescending(transaction => transaction.TransactionDate).ThenByDescending(transaction => transaction.CreatedAtUtc).ToArray();
        return transactions.Select(ToTransactionDto).ToArray();
    }

    private IReadOnlyList<InstallmentPlanDto> BuildInstallmentDtos(Guid userId, Guid? creditCardAccountId)
    {
        var query = _db.InstallmentPlans.Where(plan => plan.UserId == userId);
        if (creditCardAccountId is { } accountId) query = query.Where(plan => plan.CreditCardAccountId == accountId);
        var plans = query.OrderByDescending(plan => plan.PurchaseDate).ToArray();
        var planIds = plans.Select(plan => plan.Id).ToArray();
        var items = _db.InstallmentScheduleItems.Where(item => planIds.Contains(item.InstallmentPlanId)).ToArray();
        return plans.Select(plan => ToInstallmentDto(plan, items.Where(item => item.InstallmentPlanId == plan.Id).OrderBy(item => item.InstallmentNumber).ToArray())).ToArray();
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

    private async Task SaveTransactionWithMetadata(Transaction transaction, CreditCardTransactionMetadata metadata, CancellationToken cancellationToken)
    {
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddTransaction(transaction);
            _db.AddCreditCardTransactionMetadata(metadata);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    private Result ValidatePaymentAccount(Guid userId, Guid? creditCardAccountId, Guid? paymentAccountId)
    {
        if (paymentAccountId is null) return Result.Success();
        if (creditCardAccountId == paymentAccountId) return Result.Failure(Error.Validation("PaymentAccountId", "Payment account cannot be the credit card itself."));
        var paymentAccount = _db.Accounts.FirstOrDefault(account => account.Id == paymentAccountId && account.UserId == userId);
        if (paymentAccount is null) return Result.Failure(Error.NotFound("PaymentAccountId", "Payment account was not found."));
        if (paymentAccount.IsArchived) return Result.Failure(Error.Conflict("PaymentAccountId", "Archived payment accounts cannot be used."));
        if (paymentAccount.Type == AccountType.CreditCard) return Result.Failure(Error.Validation("PaymentAccountId", "Payment account must be a non-credit-card account."));
        return Result.Success();
    }

    private Result<Account> GetActiveAccount(Guid userId, Guid accountId)
    {
        var account = _db.Accounts.FirstOrDefault(candidate => candidate.Id == accountId && candidate.UserId == userId);
        if (account is null) return Result<Account>.Failure(Error.NotFound("Account", "Account was not found."));
        return account.IsArchived ? Result<Account>.Failure(Error.Conflict("Account", "Archived accounts cannot be used.")) : Result<Account>.Success(account);
    }

    private Result<Category> GetActiveCategory(Guid userId, Guid categoryId, CategoryType expectedType)
    {
        var category = _db.Categories.FirstOrDefault(candidate => candidate.Id == categoryId && candidate.UserId == userId);
        if (category is null) return Result<Category>.Failure(Error.NotFound("Category", "Category was not found."));
        if (category.IsArchived) return Result<Category>.Failure(Error.Conflict("Category", "Archived categories cannot be used."));
        if (category.Type != expectedType) return Result<Category>.Failure(Error.Validation("Category", $"Category must be {expectedType}."));
        return Result<Category>.Success(category);
    }

    private CreditCardAccount? GetOwnedCard(Guid userId, Guid accountId) => _db.CreditCardAccounts.FirstOrDefault(card => card.UserId == userId && card.AccountId == accountId);
    private CreditCardAccount? GetOwnedActiveCard(Guid userId, Guid accountId)
    {
        var card = GetOwnedCard(userId, accountId);
        if (card is null) return null;
        return _db.Accounts.Any(account => account.Id == accountId && account.UserId == userId && !account.IsArchived) ? card : null;
    }

    private DateOnly Today()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Taipei");
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_dateTimeProvider.UtcNow, zone).Date);
    }

    private Guid? RequireUserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private static Error UnauthorizedError() => Error.Unauthorized("Auth", "Authentication is required.");
    private static Error NotFoundError() => Error.NotFound("CreditCard", "Credit card was not found.");
    private static StatementPeriodDto ToPeriodDto(StatementPeriod period) => new(period.StartDate, period.EndDate);
    private static InstallmentPlanDto ToInstallmentDto(InstallmentPlan plan, IReadOnlyList<InstallmentScheduleItem> items)
    {
        var itemDtos = items.Select(item => new InstallmentScheduleItemDto(item.Id, item.InstallmentNumber, item.DueDate, item.Amount, item.TransactionId, item.Status)).ToArray();
        var remaining = itemDtos.Where(item => item.Status == InstallmentScheduleItemStatus.Pending).Sum(item => item.Amount);
        return new InstallmentPlanDto(plan.Id, plan.CreditCardAccountId, plan.Merchant, plan.Description, plan.PurchaseDate, plan.OriginalAmount, plan.InstallmentCount, plan.InstallmentAmount, plan.FirstInstallmentDate, plan.Status, remaining, itemDtos);
    }

    private sealed record StatementAmounts(decimal Charges, decimal Credits, decimal Net);
    private sealed record BilledStatementAmounts(decimal StatementAmount, decimal OutstandingAmount);

    private TransactionDto ToTransactionDto(Transaction transaction)
    {
        var entries = _db.TransactionEntries.Where(entry => entry.TransactionId == transaction.Id).ToArray();
        var accounts = _db.Accounts.Where(account => entries.Select(entry => entry.AccountId).Contains(account.Id)).ToDictionary(account => account.Id);
        var category = transaction.CategoryId is { } categoryId ? _db.Categories.FirstOrDefault(candidate => candidate.Id == categoryId) : null;
        var entryDtos = entries.Select(entry => new TransactionEntryDto(entry.AccountId, accounts.TryGetValue(entry.AccountId, out var account) ? account.Name : "Unknown account", entry.Amount)).ToArray();
        var categoryDto = category is null ? null : new TransactionCategoryDto(category.Id, category.Name, category.Icon, category.Type);
        var displayAmount = Math.Abs(transaction.Type == TransactionType.Transfer || transaction.Type == TransactionType.CreditCardPayment ? entryDtos.Where(entry => entry.Amount < 0).Max(entry => entry.Amount) : entryDtos.Sum(entry => entry.Amount));
        return new TransactionDto(transaction.Id, transaction.Type, transaction.Status, transaction.TransactionDate, categoryDto, transaction.Payee, transaction.Note, displayAmount, entryDtos, transaction.CreatedAtUtc, transaction.UpdatedAtUtc, transaction.VoidedAtUtc);
    }
}
