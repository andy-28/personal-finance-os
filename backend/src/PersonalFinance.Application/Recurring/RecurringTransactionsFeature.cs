using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.Recurring.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Application.Recurring;

public sealed record GetRecurringTemplatesQuery(bool IncludeArchived) : IRequest<Result<IReadOnlyList<RecurringTemplateDto>>>;
public sealed record GetRecurringTemplateByIdQuery(Guid Id) : IRequest<Result<RecurringTemplateDto>>;
public sealed record CreateRecurringTemplateCommand(RecurringTemplateRequest Request) : IRequest<Result<RecurringTemplateDto>>;
public sealed record UpdateRecurringTemplateCommand(Guid Id, RecurringTemplateRequest Request) : IRequest<Result<RecurringTemplateDto>>;
public sealed record ArchiveRecurringTemplateCommand(Guid Id) : IRequest<Result>;
public sealed record RestoreRecurringTemplateCommand(Guid Id) : IRequest<Result<RecurringTemplateDto>>;
public sealed record GetUpcomingQuery : IRequest<Result<UpcomingDto>>;
public sealed record PostRecurringOccurrenceCommand(Guid OccurrenceId) : IRequest<Result<Guid>>;
public sealed record SkipRecurringOccurrenceCommand(Guid OccurrenceId) : IRequest<Result>;

