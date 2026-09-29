using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.TransactionCaptures;
using PersonalFinance.Application.TransactionCaptures.Models;
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

public sealed class TransactionCapturesHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 18, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Invalid_Amount_Is_Rejected_By_Command_Validation()
    {
        var request = Request(Guid.NewGuid()) with { Amount = 0m };

        var result = new CreateTransactionCaptureCommandValidator().Validate(
            new CreateTransactionCaptureCommand(request, TransactionCaptureSource.IosShortcut));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName.EndsWith("Amount", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Valid_User_Card_Creates_Capture_Without_Mutating_Ledger()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var card = AddCard(db, userId, "Richart GoGo");
        var transactionCount = db.TransactionItems.Count;
        var entryCount = db.EntryItems.Count;

        var result = await Handler(db, userId).Handle(new CreateTransactionCaptureCommand(Request(card.Id), TransactionCaptureSource.IosShortcut), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(db.CaptureItems);
        Assert.Equal(transactionCount, db.TransactionItems.Count);
        Assert.Equal(entryCount, db.EntryItems.Count);
        Assert.Equal(0m, cardBalance(db, card.Id));
    }

    [Fact]
    public async Task Another_Users_Card_Is_Not_Found()
    {
        var db = new FakeDb();
        var card = AddCard(db, Guid.NewGuid(), "Private Card");

        var result = await Handler(db, Guid.NewGuid()).Handle(new CreateTransactionCaptureCommand(Request(card.Id), TransactionCaptureSource.IosShortcut), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Empty(db.CaptureItems);
    }

    [Fact]
    public async Task Same_Source_Reference_Is_Idempotent()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var card = AddCard(db, userId, "Richart GoGo");
        var handler = Handler(db, userId);

        var first = await handler.Handle(new CreateTransactionCaptureCommand(Request(card.Id), TransactionCaptureSource.IosShortcut), CancellationToken.None);
        var second = await handler.Handle(new CreateTransactionCaptureCommand(Request(card.Id), TransactionCaptureSource.IosShortcut), CancellationToken.None);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Single(db.CaptureItems);
        Assert.Equal(first.Value.Id, second.Value.Id);
    }

    [Fact]
    public async Task Owner_Can_Dismiss_Capture()
    {
        var userId = Guid.NewGuid();
        var db = new FakeDb();
        var card = AddCard(db, userId, "Richart GoGo");
        var handler = Handler(db, userId);
        var created = await handler.Handle(new CreateTransactionCaptureCommand(Request(card.Id), TransactionCaptureSource.IosShortcut), CancellationToken.None);

        var result = await handler.Handle(new DismissTransactionCaptureCommand(created.Value.Id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(TransactionCaptureStatus.Dismissed, result.Value.Status);
        Assert.Empty(db.TransactionItems);
        Assert.Empty(db.EntryItems);
    }

    [Fact]
    public async Task User_Cannot_Dismiss_Another_Users_Capture()
    {
        var ownerId = Guid.NewGuid();
        var db = new FakeDb();
        var card = AddCard(db, ownerId, "Richart GoGo");
        var created = await Handler(db, ownerId).Handle(new CreateTransactionCaptureCommand(Request(card.Id), TransactionCaptureSource.IosShortcut), CancellationToken.None);

        var result = await Handler(db, Guid.NewGuid()).Handle(new DismissTransactionCaptureCommand(created.Value.Id), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(TransactionCaptureStatus.Pending, db.CaptureItems[0].Status);
    }

    private static TransactionCaptureRequest Request(Guid cardId) => new(15960m, "TWD", Now, "BIGBANG", null,
        PaymentInstrumentType.CreditCard, cardId, "shortcut-uuid", null);
    private static TransactionCapturesHandler Handler(FakeDb db, Guid userId) => new(db, new CurrentUser(userId), new Clock());
    private static Account AddCard(FakeDb db, Guid userId, string name)
    {
        var account = Account.Create(userId, name, AccountType.CreditCard, "TWD", "Bank", 0, Now);
        db.AccountItems.Add(account);
        db.CardItems.Add(CreditCardAccount.Create(userId, account.Id, "Bank", name, null, 100000m, 17, 3, null, Now));
        return account;
    }
    private static decimal cardBalance(FakeDb db, Guid accountId) => db.EntryItems.Where(entry => entry.AccountId == accountId).Sum(entry => entry.Amount);
    private sealed class CurrentUser(Guid id) : ICurrentUser { public Guid UserId { get; } = id; public bool IsAuthenticated => true; }
    private sealed class Clock : IDateTimeProvider { public DateTimeOffset UtcNow => Now; }

    private sealed class FakeDb : IApplicationDbContext
    {
        public List<Account> AccountItems { get; } = [];
        public List<CreditCardAccount> CardItems { get; } = [];
        public List<TransactionCapture> CaptureItems { get; } = [];
        public List<CaptureApiToken> TokenItems { get; } = [];
        public List<Transaction> TransactionItems { get; } = [];
        public List<TransactionEntry> EntryItems { get; } = [];
        public IQueryable<User> Users => Array.Empty<User>().AsQueryable();
        public IQueryable<RefreshToken> RefreshTokens => Array.Empty<RefreshToken>().AsQueryable();
        public IQueryable<Account> Accounts => AccountItems.AsQueryable();
        public IQueryable<Category> Categories => Array.Empty<Category>().AsQueryable();
        public IQueryable<CreditCardAccount> CreditCardAccounts => CardItems.AsQueryable();
        public IQueryable<FinancialEvent> FinancialEvents => Array.Empty<FinancialEvent>().AsQueryable();
        public IQueryable<FinancialEventChecklistItem> FinancialEventChecklistItems => Array.Empty<FinancialEventChecklistItem>().AsQueryable();
        public IQueryable<FinancialEventActivity> FinancialEventActivities => Array.Empty<FinancialEventActivity>().AsQueryable();
        public IQueryable<FinancialEventCaptureLink> FinancialEventCaptureLinks => Array.Empty<FinancialEventCaptureLink>().AsQueryable();
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
        public IQueryable<CaptureApiToken> CaptureApiTokens => TokenItems.AsQueryable();
        public IQueryable<UserSetting> UserSettings => Array.Empty<UserSetting>().AsQueryable();
        public void AddUser(User user) { }
        public void AddRefreshToken(RefreshToken refreshToken) { }
        public void AddAccount(Account account) => AccountItems.Add(account);
        public void AddCategory(Category category) { }
        public void AddCreditCardAccount(CreditCardAccount creditCardAccount) => CardItems.Add(creditCardAccount);
        public void AddFinancialEvent(FinancialEvent financialEvent) { }
        public void AddFinancialEventChecklistItem(FinancialEventChecklistItem item) { }
        public void AddFinancialEventActivity(FinancialEventActivity activity) { }
        public void AddFinancialEventCaptureLink(FinancialEventCaptureLink link) { }
        public void AddCreditCardTransactionMetadata(CreditCardTransactionMetadata metadata) { }
        public void AddInstallmentPlan(InstallmentPlan installmentPlan) { }
        public void AddStatementImportBatch(StatementImportBatch batch) { }
        public void AddStatementImportRows(IEnumerable<StatementImportRow> rows) { }
        public void AddRecurringTransactionTemplate(RecurringTransactionTemplate template) { }
        public void AddRecurringTransactionOccurrence(RecurringTransactionOccurrence occurrence) { }
        public void AddTransaction(Transaction transaction) => TransactionItems.Add(transaction);
        public void AddTransactionEntries(IEnumerable<TransactionEntry> entries) => EntryItems.AddRange(entries);
        public void AddTransactionCapture(TransactionCapture capture) => CaptureItems.Add(capture);
        public void AddCaptureApiToken(CaptureApiToken token) => TokenItems.Add(token);
        public void AddUserSetting(UserSetting userSetting) { }
        public void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries) { }
        public void RemoveFinancialEventCaptureLink(FinancialEventCaptureLink link) { }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken) => Task.FromResult(1);
        public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken) => operation(cancellationToken);
    }
}
