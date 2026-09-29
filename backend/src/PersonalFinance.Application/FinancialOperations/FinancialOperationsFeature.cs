using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.FinancialOperations.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.FinancialEvents;
using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.TransactionCaptures;

namespace PersonalFinance.Application.FinancialOperations;

public sealed record GetFinancialOperationsQuery(int Days = 45, string CurrencyCode = "TWD") : IRequest<Result<FinancialOperationsWorkspaceDto>>;
public sealed record GetFinancialEventByIdQuery(Guid Id) : IRequest<Result<FinancialEventDto>>;
public sealed record CreateFinancialEventCommand(FinancialEventRequest Request) : IRequest<Result<FinancialEventDto>>;
public sealed record UpdateFinancialEventCommand(Guid Id, FinancialEventRequest Request) : IRequest<Result<FinancialEventDto>>;
public sealed record SetFinancialEventStatusCommand(Guid Id, FinancialEventStatus Status) : IRequest<Result<FinancialEventDto>>;
public sealed record AddFinancialEventChecklistItemCommand(Guid EventId, string Text) : IRequest<Result<FinancialEventDto>>;
public sealed record SetFinancialEventChecklistItemCommand(Guid EventId, Guid ItemId, bool IsCompleted) : IRequest<Result<FinancialEventDto>>;
public sealed record LinkFinancialEventCaptureCommand(Guid EventId, Guid CaptureId) : IRequest<Result<FinancialEventDto>>;
public sealed record UnlinkFinancialEventCaptureCommand(Guid EventId, Guid CaptureId) : IRequest<Result<FinancialEventDto>>;
public sealed record PromoteTransactionToFinancialEventCommand(Guid TransactionId, PromoteTransactionRequest Request) : IRequest<Result<FinancialEventDto>>;
public sealed record LinkFinancialEventTransactionCommand(Guid EventId, Guid TransactionId) : IRequest<Result<FinancialEventDto>>;
public sealed record UnlinkFinancialEventTransactionCommand(Guid EventId, Guid TransactionId) : IRequest<Result<FinancialEventDto>>;

public sealed class FinancialEventRequestValidator : AbstractValidator<FinancialEventRequest>
{
    public FinancialEventRequestValidator()
    {
        RuleFor(request => request.Name).NotEmpty().MaximumLength(120);
        RuleFor(request => request.Amount).GreaterThan(0);
        RuleFor(request => request.CurrencyCode).Must(code => string.IsNullOrWhiteSpace(code) || code.Trim().Length == 3).WithMessage("Currency code must contain three letters.");
        RuleFor(request => request.ResultDate).NotNull().When(request => request.Kind == FinancialEventKind.ConditionalExpense);
        RuleFor(request => request.Note).MaximumLength(1000);
    }
}

public sealed class PromoteTransactionToFinancialEventCommandValidator : AbstractValidator<PromoteTransactionToFinancialEventCommand>
{
    public PromoteTransactionToFinancialEventCommandValidator()
    {
        RuleFor(command => command.TransactionId).NotEmpty();
        RuleFor(command => command.Request.Name).NotEmpty().MaximumLength(120);
        RuleFor(command => command.Request.Amount).GreaterThan(0);
        RuleFor(command => command.Request.CurrencyCode).Must(code => string.IsNullOrWhiteSpace(code) || code.Trim().Length == 3).WithMessage("Currency code must contain three letters.");
        RuleFor(command => command.Request.Note).MaximumLength(1000);
        RuleFor(command => command.Request.Kind).Must(kind => kind is FinancialEventKind.ConfirmedExpense or FinancialEventKind.PlannedExpense)
            .WithMessage("Posted transactions can be tracked as confirmed or planned expenses.");
    }
}

