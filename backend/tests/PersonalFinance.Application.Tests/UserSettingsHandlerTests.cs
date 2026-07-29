using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.UserSettings;
using PersonalFinance.Application.UserSettings.Models;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.StatementImports;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Users;
using PersonalFinance.Domain.UserSettings;

namespace PersonalFinance.Application.Tests;

public sealed class UserSettingsHandlerTests
{
    [Fact]
    public async Task Patch_Goal_Settings_Persists_Goal_Bars()
    {
        var userId = Guid.NewGuid();
        var account = Account.Create(userId, "Richart", AccountType.Checking, "TWD", "Richart", 0, TestClock.Now);
        var db = new FakeApplicationDbContext();
        db.AccountItems.Add(account);
        var handler = new UserSettingsHandler(db, new TestCurrentUser(userId), new TestClock());
        var goal = new UserGoalBarDto(Guid.NewGuid().ToString("N"), account.Id, "Emergency Fund", 100000m, "cyan");

        var result = await handler.Handle(new PatchUserSettingsCommand(new UserSettingsPatchRequest(
            null,
            null,
            null,
            new UserGoalSettingsDto([goal], [], false, "compact"))), CancellationToken.None);
        var reloaded = await handler.Handle(new GetUserSettingsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(reloaded.IsSuccess);
        var savedGoal = Assert.Single(reloaded.Value.GoalSettings.GoalBars);
        Assert.Equal(account.Id, savedGoal.AccountId);
        Assert.Equal("Emergency Fund", savedGoal.Title);
        Assert.Equal(100000m, savedGoal.TargetAmount);
        Assert.Equal("cyan", savedGoal.Color);
    }

    [Fact]
    public async Task Patch_Goal_Settings_Rejects_Account_From_Another_User()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var otherAccount = Account.Create(otherUserId, "Other Wallet", AccountType.Cash, "TWD", null, 0, TestClock.Now);
        var db = new FakeApplicationDbContext();
        db.AccountItems.Add(otherAccount);
        var handler = new UserSettingsHandler(db, new TestCurrentUser(userId), new TestClock());
        var goal = new UserGoalBarDto(Guid.NewGuid().ToString("N"), otherAccount.Id, "Cross User", 50000m, "emerald");

        var result = await handler.Handle(new PatchUserSettingsCommand(new UserSettingsPatchRequest(
            null,
            null,
            null,
            new UserGoalSettingsDto([goal], [], false, "compact"))), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains(result.Errors, error => error.Code == "GoalSettings.AccountId");
    }

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid UserId { get; } = userId;
        public bool IsAuthenticated => true;
    }

    private sealed class TestClock : IDateTimeProvider
    {
        public static readonly DateTimeOffset Now = new(2026, 7, 28, 8, 0, 0, TimeSpan.Zero);
        public DateTimeOffset UtcNow => Now;
    }

    private sealed class FakeApplicationDbContext : IApplicationDbContext
    {
        public List<Account> AccountItems { get; } = [];
        public List<UserSetting> UserSettingItems { get; } = [];

        public IQueryable<User> Users => Enumerable.Empty<User>().AsQueryable();
        public IQueryable<RefreshToken> RefreshTokens => Enumerable.Empty<RefreshToken>().AsQueryable();
        public IQueryable<Account> Accounts => AccountItems.AsQueryable();
        public IQueryable<Category> Categories => Enumerable.Empty<Category>().AsQueryable();
        public IQueryable<CreditCardAccount> CreditCardAccounts => Enumerable.Empty<CreditCardAccount>().AsQueryable();
        public IQueryable<CreditCardTransactionMetadata> CreditCardTransactionMetadata => Enumerable.Empty<CreditCardTransactionMetadata>().AsQueryable();
        public IQueryable<InstallmentPlan> InstallmentPlans => Enumerable.Empty<InstallmentPlan>().AsQueryable();
        public IQueryable<InstallmentScheduleItem> InstallmentScheduleItems => Enumerable.Empty<InstallmentScheduleItem>().AsQueryable();
        public IQueryable<StatementImportBatch> StatementImportBatches => Enumerable.Empty<StatementImportBatch>().AsQueryable();
        public IQueryable<StatementImportRow> StatementImportRows => Enumerable.Empty<StatementImportRow>().AsQueryable();
        public IQueryable<RecurringTransactionTemplate> RecurringTransactionTemplates => Enumerable.Empty<RecurringTransactionTemplate>().AsQueryable();
        public IQueryable<RecurringTransactionOccurrence> RecurringTransactionOccurrences => Enumerable.Empty<RecurringTransactionOccurrence>().AsQueryable();
        public IQueryable<Transaction> Transactions => Enumerable.Empty<Transaction>().AsQueryable();
        public IQueryable<TransactionEntry> TransactionEntries => Enumerable.Empty<TransactionEntry>().AsQueryable();
        public IQueryable<UserSetting> UserSettings => UserSettingItems.AsQueryable();

        public void AddUser(User user) { }
        public void AddRefreshToken(RefreshToken refreshToken) { }
        public void AddAccount(Account account) => AccountItems.Add(account);
        public void AddCategory(Category category) { }
        public void AddCreditCardAccount(CreditCardAccount creditCardAccount) { }
        public void AddCreditCardTransactionMetadata(CreditCardTransactionMetadata metadata) { }
        public void AddInstallmentPlan(InstallmentPlan installmentPlan) { }
        public void AddStatementImportBatch(StatementImportBatch batch) { }
        public void AddStatementImportRows(IEnumerable<StatementImportRow> rows) { }
        public void AddRecurringTransactionTemplate(RecurringTransactionTemplate template) { }
        public void AddRecurringTransactionOccurrence(RecurringTransactionOccurrence occurrence) { }
        public void AddTransaction(Transaction transaction) { }
        public void AddTransactionEntries(IEnumerable<TransactionEntry> entries) { }
        public void AddUserSetting(UserSetting userSetting) => UserSettingItems.Add(userSetting);
        public void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries) { }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken) => Task.FromResult(1);
        public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken) => operation(cancellationToken);
    }
}