public sealed class RecurringTemplateRequestValidator : AbstractValidator<RecurringTemplateRequest>
{
    public RecurringTemplateRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Interval).GreaterThan(0);
        RuleFor(x => x.DayOfMonth).InclusiveBetween(1, 31).When(x => x.DayOfMonth is not null);
        RuleFor(x => x.Merchant).MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(150);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class RecurringTransactionsHandler :
    IRequestHandler<GetRecurringTemplatesQuery, Result<IReadOnlyList<RecurringTemplateDto>>>,
    IRequestHandler<GetRecurringTemplateByIdQuery, Result<RecurringTemplateDto>>,
    IRequestHandler<CreateRecurringTemplateCommand, Result<RecurringTemplateDto>>,
    IRequestHandler<UpdateRecurringTemplateCommand, Result<RecurringTemplateDto>>,
    IRequestHandler<ArchiveRecurringTemplateCommand, Result>,
    IRequestHandler<RestoreRecurringTemplateCommand, Result<RecurringTemplateDto>>,
    IRequestHandler<GetUpcomingQuery, Result<UpcomingDto>>,
    IRequestHandler<PostRecurringOccurrenceCommand, Result<Guid>>,
    IRequestHandler<SkipRecurringOccurrenceCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public RecurringTransactionsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public Task<Result<IReadOnlyList<RecurringTemplateDto>>> Handle(GetRecurringTemplatesQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<RecurringTemplateDto>>.Failure(Unauthorized()));
        var templates = _db.RecurringTransactionTemplates.Where(template => template.UserId == userId && (request.IncludeArchived || template.IsActive)).OrderBy(template => template.Name).ToArray();
        return Task.FromResult(Result<IReadOnlyList<RecurringTemplateDto>>.Success(templates.Select(ToTemplateDto).ToArray()));
    }

    public Task<Result<RecurringTemplateDto>> Handle(GetRecurringTemplateByIdQuery request, CancellationToken cancellationToken)
    {
        var template = FindOwnedTemplate(request.Id);
        return Task.FromResult(template is null ? Result<RecurringTemplateDto>.Failure(NotFound()) : Result<RecurringTemplateDto>.Success(ToTemplateDto(template)));
    }

    public async Task<Result<RecurringTemplateDto>> Handle(CreateRecurringTemplateCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<RecurringTemplateDto>.Failure(Unauthorized());
        var validation = ValidateTemplate(userId.Value, request.Request);
        if (validation.IsFailure) return Result<RecurringTemplateDto>.Failure(validation.Errors.ToArray());
        var template = RecurringTransactionTemplate.Create(userId.Value, request.Request.Name, request.Request.TransactionType, request.Request.Amount, request.Request.Currency, request.Request.SourceAccountId, request.Request.DestinationAccountId, request.Request.CategoryId, request.Request.Merchant, request.Request.Description, request.Request.Note, request.Request.Frequency, request.Request.Interval, request.Request.DayOfMonth, request.Request.DayOfWeek, request.Request.StartDate, request.Request.EndDate, _dateTimeProvider.UtcNow);
        _db.AddRecurringTransactionTemplate(template);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<RecurringTemplateDto>.Success(ToTemplateDto(template));
    }

    public async Task<Result<RecurringTemplateDto>> Handle(UpdateRecurringTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = FindOwnedTemplate(request.Id);
        if (template is null) return Result<RecurringTemplateDto>.Failure(NotFound());
        var userId = RequireUserId()!.Value;
        var validation = ValidateTemplate(userId, request.Request);
        if (validation.IsFailure) return Result<RecurringTemplateDto>.Failure(validation.Errors.ToArray());
        template.Update(request.Request.Name, request.Request.TransactionType, request.Request.Amount, request.Request.Currency ?? "TWD", request.Request.SourceAccountId, request.Request.DestinationAccountId, request.Request.CategoryId, request.Request.Merchant, request.Request.Description, request.Request.Note, request.Request.Frequency, request.Request.Interval, request.Request.DayOfMonth, request.Request.DayOfWeek, request.Request.StartDate, request.Request.EndDate, _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<RecurringTemplateDto>.Success(ToTemplateDto(template));
    }

    public async Task<Result> Handle(ArchiveRecurringTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = FindOwnedTemplate(request.Id);
        if (template is null) return Result.Failure(NotFound());
        template.Archive(_dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<RecurringTemplateDto>> Handle(RestoreRecurringTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = FindOwnedTemplate(request.Id);
        if (template is null) return Result<RecurringTemplateDto>.Failure(NotFound());
        template.Restore(_dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<RecurringTemplateDto>.Success(ToTemplateDto(template));
    }

    public async Task<Result<UpcomingDto>> Handle(GetUpcomingQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<UpcomingDto>.Failure(Unauthorized());
        await GenerateOccurrences(userId.Value, cancellationToken);
        var today = Today();
        var through = today.AddDays(30);
        var templateIds = _db.RecurringTransactionTemplates.Where(template => template.UserId == userId).Select(template => template.Id).ToArray();
        var occurrences = _db.RecurringTransactionOccurrences.Where(occurrence => templateIds.Contains(occurrence.TemplateId) && occurrence.Status == RecurringOccurrenceStatus.Pending && occurrence.ScheduledDate <= through).OrderBy(occurrence => occurrence.ScheduledDate).ToArray();
        return Result<UpcomingDto>.Success(new UpcomingDto(occurrences.Select(ToOccurrenceDto).ToArray(), BuildUpcomingInstallments(userId.Value, through), BuildCreditCardReminders(userId.Value, today, through)));
    }

    public async Task<Result<Guid>> Handle(PostRecurringOccurrenceCommand request, CancellationToken cancellationToken)
    {
        var occurrence = FindOwnedOccurrence(request.OccurrenceId, out var template);
        if (occurrence is null || template is null) return Result<Guid>.Failure(Error.NotFound("Occurrence", "Occurrence was not found."));
        if (occurrence.Status != RecurringOccurrenceStatus.Pending) return Result<Guid>.Failure(Error.Conflict("Occurrence", "Only pending occurrences can be posted."));
        var userId = RequireUserId()!.Value;
        var transactionResult = CreateTransactionFromTemplate(userId, template, occurrence.ScheduledDate);
        if (transactionResult.IsFailure) return Result<Guid>.Failure(transactionResult.Errors.ToArray());
        var transaction = transactionResult.Value;
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddTransaction(transaction);
            if (transaction.Type is TransactionType.CreditCardPurchase or TransactionType.CreditCardPayment && template.SourceAccountId is { } cardOrPaymentAccountId)
            {
                var creditCardAccountId = transaction.Type == TransactionType.CreditCardPayment ? template.DestinationAccountId!.Value : cardOrPaymentAccountId;
                _db.AddCreditCardTransactionMetadata(CreditCardTransactionMetadata.Create(userId, transaction.Id, creditCardAccountId, occurrence.ScheduledDate, null, template.Merchant ?? template.Description, null, _dateTimeProvider.UtcNow));
            }
            occurrence.MarkPosted(transaction.Id, _dateTimeProvider.UtcNow);
            template.AdvanceAfter(occurrence.ScheduledDate, _dateTimeProvider.UtcNow);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result<Guid>.Success(transaction.Id);
    }

    public async Task<Result> Handle(SkipRecurringOccurrenceCommand request, CancellationToken cancellationToken)
    {
        var occurrence = FindOwnedOccurrence(request.OccurrenceId, out var template);
        if (occurrence is null || template is null) return Result.Failure(Error.NotFound("Occurrence", "Occurrence was not found."));
        if (occurrence.Status != RecurringOccurrenceStatus.Pending) return Result.Failure(Error.Conflict("Occurrence", "Only pending occurrences can be skipped."));
        occurrence.Skip(_dateTimeProvider.UtcNow);
        template.AdvanceAfter(occurrence.ScheduledDate, _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private async Task GenerateOccurrences(Guid userId, CancellationToken cancellationToken)
    {
        var today = Today();
        var through = today.AddDays(30);
        var templates = _db.RecurringTransactionTemplates.Where(template => template.UserId == userId && template.IsActive).ToArray();
        foreach (var template in templates)
        {
            var dates = RecurrenceCalculator.GenerateBetween(template.NextOccurrenceDate ?? template.StartDate, through, template.Frequency, template.Interval, template.DayOfMonth, template.DayOfWeek, template.StartDate, template.EndDate);
            foreach (var date in dates)
            {
                if (!_db.RecurringTransactionOccurrences.Any(occurrence => occurrence.TemplateId == template.Id && occurrence.ScheduledDate == date))
                {
                    _db.AddRecurringTransactionOccurrence(RecurringTransactionOccurrence.Create(template.Id, date, _dateTimeProvider.UtcNow));
                }
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private Result<Transaction> CreateTransactionFromTemplate(Guid userId, RecurringTransactionTemplate template, DateOnly date)
    {
        try
        {
            return template.TransactionType switch
            {
                TransactionType.Income => template.SourceAccountId is null || template.CategoryId is null
                    ? Result<Transaction>.Failure(Error.Validation("Template", "Income requires account and category."))
                    : Result<Transaction>.Success(Transaction.CreateIncome(userId, template.SourceAccountId.Value, template.CategoryId.Value, template.Amount, date, template.Description ?? template.Merchant, template.Note, _dateTimeProvider.UtcNow)),
                TransactionType.Expense => template.SourceAccountId is null || template.CategoryId is null
                    ? Result<Transaction>.Failure(Error.Validation("Template", "Expense requires account and category."))
                    : Result<Transaction>.Success(Transaction.CreateExpense(userId, template.SourceAccountId.Value, GetAccount(template.SourceAccountId.Value)!.Type, template.CategoryId.Value, template.Amount, date, template.Merchant ?? template.Description, template.Note, _dateTimeProvider.UtcNow)),
                TransactionType.Transfer => template.SourceAccountId is null || template.DestinationAccountId is null
                    ? Result<Transaction>.Failure(Error.Validation("Template", "Transfer requires source and destination accounts."))
                    : Result<Transaction>.Success(Transaction.CreateTransfer(userId, template.SourceAccountId.Value, template.DestinationAccountId.Value, template.Amount, date, template.Note, _dateTimeProvider.UtcNow)),
                TransactionType.CreditCardPurchase => template.SourceAccountId is null || template.CategoryId is null
                    ? Result<Transaction>.Failure(Error.Validation("Template", "Credit card purchase requires credit card and category."))
                    : Result<Transaction>.Success(Transaction.CreateCreditCardPurchase(userId, template.SourceAccountId.Value, template.CategoryId.Value, template.Amount, date, template.Merchant ?? template.Description, template.Note, _dateTimeProvider.UtcNow)),
                TransactionType.CreditCardPayment => template.SourceAccountId is null || template.DestinationAccountId is null
                    ? Result<Transaction>.Failure(Error.Validation("Template", "Credit card payment requires payment account and credit card account."))
                    : Result<Transaction>.Success(Transaction.CreateCreditCardPayment(userId, template.SourceAccountId.Value, template.DestinationAccountId.Value, template.Amount, date, template.Note, _dateTimeProvider.UtcNow)),
                _ => Result<Transaction>.Failure(Error.Validation("Template", "Unsupported recurring transaction type."))
            };
        }
        catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException or InvalidOperationException)
        {
            return Result<Transaction>.Failure(Error.Validation("Template", ex.Message));
        }
    }

    private Result ValidateTemplate(Guid userId, RecurringTemplateRequest request)
    {
        if (!IsSupported(request.TransactionType)) return Result.Failure(Error.Validation("TransactionType", "Unsupported recurring transaction type."));
        var source = request.SourceAccountId is { } sourceId ? GetActiveAccount(userId, sourceId) : null;
        var destination = request.DestinationAccountId is { } destinationId ? GetActiveAccount(userId, destinationId) : null;
        var category = request.CategoryId is { } categoryId ? _db.Categories.FirstOrDefault(candidate => candidate.Id == categoryId && candidate.UserId == userId && !candidate.IsArchived) : null;
        if (request.SourceAccountId is not null && source is null) return Result.Failure(Error.NotFound("SourceAccountId", "Source account was not found."));
        if (request.DestinationAccountId is not null && destination is null) return Result.Failure(Error.NotFound("DestinationAccountId", "Destination account was not found."));
        if (request.CategoryId is not null && category is null) return Result.Failure(Error.NotFound("Category", "Category was not found."));

        return request.TransactionType switch
        {
            TransactionType.Income when source is null || category is null => Result.Failure(Error.Validation("Template", "Income requires account and income category.")),
            TransactionType.Income when IsLiability(source.Type) => Result.Failure(Error.Validation("SourceAccountId", "Income cannot be posted directly to liability accounts.")),
            TransactionType.Income when category.Type != CategoryType.Income => Result.Failure(Error.Validation("CategoryId", "Income requires an income category.")),
            TransactionType.Expense when source is null || category is null => Result.Failure(Error.Validation("Template", "Expense requires account and expense category.")),
            TransactionType.Expense when category.Type != CategoryType.Expense => Result.Failure(Error.Validation("CategoryId", "Expense requires an expense category.")),
            TransactionType.Transfer when source is null || destination is null => Result.Failure(Error.Validation("Template", "Transfer requires source and destination accounts.")),
            TransactionType.Transfer when source.Id == destination.Id => Result.Failure(Error.Validation("DestinationAccountId", "Transfer accounts must be different.")),
            TransactionType.Transfer when IsLiability(source.Type) || IsLiability(destination.Type) => Result.Failure(Error.Validation("Account", "Credit card and loan accounts cannot be used in transfers.")),
            TransactionType.Transfer when source.CurrencyCode != destination.CurrencyCode => Result.Failure(Error.Validation("CurrencyCode", "Transfers require accounts with the same currency.")),
            TransactionType.CreditCardPurchase when source is null || category is null => Result.Failure(Error.Validation("Template", "Credit card purchase requires credit card and expense category.")),
            TransactionType.CreditCardPurchase when source.Type != AccountType.CreditCard || !HasCreditCardConfiguration(userId, source.Id) => Result.Failure(Error.Validation("SourceAccountId", "Credit card purchase requires a configured credit card account.")),
            TransactionType.CreditCardPurchase when category.Type != CategoryType.Expense => Result.Failure(Error.Validation("CategoryId", "Credit card purchase requires an expense category.")),
            TransactionType.CreditCardPayment when source is null || destination is null => Result.Failure(Error.Validation("Template", "Credit card payment requires payment account and credit card account.")),
            TransactionType.CreditCardPayment when IsLiability(source.Type) => Result.Failure(Error.Validation("SourceAccountId", "Credit card payment requires a non-credit-card payment account.")),
            TransactionType.CreditCardPayment when destination.Type != AccountType.CreditCard || !HasCreditCardConfiguration(userId, destination.Id) => Result.Failure(Error.Validation("DestinationAccountId", "Credit card payment requires a configured credit card account.")),
            _ => Result.Success()
        };
    }

    private IReadOnlyList<UpcomingInstallmentDto> BuildUpcomingInstallments(Guid userId, DateOnly through)
    {
        var plans = _db.InstallmentPlans.Where(plan => plan.UserId == userId && plan.Status != InstallmentPlanStatus.Cancelled).ToArray();
        var planIds = plans.Select(plan => plan.Id).ToArray();
        return _db.InstallmentScheduleItems
            .Where(item => planIds.Contains(item.InstallmentPlanId) && item.Status == InstallmentScheduleItemStatus.Pending && item.DueDate <= through)
            .OrderBy(item => item.DueDate)
            .ToArray()
            .Select(item =>
            {
                var plan = plans.First(plan => plan.Id == item.InstallmentPlanId);
                return new UpcomingInstallmentDto(plan.Id, item.Id, plan.CreditCardAccountId, plan.Merchant, item.DueDate, item.Amount, item.Status.ToString());
            })
            .ToArray();
    }

    private IReadOnlyList<CreditCardReminderDto> BuildCreditCardReminders(Guid userId, DateOnly today, DateOnly through)
    {
        var cards = _db.CreditCardAccounts.Where(card => card.UserId == userId).ToArray();
        var accounts = _db.Accounts.Where(account => cards.Select(card => card.AccountId).Contains(account.Id)).ToDictionary(account => account.Id);
        return cards.SelectMany(card =>
            {
                var schedule = StatementPeriodCalculator.Calculate(today, card.StatementClosingDay, card.PaymentDueDay);
                var name = accounts.TryGetValue(card.AccountId, out var account) ? account.Name : card.CardName;
                return new[]
                {
                    new CreditCardReminderDto(card.AccountId, name, "Closing", schedule.NextClosingDate),
                    new CreditCardReminderDto(card.AccountId, name, "PaymentDue", schedule.NextPaymentDueDate)
                };
            })
            .Where(reminder => reminder.Date <= through)
            .OrderBy(reminder => reminder.Date)
            .ToArray();
    }

    private RecurringTemplateDto ToTemplateDto(RecurringTransactionTemplate template)
    {
        var source = template.SourceAccountId is { } sourceId ? GetAccount(sourceId) : null;
        var destination = template.DestinationAccountId is { } destinationId ? GetAccount(destinationId) : null;
        var category = template.CategoryId is { } categoryId ? _db.Categories.FirstOrDefault(candidate => candidate.Id == categoryId) : null;
        return new RecurringTemplateDto(template.Id, template.Name, template.TransactionType, template.Amount, template.CurrencyCode, template.SourceAccountId, source?.Name, template.DestinationAccountId, destination?.Name, template.CategoryId, category?.Name, template.Merchant, template.Description, template.Note, template.Frequency, template.Interval, template.DayOfMonth, template.DayOfWeek, template.StartDate, template.EndDate, template.NextOccurrenceDate, template.IsActive);
    }

    private RecurringOccurrenceDto ToOccurrenceDto(RecurringTransactionOccurrence occurrence)
    {
        var template = _db.RecurringTransactionTemplates.First(template => template.Id == occurrence.TemplateId);
        var dto = ToTemplateDto(template);
        return new RecurringOccurrenceDto(occurrence.Id, template.Id, template.Name, template.TransactionType, template.Amount, template.CurrencyCode, occurrence.ScheduledDate, occurrence.Status, occurrence.PostedTransactionId, dto.SourceAccountId, dto.SourceAccountName, dto.DestinationAccountId, dto.DestinationAccountName, dto.CategoryId, dto.CategoryName, dto.Merchant, dto.Note);
    }

    private RecurringTransactionTemplate? FindOwnedTemplate(Guid id) => RequireUserId() is { } userId ? _db.RecurringTransactionTemplates.FirstOrDefault(template => template.Id == id && template.UserId == userId) : null;
    private RecurringTransactionOccurrence? FindOwnedOccurrence(Guid id, out RecurringTransactionTemplate? template)
    {
        template = null;
        var occurrence = _db.RecurringTransactionOccurrences.FirstOrDefault(candidate => candidate.Id == id);
        if (occurrence is null) return null;
        template = FindOwnedTemplate(occurrence.TemplateId);
        return template is null ? null : occurrence;
    }

    private Account? GetAccount(Guid id) => _db.Accounts.FirstOrDefault(account => account.Id == id);
    private Account? GetActiveAccount(Guid userId, Guid id) => _db.Accounts.FirstOrDefault(account => account.Id == id && account.UserId == userId && !account.IsArchived);
    private bool HasCreditCardConfiguration(Guid userId, Guid accountId) => _db.CreditCardAccounts.Any(card => card.UserId == userId && card.AccountId == accountId);
    private DateOnly Today()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Taipei");
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_dateTimeProvider.UtcNow, zone).Date);
    }
    private Guid? RequireUserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private static bool IsSupported(TransactionType type) => type is TransactionType.Income or TransactionType.Expense or TransactionType.Transfer or TransactionType.CreditCardPurchase or TransactionType.CreditCardPayment;
    private static bool IsLiability(AccountType type) => type is AccountType.CreditCard or AccountType.Loan;
    private static Error Unauthorized() => Error.Unauthorized("Auth", "Authentication is required.");
    private static Error NotFound() => Error.NotFound("RecurringTransaction", "Recurring transaction template was not found.");
}