public sealed class FinancialOperationsHandler :
    IRequestHandler<GetFinancialOperationsQuery, Result<FinancialOperationsWorkspaceDto>>,
    IRequestHandler<GetFinancialEventByIdQuery, Result<FinancialEventDto>>,
    IRequestHandler<CreateFinancialEventCommand, Result<FinancialEventDto>>,
    IRequestHandler<UpdateFinancialEventCommand, Result<FinancialEventDto>>,
    IRequestHandler<SetFinancialEventStatusCommand, Result<FinancialEventDto>>,
    IRequestHandler<AddFinancialEventChecklistItemCommand, Result<FinancialEventDto>>,
    IRequestHandler<SetFinancialEventChecklistItemCommand, Result<FinancialEventDto>>,
    IRequestHandler<LinkFinancialEventCaptureCommand, Result<FinancialEventDto>>,
    IRequestHandler<UnlinkFinancialEventCaptureCommand, Result<FinancialEventDto>>,
    IRequestHandler<PromoteTransactionToFinancialEventCommand, Result<FinancialEventDto>>,
    IRequestHandler<LinkFinancialEventTransactionCommand, Result<FinancialEventDto>>,
    IRequestHandler<UnlinkFinancialEventTransactionCommand, Result<FinancialEventDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _clock;

    public FinancialOperationsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
    }

    public Task<Result<FinancialOperationsWorkspaceDto>> Handle(GetFinancialOperationsQuery request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Task.FromResult(Result<FinancialOperationsWorkspaceDto>.Failure(Unauthorized()));
        var days = Math.Clamp(request.Days, 1, 366);
        var currency = NormalizeCurrency(request.CurrencyCode);
        if (currency is null) return Task.FromResult(Result<FinancialOperationsWorkspaceDto>.Failure(Error.Validation("CurrencyCode", "Currency code must contain three letters.")));
        var today = DateOnly.FromDateTime(_clock.UtcNow.Date);
        var through = today.AddDays(days);
        var accounts = _db.Accounts.Where(account => account.UserId == userId && !account.IsArchived).ToArray();
        var accountNames = accounts.ToDictionary(account => account.Id, account => account.Name);
        var cards = _db.CreditCardAccounts.Where(card => card.UserId == userId).ToArray();
        var cardMap = cards.ToDictionary(card => card.AccountId);
        var events = _db.FinancialEvents.Where(item => item.UserId == userId)
            .OrderBy(item => item.EventDate).ThenBy(item => item.CreatedAtUtc).ToArray();
        var eventDtos = events.Select(item => ToDto(item, today, accountNames, cardMap)).ToArray();
        var timeline = new List<CashFlowItemDto>();

        foreach (var item in eventDtos.Where(item => !item.IsCashFlowRealized && item.Status is not FinancialEventStatus.Cancelled and not FinancialEventStatus.Completed && item.CashFlowDate >= today && item.CashFlowDate <= through))
        {
            var conditional = item.Kind == FinancialEventKind.ConditionalExpense && item.Status != FinancialEventStatus.Confirmed;
            timeline.Add(new CashFlowItemDto($"event:{item.Id}", "FinancialEvent", item.Kind.ToString(), item.Status.ToString(), item.Name,
                item.EventDate, item.CashFlowDate, -item.Amount, item.CurrencyCode, conditional, item.PaymentSourceAccountId,
                item.PaymentSourceName, item.Id, item.Note));
        }

        AddExpectedIncome(userId.Value, today, through, accountNames, timeline);
        AddCreditCardPayments(userId.Value, today, through, accounts, cards, timeline);
        timeline = timeline.OrderBy(item => item.CashFlowDate).ThenBy(item => item.Title).ToList();

        var balances = PostedBalances(userId.Value);
        var liquidTypes = new[] { AccountType.Cash, AccountType.Checking, AccountType.Savings };
        var currentLiquidity = accounts.Where(account => account.CurrencyCode == currency && liquidTypes.Contains(account.Type)).Sum(account => balances.GetValueOrDefault(account.Id));
        var pendingCount = eventDtos.Count(item => item.Status is FinancialEventStatus.Pending or FinancialEventStatus.Planned);
        var projection = CashFlowProjector.Project(today, days, currency, currentLiquidity, timeline, pendingCount);
        var captures = _db.TransactionCaptures.Where(capture => capture.UserId == userId).OrderByDescending(capture => capture.CapturedAtUtc).Take(200).ToArray();
        var ledgerTransactions = _db.Transactions.Where(transaction => transaction.UserId == userId && transaction.Status == TransactionStatus.Posted)
            .OrderByDescending(transaction => transaction.TransactionDate).ThenByDescending(transaction => transaction.CreatedAtUtc).Take(200).ToArray();
        var ledgerTransactionIds = ledgerTransactions.Select(transaction => transaction.Id).ToArray();
        var ledgerEntries = _db.TransactionEntries.Where(entry => ledgerTransactionIds.Contains(entry.TransactionId)).ToArray();
        var categoryNames = _db.Categories.Where(category => category.UserId == userId).ToDictionary(category => category.Id, category => category.Name);
        var operations = BuildOperations(eventDtos, timeline, captures, ledgerTransactions, ledgerEntries, accounts, accountNames, categoryNames);
        return Task.FromResult(Result<FinancialOperationsWorkspaceDto>.Success(new FinancialOperationsWorkspaceDto(
            today, through, eventDtos, timeline, operations, operations.Count(item => item.NeedsAction), projection)));
    }

    public Task<Result<FinancialEventDto>> Handle(GetFinancialEventByIdQuery request, CancellationToken cancellationToken)
    {
        var item = Owned(request.Id);
        if (item is null) return Task.FromResult(Result<FinancialEventDto>.Failure(NotFound()));
        return Task.FromResult(Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date))));
    }

    public async Task<Result<FinancialEventDto>> Handle(CreateFinancialEventCommand request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Result<FinancialEventDto>.Failure(Unauthorized());
        var validation = ValidateReferences(userId.Value, request.Request, null);
        if (validation.IsFailure) return Result<FinancialEventDto>.Failure(validation.Errors.ToArray());
        try
        {
            var item = FinancialEvent.Create(userId.Value, request.Request.Name, request.Request.Kind, request.Request.Amount,
                request.Request.CurrencyCode, request.Request.EventDate, request.Request.ResultDate, request.Request.PaymentSourceAccountId,
                request.Request.RelatedTransactionId, request.Request.Note, _clock.UtcNow);
            if (request.Request.RelatedTransactionId is { } transactionId) item.LinkPostedTransaction(transactionId, _clock.UtcNow);
            _db.AddFinancialEvent(item);
            AddActivity(item.Id, FinancialEventActivityType.Created, "建立財務事項");
            await _db.SaveChangesAsync(cancellationToken);
            return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
        }
        catch (Exception exception) when (exception is ArgumentException or ArgumentOutOfRangeException)
        {
            return Result<FinancialEventDto>.Failure(Error.Validation("FinancialEvent", exception.Message));
        }
    }

    public async Task<Result<FinancialEventDto>> Handle(UpdateFinancialEventCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.Id);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        var validation = ValidateReferences(item.UserId, request.Request, item.Id);
        if (validation.IsFailure) return Result<FinancialEventDto>.Failure(validation.Errors.ToArray());
        try
        {
            var previousName = item.Name;
            var previousNote = item.Note;
            item.Update(request.Request.Name, request.Request.Kind, request.Request.Amount, request.Request.CurrencyCode ?? "TWD",
                request.Request.EventDate, request.Request.ResultDate, request.Request.PaymentSourceAccountId,
                request.Request.RelatedTransactionId, request.Request.Note, _clock.UtcNow);
            if (request.Request.RelatedTransactionId is { } transactionId) item.LinkPostedTransaction(transactionId, _clock.UtcNow);
            AddActivity(item.Id, FinancialEventActivityType.Updated,
                previousName != item.Name ? $"名稱更新為「{item.Name}」" : previousNote != item.Note ? "更新 Description" : "更新財務事項屬性");
            await _db.SaveChangesAsync(cancellationToken);
            return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
        }
        catch (Exception exception) when (exception is ArgumentException or ArgumentOutOfRangeException)
        {
            return Result<FinancialEventDto>.Failure(Error.Validation("FinancialEvent", exception.Message));
        }
    }

    public async Task<Result<FinancialEventDto>> Handle(SetFinancialEventStatusCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.Id);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        var previousStatus = item.Status;
        try { item.SetStatus(request.Status, _clock.UtcNow); }
        catch (InvalidOperationException exception) { return Result<FinancialEventDto>.Failure(Error.Conflict("FinancialEvent.Status", exception.Message)); }
        if (previousStatus != item.Status)
            AddActivity(item.Id, FinancialEventActivityType.StatusChanged, $"狀態由 {previousStatus} 變更為 {item.Status}");
        await _db.SaveChangesAsync(cancellationToken);
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    public async Task<Result<FinancialEventDto>> Handle(AddFinancialEventChecklistItemCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.EventId);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        try
        {
            var sortOrder = _db.FinancialEventChecklistItems
                .Where(checklist => checklist.FinancialEventId == item.Id)
                .Select(checklist => checklist.SortOrder)
                .ToArray()
                .DefaultIfEmpty(-1)
                .Max() + 1;
            var checklistItem = FinancialEventChecklistItem.Create(item.Id, request.Text, sortOrder, _clock.UtcNow);
            _db.AddFinancialEventChecklistItem(checklistItem);
            AddActivity(item.Id, FinancialEventActivityType.ChecklistAdded, $"新增 Checklist：{checklistItem.Text}");
            item.Touch(_clock.UtcNow);
            await _db.SaveChangesAsync(cancellationToken);
            return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
        }
        catch (ArgumentException exception)
        {
            return Result<FinancialEventDto>.Failure(Error.Validation("Checklist.Text", exception.Message));
        }
    }

    public async Task<Result<FinancialEventDto>> Handle(SetFinancialEventChecklistItemCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.EventId);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        var checklistItem = _db.FinancialEventChecklistItems.FirstOrDefault(checklist => checklist.Id == request.ItemId && checklist.FinancialEventId == item.Id);
        if (checklistItem is null) return Result<FinancialEventDto>.Failure(Error.NotFound("FinancialEventChecklistItem", "Checklist item was not found."));
        if (checklistItem.IsCompleted != request.IsCompleted)
        {
            checklistItem.SetCompleted(request.IsCompleted, _clock.UtcNow);
            AddActivity(item.Id, request.IsCompleted ? FinancialEventActivityType.ChecklistCompleted : FinancialEventActivityType.ChecklistReopened,
                $"{(request.IsCompleted ? "完成" : "重新開啟")} Checklist：{checklistItem.Text}");
            item.Touch(_clock.UtcNow);
            await _db.SaveChangesAsync(cancellationToken);
        }
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    public async Task<Result<FinancialEventDto>> Handle(LinkFinancialEventCaptureCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.EventId);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        var capture = _db.TransactionCaptures.FirstOrDefault(candidate => candidate.Id == request.CaptureId && candidate.UserId == item.UserId);
        if (capture is null) return Result<FinancialEventDto>.Failure(Error.NotFound("TransactionCapture", "Transaction capture was not found."));
        var existingLink = _db.FinancialEventCaptureLinks.FirstOrDefault(link => link.TransactionCaptureId == capture.Id);
        if (existingLink is not null && existingLink.FinancialEventId != item.Id)
            return Result<FinancialEventDto>.Failure(Error.Conflict("FinancialEventCaptureLink", "This capture is already linked to another financial event."));
        if (!_db.FinancialEventCaptureLinks.Any(link => link.FinancialEventId == item.Id && link.TransactionCaptureId == capture.Id))
        {
            _db.AddFinancialEventCaptureLink(FinancialEventCaptureLink.Create(item.Id, capture.Id, _clock.UtcNow));
            AddActivity(item.Id, FinancialEventActivityType.CaptureLinked, $"連結 Capture CAP-{ShortKey(capture.Id)}：{capture.Description}");
            item.Touch(_clock.UtcNow);
            await _db.SaveChangesAsync(cancellationToken);
        }
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    public async Task<Result<FinancialEventDto>> Handle(UnlinkFinancialEventCaptureCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.EventId);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        var link = _db.FinancialEventCaptureLinks.FirstOrDefault(candidate => candidate.FinancialEventId == item.Id && candidate.TransactionCaptureId == request.CaptureId);
        if (link is null) return Result<FinancialEventDto>.Failure(Error.NotFound("FinancialEventCaptureLink", "Capture relation was not found."));
        _db.RemoveFinancialEventCaptureLink(link);
        AddActivity(item.Id, FinancialEventActivityType.CaptureUnlinked, $"移除 Capture CAP-{ShortKey(request.CaptureId)} 的連結");
        item.Touch(_clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    public async Task<Result<FinancialEventDto>> Handle(PromoteTransactionToFinancialEventCommand request, CancellationToken cancellationToken)
    {
        var userId = UserId();
        if (userId is null) return Result<FinancialEventDto>.Failure(Unauthorized());
        var transaction = OwnedPostedTransaction(request.TransactionId, userId.Value);
        if (transaction is null) return Result<FinancialEventDto>.Failure(Error.NotFound("Transaction", "Posted transaction was not found."));
        if (_db.FinancialEvents.Any(item => item.RelatedTransactionId == transaction.Id))
            return Result<FinancialEventDto>.Failure(Error.Conflict("RelatedTransactionId", "This transaction is already tracked by a financial event."));
        if (!IsExpenseLike(transaction.Type))
            return Result<FinancialEventDto>.Failure(Error.Validation("Transaction.Type", "Only posted expense transactions can be tracked with the current financial event types."));
        var referenceValidation = ValidatePaymentSource(userId.Value, request.Request.PaymentSourceAccountId);
        if (referenceValidation.IsFailure) return Result<FinancialEventDto>.Failure(referenceValidation.Errors.ToArray());

        var item = FinancialEvent.Create(userId.Value, request.Request.Name, request.Request.Kind, request.Request.Amount,
            request.Request.CurrencyCode, request.Request.EventDate, null, request.Request.PaymentSourceAccountId,
            transaction.Id, request.Request.Note, _clock.UtcNow);
        item.LinkPostedTransaction(transaction.Id, _clock.UtcNow);
        _db.AddFinancialEvent(item);
        AddActivity(item.Id, FinancialEventActivityType.Created, $"由已入帳交易 TXN-{ShortKey(transaction.Id)} 建立財務事項");
        await _db.SaveChangesAsync(cancellationToken);
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    public async Task<Result<FinancialEventDto>> Handle(LinkFinancialEventTransactionCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.EventId);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        var transaction = OwnedPostedTransaction(request.TransactionId, item.UserId);
        if (transaction is null) return Result<FinancialEventDto>.Failure(Error.NotFound("Transaction", "Posted transaction was not found."));
        var linkedEvent = _db.FinancialEvents.FirstOrDefault(candidate => candidate.RelatedTransactionId == transaction.Id);
        if (linkedEvent is not null && linkedEvent.Id != item.Id)
            return Result<FinancialEventDto>.Failure(Error.Conflict("RelatedTransactionId", "This transaction is already tracked by another financial event."));
        if (item.RelatedTransactionId is { } existingId && existingId != transaction.Id)
            return Result<FinancialEventDto>.Failure(Error.Conflict("RelatedTransactionId", "This financial event already has a related ledger transaction."));
        if (item.RelatedTransactionId != transaction.Id)
        {
            item.LinkPostedTransaction(transaction.Id, _clock.UtcNow);
            AddActivity(item.Id, FinancialEventActivityType.TransactionLinked, $"連結已入帳交易 TXN-{ShortKey(transaction.Id)}");
            await _db.SaveChangesAsync(cancellationToken);
        }
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    public async Task<Result<FinancialEventDto>> Handle(UnlinkFinancialEventTransactionCommand request, CancellationToken cancellationToken)
    {
        var item = Owned(request.EventId);
        if (item is null) return Result<FinancialEventDto>.Failure(NotFound());
        if (item.RelatedTransactionId != request.TransactionId)
            return Result<FinancialEventDto>.Failure(Error.NotFound("RelatedTransactionId", "Ledger transaction relation was not found."));
        item.UnlinkTransaction(_clock.UtcNow);
        AddActivity(item.Id, FinancialEventActivityType.TransactionUnlinked,
            $"解除已入帳交易 TXN-{ShortKey(request.TransactionId)} 的連結；現金流仍標記為已實現");
        await _db.SaveChangesAsync(cancellationToken);
        return Result<FinancialEventDto>.Success(ToDto(item, DateOnly.FromDateTime(_clock.UtcNow.Date)));
    }

    private void AddExpectedIncome(Guid userId, DateOnly today, DateOnly through, IReadOnlyDictionary<Guid, string> accountNames, ICollection<CashFlowItemDto> timeline)
    {
        var templates = _db.RecurringTransactionTemplates.Where(template => template.UserId == userId && template.IsActive && template.TransactionType == TransactionType.Income).ToArray();
        foreach (var template in templates)
        {
            var dates = RecurrenceCalculator.GenerateBetween(template.NextOccurrenceDate ?? template.StartDate, through, template.Frequency, template.Interval,
                template.DayOfMonth, template.DayOfWeek, template.StartDate, template.EndDate).Where(date => date >= today);
            foreach (var date in dates)
            {
                timeline.Add(new CashFlowItemDto($"recurring:{template.Id}:{date:yyyyMMdd}", "Recurring", "ExpectedIncome", "Expected",
                    template.Name, date, date, template.Amount, template.CurrencyCode, false, template.SourceAccountId,
                    template.SourceAccountId is { } accountId ? accountNames.GetValueOrDefault(accountId) : null, null, template.Note));
            }
        }
    }

    private void AddCreditCardPayments(Guid userId, DateOnly today, DateOnly through, IReadOnlyList<Account> accounts,
        IReadOnlyList<CreditCardAccount> cards, ICollection<CashFlowItemDto> timeline)
    {
        var balances = PostedBalances(userId);
        var accountNames = accounts.ToDictionary(account => account.Id, account => account.Name);
        foreach (var card in cards)
        {
            var outstanding = Math.Max(balances.GetValueOrDefault(card.AccountId), 0m);
            var schedule = StatementPeriodCalculator.Calculate(today, card.StatementClosingDay, card.PaymentDueDay);
            if (outstanding <= 0 || schedule.NextPaymentDueDate > through) continue;
            timeline.Add(new CashFlowItemDto($"card:{card.AccountId}:{schedule.NextPaymentDueDate:yyyyMMdd}", "CreditCard", "CardPayment", "Projected",
                accountNames.GetValueOrDefault(card.AccountId, card.CardName), schedule.NextClosingDate, schedule.NextPaymentDueDate, -outstanding,
                accounts.FirstOrDefault(account => account.Id == card.AccountId)?.CurrencyCode ?? "TWD", false, card.PaymentAccountId,
                card.PaymentAccountId is { } paymentId ? accountNames.GetValueOrDefault(paymentId) : null, null, "依目前 Ledger outstanding 與信用卡繳款日推估。"));
        }
    }

    private Result ValidateReferences(Guid userId, FinancialEventRequest request, Guid? eventId)
    {
        var paymentValidation = ValidatePaymentSource(userId, request.PaymentSourceAccountId);
        if (paymentValidation.IsFailure) return paymentValidation;
        if (request.RelatedTransactionId is { } transactionId)
        {
            if (OwnedPostedTransaction(transactionId, userId) is null)
                return Result.Failure(Error.NotFound("RelatedTransactionId", "Posted transaction was not found."));
            if (_db.FinancialEvents.Any(item => item.RelatedTransactionId == transactionId && item.Id != eventId))
                return Result.Failure(Error.Conflict("RelatedTransactionId", "This transaction is already tracked by another financial event."));
        }
        return Result.Success();
    }

    private Result ValidatePaymentSource(Guid userId, Guid? paymentSourceAccountId)
    {
        if (paymentSourceAccountId is { } accountId && !_db.Accounts.Any(account => account.Id == accountId && account.UserId == userId && !account.IsArchived))
            return Result.Failure(Error.NotFound("PaymentSourceAccountId", "Payment source was not found."));
        return Result.Success();
    }

    private Dictionary<Guid, decimal> PostedBalances(Guid userId) =>
        (from entry in _db.TransactionEntries
         join transaction in _db.Transactions on entry.TransactionId equals transaction.Id
         where transaction.UserId == userId && transaction.Status == TransactionStatus.Posted
         group entry by entry.AccountId into entries
         select new { AccountId = entries.Key, Balance = entries.Sum(entry => entry.Amount) })
        .ToDictionary(row => row.AccountId, row => row.Balance);

    private FinancialEventDto ToDto(FinancialEvent item, DateOnly today)
    {
        var accounts = _db.Accounts.Where(account => account.UserId == item.UserId).ToDictionary(account => account.Id, account => account.Name);
        var cards = _db.CreditCardAccounts.Where(card => card.UserId == item.UserId).ToDictionary(card => card.AccountId);
        return ToDto(item, today, accounts, cards);
    }

    private FinancialEventDto ToDto(FinancialEvent item, DateOnly today, IReadOnlyDictionary<Guid, string> accountNames, IReadOnlyDictionary<Guid, CreditCardAccount> cards)
    {
        var cashFlowDate = item.PaymentSourceAccountId is { } sourceId && cards.TryGetValue(sourceId, out var card)
            ? StatementPeriodCalculator.Calculate(item.EventDate, card.StatementClosingDay, card.PaymentDueDay).NextPaymentDueDate
            : item.EventDate;
        var checklist = _db.FinancialEventChecklistItems.Where(checklistItem => checklistItem.FinancialEventId == item.Id)
            .OrderBy(checklistItem => checklistItem.SortOrder).ThenBy(checklistItem => checklistItem.CreatedAtUtc)
            .ToArray().Select(checklistItem => new FinancialEventChecklistItemDto(checklistItem.Id, checklistItem.Text, checklistItem.IsCompleted,
                checklistItem.SortOrder, checklistItem.CreatedAtUtc, checklistItem.CompletedAtUtc)).ToArray();
        var captureIds = _db.FinancialEventCaptureLinks.Where(link => link.FinancialEventId == item.Id).Select(link => link.TransactionCaptureId).ToArray();
        var captures = _db.TransactionCaptures.Where(capture => captureIds.Contains(capture.Id) && capture.UserId == item.UserId)
            .OrderByDescending(capture => capture.CapturedAtUtc)
            .ToArray().Select(capture => new RelatedCaptureDto(capture.Id, capture.Description, capture.Amount, capture.CurrencyCode,
                accountNames.GetValueOrDefault(capture.PaymentInstrumentId, "Unknown"), capture.Status.ToString(), capture.CapturedAtUtc)).ToArray();
        var activity = _db.FinancialEventActivities.Where(entry => entry.FinancialEventId == item.Id)
            .OrderByDescending(entry => entry.OccurredAtUtc)
            .ToArray().Select(entry => new FinancialEventActivityDto(entry.Id, entry.Type, entry.Description, entry.OccurredAtUtc)).ToArray();
        var needsAction = item.Kind == FinancialEventKind.ConditionalExpense && item.Status == FinancialEventStatus.Pending && item.ResultDate <= today;
        var relatedTransaction = RelatedTransaction(item, accountNames);
        return new FinancialEventDto(item.Id, item.Name, item.Kind, item.Status, item.Amount, item.CurrencyCode, item.EventDate, cashFlowDate,
            item.ResultDate, item.PaymentSourceAccountId, item.PaymentSourceAccountId is { } accountId ? accountNames.GetValueOrDefault(accountId) : null,
            item.RelatedTransactionId, relatedTransaction, item.IsCashFlowRealized, item.Note, item.CreatedAtUtc, item.UpdatedAtUtc, needsAction, checklist, captures, activity);
    }

    private RelatedLedgerTransactionDto? RelatedTransaction(FinancialEvent item, IReadOnlyDictionary<Guid, string> accountNames)
    {
        if (item.RelatedTransactionId is not { } transactionId) return null;
        var transaction = _db.Transactions.FirstOrDefault(candidate => candidate.Id == transactionId && candidate.UserId == item.UserId);
        if (transaction is null) return null;
        var entries = _db.TransactionEntries.Where(entry => entry.TransactionId == transaction.Id).ToArray();
        var paymentSourceAccountId = entries.FirstOrDefault()?.AccountId;
        var currency = paymentSourceAccountId is { } accountId
            ? _db.Accounts.FirstOrDefault(account => account.Id == accountId && account.UserId == item.UserId)?.CurrencyCode ?? item.CurrencyCode
            : item.CurrencyCode;
        return new RelatedLedgerTransactionDto(transaction.Id, $"TXN-{ShortKey(transaction.Id)}", transaction.Payee ?? transaction.Type.ToString(),
            transaction.Type.ToString(), transaction.Status.ToString(), Math.Abs(LedgerDisplayAmount(transaction.Type, entries)), currency,
            transaction.TransactionDate, paymentSourceAccountId, paymentSourceAccountId is { } sourceId ? accountNames.GetValueOrDefault(sourceId) : null);
    }

    private static IReadOnlyList<OperationalItemDto> BuildOperations(
        IReadOnlyList<FinancialEventDto> events,
        IReadOnlyList<CashFlowItemDto> timeline,
        IReadOnlyList<TransactionCapture> captures,
        IReadOnlyList<Transaction> ledgerTransactions,
        IReadOnlyList<TransactionEntry> ledgerEntries,
        IReadOnlyList<Account> accounts,
        IReadOnlyDictionary<Guid, string> accountNames,
        IReadOnlyDictionary<Guid, string> categoryNames)
    {
        var operations = new List<OperationalItemDto>();
        operations.AddRange(events.Select(item => new OperationalItemDto(
            $"event:{item.Id}", $"FIN-{ShortKey(item.Id)}", "UserWorkItem", "FinancialEvent", item.Kind.ToString(), item.Status.ToString(),
            item.Name, item.Note, item.CashFlowDate, item.ResultDate, -item.Amount, item.CurrencyCode,
            item.Kind == FinancialEventKind.ConditionalExpense && item.Status != FinancialEventStatus.Confirmed,
            item.NeedsAction, item.PaymentSourceAccountId, item.PaymentSourceName, item.Id, null, item.RelatedTransactionId, null, null)));
        operations.AddRange(timeline.Where(item => item.FinancialEventId is null).Select(item => new OperationalItemDto(
            item.Id, item.Source == "CreditCard" ? "CARD-DUE" : "EXPECTED", "SystemDerived", item.Source, item.Kind, item.Status,
            item.Title, item.Note, item.CashFlowDate, item.Date == item.CashFlowDate ? null : item.Date, item.Amount, item.CurrencyCode,
            item.IsConditional, false, item.PaymentSourceAccountId, item.PaymentSourceName, null, null, null, null, null)));
        operations.AddRange(captures.Select(capture => new OperationalItemDto(
            $"capture:{capture.Id}", $"CAP-{ShortKey(capture.Id)}", "CapturedInput", capture.Source.ToString(), "CapturedInput",
            capture.Status.ToString(), capture.Description, capture.Note, DateOnly.FromDateTime(capture.OccurredAtUtc.UtcDateTime),
            DateOnly.FromDateTime(capture.CapturedAtUtc.UtcDateTime), capture.Amount, capture.CurrencyCode, false,
            capture.Status == TransactionCaptureStatus.Pending, capture.PaymentInstrumentId,
            accountNames.GetValueOrDefault(capture.PaymentInstrumentId), null, capture.Id, null, null, null)));
        var accountsById = accounts.ToDictionary(account => account.Id);
        var trackedTransactions = events.Where(item => item.RelatedTransactionId is not null)
            .ToDictionary(item => item.RelatedTransactionId!.Value);
        operations.AddRange(ledgerTransactions.Select(transaction =>
        {
            var entries = ledgerEntries.Where(entry => entry.TransactionId == transaction.Id).ToArray();
            var displayAmount = LedgerDisplayAmount(transaction.Type, entries);
            var primaryAccountId = entries.FirstOrDefault()?.AccountId;
            var primaryAccount = primaryAccountId is { } accountId ? accountsById.GetValueOrDefault(accountId) : null;
            var category = transaction.CategoryId is { } categoryId ? categoryNames.GetValueOrDefault(categoryId) : null;
            var description = string.Join(" · ", new[] { category, transaction.Note }.Where(value => !string.IsNullOrWhiteSpace(value)));
            trackedTransactions.TryGetValue(transaction.Id, out var relatedEvent);
            return new OperationalItemDto(
                $"transaction:{transaction.Id}", $"TXN-{ShortKey(transaction.Id)}", "LedgerActivity", "Ledger", transaction.Type.ToString(),
                transaction.Status.ToString(), transaction.Payee ?? transaction.Type.ToString(), string.IsNullOrWhiteSpace(description) ? null : description,
                transaction.TransactionDate, null, displayAmount, primaryAccount?.CurrencyCode ?? "TWD", false, false,
                primaryAccountId, primaryAccount?.Name, null, null, transaction.Id, relatedEvent?.Id, relatedEvent?.Name);
        }));
        return operations.OrderBy(item => item.FinancialDate).ThenBy(item => item.Title).ToArray();
    }

    private static decimal LedgerDisplayAmount(TransactionType type, IReadOnlyList<TransactionEntry> entries)
    {
        if (type == TransactionType.OpeningBalance) return entries.Sum(entry => entry.Amount);
        var amount = type switch
        {
            TransactionType.Transfer => Math.Abs(entries.Where(entry => entry.Amount < 0).Sum(entry => entry.Amount)),
            TransactionType.CreditCardPayment => Math.Abs(entries.Where(entry => entry.Amount < 0).Select(entry => entry.Amount).DefaultIfEmpty(0m).Max()),
            _ => Math.Abs(entries.Sum(entry => entry.Amount))
        };
        return type is TransactionType.Income or TransactionType.CreditCardRefund ? amount : -amount;
    }

    private void AddActivity(Guid eventId, FinancialEventActivityType type, string description) =>
        _db.AddFinancialEventActivity(FinancialEventActivity.Create(eventId, type, description, _clock.UtcNow));

    private Guid? UserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private FinancialEvent? Owned(Guid id) => UserId() is { } userId ? _db.FinancialEvents.FirstOrDefault(item => item.Id == id && item.UserId == userId) : null;
    private Transaction? OwnedPostedTransaction(Guid id, Guid userId) =>
        _db.Transactions.FirstOrDefault(transaction => transaction.Id == id && transaction.UserId == userId && transaction.Status == TransactionStatus.Posted);
    private static bool IsExpenseLike(TransactionType type) => type is TransactionType.Expense or TransactionType.CreditCardPurchase;
    private static string? NormalizeCurrency(string value) => string.IsNullOrWhiteSpace(value) ? "TWD" : value.Trim().Length == 3 && value.Trim().All(char.IsLetter) ? value.Trim().ToUpperInvariant() : null;
    private static string ShortKey(Guid id) => id.ToString("N")[..6].ToUpperInvariant();
    private static Error Unauthorized() => Error.Unauthorized("Auth", "Authentication is required.");
    private static Error NotFound() => Error.NotFound("FinancialEvent", "Financial event was not found.");
}
