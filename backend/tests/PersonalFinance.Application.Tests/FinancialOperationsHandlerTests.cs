using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.FinancialOperations;
using PersonalFinance.Application.FinancialOperations.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.FinancialEvents;
using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.StatementImports;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.TransactionCaptures;
using PersonalFinance.Domain.Users;
using PersonalFinance.Domain.UserSettings;

namespace PersonalFinance.Application.Tests;

public sealed class FinancialOperationsHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 17, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task User_Cannot_Access_Another_Users_Event()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        db.EventItems.Add(FinancialEvent.Create(Guid.NewGuid(), "Private", FinancialEventKind.PlannedExpense, 100m, "TWD",
            new DateOnly(2026, 9, 20), null, null, null, null, Now));
        var handler = Handler(db, userId);

        var result = await handler.Handle(new GetFinancialEventByIdQuery(db.EventItems[0].Id), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("FinancialEvent", result.FirstError?.Code);
    }

    [Fact]
    public async Task Creating_Planned_Event_Adds_It_To_Operations_Without_Mutating_Ledger()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var handler = Handler(db, userId);
        var beforeTransactions = db.TransactionItems.Count;
        var beforeEntries = db.EntryItems.Count;

        var result = await handler.Handle(new CreateFinancialEventCommand(new FinancialEventRequest("Japan", FinancialEventKind.PlannedExpense,
            30000m, "TWD", new DateOnly(2026, 10, 8), null, null, null, "Reserve")), CancellationToken.None);
        var workspace = await handler.Handle(new GetFinancialOperationsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(workspace.IsSuccess);
        Assert.Single(db.EventItems);
        var operation = Assert.Single(workspace.Value.Operations, item => item.FinancialEventId == result.Value.Id);
        Assert.Equal("Japan", operation.Title);
        Assert.Equal(FinancialEventStatus.Planned.ToString(), operation.Status);
        Assert.False(operation.NeedsAction);
        Assert.Equal(beforeTransactions, db.TransactionItems.Count);
        Assert.Equal(beforeEntries, db.EntryItems.Count);
    }

    [Fact]
    public async Task Credit_Card_Outstanding_Affects_Liquidity_On_Due_Date_Not_Purchase_Date()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var bank = Account.Create(userId, "Richart", AccountType.Checking, "TWD", null, 0, Now);
        var cardAccount = Account.Create(userId, "GoGo", AccountType.CreditCard, "TWD", null, 1, Now);
        db.AccountItems.AddRange([bank, cardAccount]);
        db.CardItems.Add(CreditCardAccount.Create(userId, cardAccount.Id, "Richart", "GoGo", null, 100000m, 17, 3, bank.Id, Now));
        var opening = Transaction.CreateOpeningBalance(userId, bank.Id, 30000m, new DateOnly(2026, 9, 1), null, Now);
        var purchase = Transaction.CreateCreditCardPurchase(userId, cardAccount.Id, Guid.NewGuid(), 15960m, new DateOnly(2026, 9, 17), "BIGBANG", null, Now);
        db.AddLedger(opening);
        db.AddLedger(purchase);
        var handler = Handler(db, userId);
        var tracked = FinancialEvent.Create(userId, "BIGBANG", FinancialEventKind.ConfirmedExpense, 15960m, "TWD",
            new DateOnly(2026, 9, 17), null, cardAccount.Id, null, null, Now);
        db.EventItems.Add(tracked);
        var linked = await handler.Handle(new LinkFinancialEventTransactionCommand(tracked.Id, purchase.Id), CancellationToken.None);

        var result = await handler.Handle(new GetFinancialOperationsQuery(), CancellationToken.None);

        Assert.True(linked.IsSuccess);
        Assert.True(result.IsSuccess);
        var payment = Assert.Single(result.Value.Timeline, item => item.Kind == "CardPayment");
        var ledgerActivity = Assert.Single(result.Value.Operations, item => item.RecordType == "LedgerActivity" && item.TransactionId == purchase.Id);
        Assert.Equal(new DateOnly(2026, 10, 3), payment.CashFlowDate);
        Assert.Equal(-15960m, payment.Amount);
        Assert.Equal("LedgerActivity", ledgerActivity.RecordType);
        Assert.Equal("BIGBANG", ledgerActivity.Title);
        Assert.Equal(-15960m, ledgerActivity.Amount);
        Assert.Null(ledgerActivity.FinancialEventId);
        Assert.Equal(tracked.Id, ledgerActivity.RelatedFinancialEventId);
        Assert.DoesNotContain(result.Value.Timeline, item => item.FinancialEventId == tracked.Id);
        Assert.DoesNotContain(result.Value.Projection.Points, point => point.Date == new DateOnly(2026, 9, 17) && point.BaselineLiquidity < 30000m);
    }

    [Fact]
    public async Task Promotion_Creates_One_Realized_Work_Item_Without_Mutating_Ledger()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var account = Account.Create(userId, "Richart", AccountType.Checking, "TWD", null, 0, Now);
        db.AccountItems.Add(account);
        var transaction = Transaction.CreateExpense(userId, account.Id, AccountType.Checking, Guid.NewGuid(), 15960m,
            new DateOnly(2026, 9, 16), "BIGBANG", null, Now);
        db.AddLedger(transaction);
        var transactionCount = db.TransactionItems.Count;
        var entryCount = db.EntryItems.Count;
        var handler = Handler(db, userId);
        var request = new PromoteTransactionRequest("BIGBANG", FinancialEventKind.ConfirmedExpense, 15960m, "TWD",
            new DateOnly(2026, 9, 16), account.Id, "Concert expense");

        var promoted = await handler.Handle(new PromoteTransactionToFinancialEventCommand(transaction.Id, request), CancellationToken.None);
        var duplicate = await handler.Handle(new PromoteTransactionToFinancialEventCommand(transaction.Id, request), CancellationToken.None);
        var workspace = await handler.Handle(new GetFinancialOperationsQuery(), CancellationToken.None);

        Assert.True(promoted.IsSuccess);
        Assert.True(duplicate.IsFailure);
        Assert.Equal(transaction.Id, promoted.Value.RelatedTransactionId);
        Assert.True(promoted.Value.IsCashFlowRealized);
        Assert.Equal(transactionCount, db.TransactionItems.Count);
        Assert.Equal(entryCount, db.EntryItems.Count);
        Assert.DoesNotContain(workspace.Value.Timeline, item => item.FinancialEventId == promoted.Value.Id);
        Assert.Equal(0m, workspace.Value.Projection.ConfirmedOutflow);
        Assert.Contains(db.ActivityItems, activity => activity.Description.Contains("由已入帳交易", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Promotion_And_Link_Enforce_Ownership_And_Unlink_Preserves_Realized_State()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var db = new FakeDb();
        var account = Account.Create(userId, "Richart", AccountType.Checking, "TWD", null, 0, Now);
        var otherAccount = Account.Create(otherUserId, "Private", AccountType.Checking, "TWD", null, 0, Now);
        db.AccountItems.AddRange([account, otherAccount]);
        var ownedTransaction = Transaction.CreateExpense(userId, account.Id, AccountType.Checking, Guid.NewGuid(), 10000m,
            new DateOnly(2026, 9, 16), "Owned", null, Now);
        var privateTransaction = Transaction.CreateExpense(otherUserId, otherAccount.Id, AccountType.Checking, Guid.NewGuid(), 100m,
            new DateOnly(2026, 9, 16), "Private", null, Now);
        db.AddLedger(ownedTransaction);
        db.AddLedger(privateTransaction);
        var item = FinancialEvent.Create(userId, "Track expense", FinancialEventKind.ConfirmedExpense, 10000m, "TWD",
            new DateOnly(2026, 9, 16), null, account.Id, null, null, Now);
        db.EventItems.Add(item);
        var handler = Handler(db, userId);
        var transactionCount = db.TransactionItems.Count;
        var entryCount = db.EntryItems.Count;
        var promotionRequest = new PromoteTransactionRequest("Private", FinancialEventKind.ConfirmedExpense, 100m, "TWD",
            new DateOnly(2026, 9, 16), account.Id, null);

        var deniedPromotion = await handler.Handle(new PromoteTransactionToFinancialEventCommand(privateTransaction.Id, promotionRequest), CancellationToken.None);
        var denied = await handler.Handle(new LinkFinancialEventTransactionCommand(item.Id, privateTransaction.Id), CancellationToken.None);
        var linked = await handler.Handle(new LinkFinancialEventTransactionCommand(item.Id, ownedTransaction.Id), CancellationToken.None);
        var unlinked = await handler.Handle(new UnlinkFinancialEventTransactionCommand(item.Id, ownedTransaction.Id), CancellationToken.None);

        Assert.True(deniedPromotion.IsFailure);
        Assert.True(denied.IsFailure);
        Assert.True(linked.IsSuccess);
        Assert.True(unlinked.IsSuccess);
        Assert.Null(unlinked.Value.RelatedTransactionId);
        Assert.True(unlinked.Value.IsCashFlowRealized);
        Assert.Equal(transactionCount, db.TransactionItems.Count);
        Assert.Equal(entryCount, db.EntryItems.Count);
        Assert.Contains(db.ActivityItems, activity => activity.Type == FinancialEventActivityType.TransactionLinked);
        Assert.Contains(db.ActivityItems, activity => activity.Type == FinancialEventActivityType.TransactionUnlinked);
    }

    [Fact]
    public async Task Ordinary_Posted_Expense_Is_Ledger_Activity_Not_Work_Item_Or_Needs_Action()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var account = Account.Create(userId, "Cash", AccountType.Cash, "TWD", null, 0, Now);
        db.AccountItems.Add(account);
        var breakfast = Transaction.CreateExpense(userId, account.Id, AccountType.Cash, Guid.NewGuid(), 80m,
            new DateOnly(2026, 9, 17), "早餐", null, Now);
        db.AddLedger(breakfast);

        var result = await Handler(db, userId).Handle(new GetFinancialOperationsQuery(), CancellationToken.None);

        var activity = Assert.Single(result.Value.Operations, item => item.TransactionId == breakfast.Id);
        Assert.Equal("LedgerActivity", activity.RecordType);
        Assert.False(activity.NeedsAction);
        Assert.Empty(result.Value.FinancialEvents);
        Assert.Equal(0, result.Value.NeedsActionCount);
    }

    [Fact]
    public async Task Future_Unlinked_Event_Remains_In_Projection()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var item = FinancialEvent.Create(userId, "YOASOBI", FinancialEventKind.ConfirmedExpense, 12000m, "TWD",
            new DateOnly(2026, 9, 22), null, null, null, null, Now);
        db.EventItems.Add(item);

        var result = await Handler(db, userId).Handle(new GetFinancialOperationsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Contains(result.Value.Timeline, timelineItem => timelineItem.FinancialEventId == item.Id && timelineItem.Amount == -12000m);
        Assert.Equal(12000m, result.Value.Projection.ConfirmedOutflow);
    }

    [Fact]
    public async Task Checklist_Is_Owner_Scoped_And_Toggle_Creates_Activity()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var item = FinancialEvent.Create(userId, "Japan", FinancialEventKind.PlannedExpense, 30000m, "TWD",
            new DateOnly(2026, 10, 8), null, null, null, "Trip", Now);
        db.EventItems.Add(item);
        var handler = Handler(db, userId);

        var added = await handler.Handle(new AddFinancialEventChecklistItemCommand(item.Id, "購買旅平險"), CancellationToken.None);
        var toggled = await handler.Handle(new SetFinancialEventChecklistItemCommand(item.Id, added.Value.Checklist[0].Id, true), CancellationToken.None);
        var denied = await Handler(db, Guid.NewGuid()).Handle(new SetFinancialEventChecklistItemCommand(item.Id, added.Value.Checklist[0].Id, false), CancellationToken.None);

        Assert.True(toggled.IsSuccess);
        Assert.True(toggled.Value.Checklist[0].IsCompleted);
        Assert.True(denied.IsFailure);
        Assert.Contains(db.ActivityItems, activity => activity.Type == FinancialEventActivityType.ChecklistCompleted);
    }

    [Fact]
    public async Task Capture_Relation_Requires_Ownership_And_Does_Not_Mutate_Ledger()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var account = Account.Create(userId, "Richart GoGo", AccountType.CreditCard, "TWD", null, 0, Now);
        db.AccountItems.Add(account);
        var item = FinancialEvent.Create(userId, "BIGBANG", FinancialEventKind.ConfirmedExpense, 15960m, "TWD",
            new DateOnly(2026, 9, 17), null, account.Id, null, "Ticket", Now);
        var capture = TransactionCapture.Create(userId, TransactionCaptureSource.IosShortcut, 15960m, "TWD", Now, "BIGBANG",
            null, PaymentInstrumentType.CreditCard, account.Id, "capture-1", null, Now);
        var otherCapture = TransactionCapture.Create(Guid.NewGuid(), TransactionCaptureSource.Manual, 100m, "TWD", Now, "Private",
            null, PaymentInstrumentType.Account, Guid.NewGuid(), null, null, Now);
        db.EventItems.Add(item);
        db.CaptureItems.AddRange([capture, otherCapture]);
        var handler = Handler(db, userId);

        var linked = await handler.Handle(new LinkFinancialEventCaptureCommand(item.Id, capture.Id), CancellationToken.None);
        var denied = await handler.Handle(new LinkFinancialEventCaptureCommand(item.Id, otherCapture.Id), CancellationToken.None);

        Assert.True(linked.IsSuccess);
        Assert.True(denied.IsFailure);
        Assert.Single(db.CaptureLinks);
        Assert.Empty(db.TransactionItems);
        Assert.Empty(db.EntryItems);
        Assert.Contains(db.ActivityItems, activity => activity.Type == FinancialEventActivityType.CaptureLinked);
    }

    [Fact]
    public async Task Overdue_Conditional_Pending_Needs_Action_But_Completed_Does_Not()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var pending = FinancialEvent.Create(userId, "YOASOBI", FinancialEventKind.ConditionalExpense, 12000m, "TWD",
            new DateOnly(2026, 9, 10), new DateOnly(2026, 9, 16), null, null, null, Now);
        var completed = FinancialEvent.Create(userId, "Completed", FinancialEventKind.ConditionalExpense, 100m, "TWD",
            new DateOnly(2026, 9, 10), new DateOnly(2026, 9, 16), null, null, null, Now);
        completed.SetStatus(FinancialEventStatus.Completed, Now);
        db.EventItems.AddRange([pending, completed]);

        var result = await Handler(db, userId).Handle(new GetFinancialOperationsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(Assert.Single(result.Value.Operations, operation => operation.FinancialEventId == pending.Id).NeedsAction);
        Assert.False(Assert.Single(result.Value.Operations, operation => operation.FinancialEventId == completed.Id).NeedsAction);
        Assert.Equal(1, result.Value.NeedsActionCount);
    }

    [Fact]
    public async Task Status_Change_Creates_Real_Activity()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var item = FinancialEvent.Create(userId, "YOASOBI", FinancialEventKind.ConditionalExpense, 12000m, "TWD",
            new DateOnly(2026, 9, 22), new DateOnly(2026, 9, 22), null, null, null, Now);
        db.EventItems.Add(item);

        var result = await Handler(db, userId).Handle(new SetFinancialEventStatusCommand(item.Id, FinancialEventStatus.Confirmed), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var activity = Assert.Single(db.ActivityItems);
        Assert.Equal(FinancialEventActivityType.StatusChanged, activity.Type);
        Assert.Contains("Pending", activity.Description);
        Assert.Contains("Confirmed", activity.Description);
    }

    private static FinancialOperationsHandler Handler(FakeDb db, Guid userId) => new(db, new CurrentUser(userId), new Clock());
    private sealed class CurrentUser(Guid id) : ICurrentUser { public Guid UserId { get; } = id; public bool IsAuthenticated => true; }
    private sealed class Clock : IDateTimeProvider { public DateTimeOffset UtcNow => Now; }

    private sealed class FakeDb : IApplicationDbContext
    {
        public List<Account> AccountItems { get; } = [];
        public List<CreditCardAccount> CardItems { get; } = [];
        public List<FinancialEvent> EventItems { get; } = [];
        public List<FinancialEventChecklistItem> ChecklistItems { get; } = [];
        public List<FinancialEventActivity> ActivityItems { get; } = [];
        public List<FinancialEventCaptureLink> CaptureLinks { get; } = [];
        public List<TransactionCapture> CaptureItems { get; } = [];
        public List<Transaction> TransactionItems { get; } = [];
        public List<TransactionEntry> EntryItems { get; } = [];
        public IQueryable<User> Users => Array.Empty<User>().AsQueryable();
        public IQueryable<RefreshToken> RefreshTokens => Array.Empty<RefreshToken>().AsQueryable();
        public IQueryable<Account> Accounts => AccountItems.AsQueryable();
        public IQueryable<Category> Categories => Array.Empty<Category>().AsQueryable();
        public IQueryable<CreditCardAccount> CreditCardAccounts => CardItems.AsQueryable();
        public IQueryable<FinancialEvent> FinancialEvents => EventItems.AsQueryable();
        public IQueryable<FinancialEventChecklistItem> FinancialEventChecklistItems => ChecklistItems.AsQueryable();
        public IQueryable<FinancialEventActivity> FinancialEventActivities => ActivityItems.AsQueryable();
        public IQueryable<FinancialEventCaptureLink> FinancialEventCaptureLinks => CaptureLinks.AsQueryable();
        public IQueryable<CreditCardTransactionMetadata> CreditCardTransactionMetadata => Array.Empty<CreditCardTransactionMetadata>().AsQueryable();
        public IQueryable<InstallmentPlan> InstallmentPlans => Array.Empty<InstallmentPlan>().AsQueryable();
        public IQueryable<InstallmentScheduleItem> InstallmentScheduleItems => Array.Empty<InstallmentScheduleItem>().AsQueryable();
        public IQueryable<StatementImportBatch> StatementImportBatches => Array.Empty<StatementImportBatch>().AsQueryable();
        public IQueryable<StatementImportRow> StatementImportRows => Array.Empty<StatementImportRow>().AsQueryable();
        public IQueryable<RecurringTransactionTemplate> RecurringTransactionTemplates => Array.Empty<RecurringTransactionTemplate>().AsQueryable();
        public IQueryable<RecurringTransactionOccurrence> RecurringTransactionOccurrences => Array.Empty<RecurringTransactionOccurrence>().AsQueryable();
        public IQueryable<Transaction> Transactions => TransactionItems.AsQueryable();
        public IQueryable<TransactionEntry> TransactionEntries => EntryItems.AsQueryable();
        public IQueryable<TransactionCapture> TransactionCaptures => CaptureItems.AsQueryable();
        public IQueryable<CaptureApiToken> CaptureApiTokens => Array.Empty<CaptureApiToken>().AsQueryable();
        public IQueryable<UserSetting> UserSettings => Array.Empty<UserSetting>().AsQueryable();
        public void AddLedger(Transaction transaction) { TransactionItems.Add(transaction); EntryItems.AddRange(transaction.Entries); }
        public void AddUser(User user) { }
        public void AddRefreshToken(RefreshToken refreshToken) { }
        public void AddAccount(Account account) => AccountItems.Add(account);
        public void AddCategory(Category category) { }
        public void AddCreditCardAccount(CreditCardAccount creditCardAccount) => CardItems.Add(creditCardAccount);
        public void AddFinancialEvent(FinancialEvent financialEvent) => EventItems.Add(financialEvent);
        public void AddFinancialEventChecklistItem(FinancialEventChecklistItem item) => ChecklistItems.Add(item);
        public void AddFinancialEventActivity(FinancialEventActivity activity) => ActivityItems.Add(activity);
        public void AddFinancialEventCaptureLink(FinancialEventCaptureLink link) => CaptureLinks.Add(link);
        public void AddCreditCardTransactionMetadata(CreditCardTransactionMetadata metadata) { }
        public void AddInstallmentPlan(InstallmentPlan installmentPlan) { }
        public void AddStatementImportBatch(StatementImportBatch batch) { }
        public void AddStatementImportRows(IEnumerable<StatementImportRow> rows) { }
        public void AddRecurringTransactionTemplate(RecurringTransactionTemplate template) { }
        public void AddRecurringTransactionOccurrence(RecurringTransactionOccurrence occurrence) { }
        public void AddTransaction(Transaction transaction) => AddLedger(transaction);
        public void AddTransactionEntries(IEnumerable<TransactionEntry> entries) => EntryItems.AddRange(entries);
        public void AddTransactionCapture(TransactionCapture capture) => CaptureItems.Add(capture);
        public void AddCaptureApiToken(CaptureApiToken token) { }
        public void AddUserSetting(UserSetting userSetting) { }
        public void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries) { foreach (var entry in entries) EntryItems.Remove(entry); }
        public void RemoveFinancialEventCaptureLink(FinancialEventCaptureLink link) => CaptureLinks.Remove(link);
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken) => Task.FromResult(1);
        public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken) => operation(cancellationToken);
    }
}
