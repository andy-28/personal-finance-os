using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinance.Api.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.TransactionCaptures;
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

namespace PersonalFinance.IntegrationTests;

public sealed class CaptureTokenAuthenticationTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 18, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Active_Capture_Token_Authenticates_With_Capture_Scope()
    {
        var plaintext = CaptureTokenSecret.Create();
        var db = new FakeDb();
        db.Tokens.Add(CaptureApiToken.Create(Guid.NewGuid(), "iPhone", CaptureTokenSecret.Hash(plaintext), Now));

        var result = await Authenticate(db, plaintext);

        Assert.True(result.Succeeded);
        Assert.True(result.Principal!.HasClaim(CaptureTokenAuthenticationDefaults.ScopeClaim, CaptureTokenAuthenticationDefaults.CaptureScope));
        Assert.Equal(Now, db.Tokens[0].LastUsedAtUtc);
    }

    [Fact]
    public async Task Revoked_Capture_Token_Is_Rejected()
    {
        var plaintext = CaptureTokenSecret.Create();
        var db = new FakeDb();
        var token = CaptureApiToken.Create(Guid.NewGuid(), "Old iPhone", CaptureTokenSecret.Hash(plaintext), Now.AddDays(-1));
        token.Revoke(Now);
        db.Tokens.Add(token);

        var result = await Authenticate(db, plaintext);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Failure);
    }

    private static async Task<AuthenticateResult> Authenticate(FakeDb db, string plaintext)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IApplicationDbContext>(db);
        services.AddSingleton<IDateTimeProvider>(new Clock());
        services.AddAuthentication().AddScheme<AuthenticationSchemeOptions, CaptureTokenAuthenticationHandler>(CaptureTokenAuthenticationDefaults.Scheme, _ => { });
        await using var provider = services.BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Headers.Authorization = $"Bearer {plaintext}";
        var handlers = provider.GetRequiredService<IAuthenticationHandlerProvider>();
        var handler = await handlers.GetHandlerAsync(context, CaptureTokenAuthenticationDefaults.Scheme);
        return await handler!.AuthenticateAsync();
    }

    private sealed class Clock : IDateTimeProvider { public DateTimeOffset UtcNow => Now; }
    private sealed class FakeDb : IApplicationDbContext
    {
        public List<CaptureApiToken> Tokens { get; } = [];
        public IQueryable<User> Users => Empty<User>();
        public IQueryable<RefreshToken> RefreshTokens => Empty<RefreshToken>();
        public IQueryable<Account> Accounts => Empty<Account>();
        public IQueryable<Category> Categories => Empty<Category>();
        public IQueryable<CreditCardAccount> CreditCardAccounts => Empty<CreditCardAccount>();
        public IQueryable<FinancialEvent> FinancialEvents => Empty<FinancialEvent>();
        public IQueryable<FinancialEventChecklistItem> FinancialEventChecklistItems => Empty<FinancialEventChecklistItem>();
        public IQueryable<FinancialEventActivity> FinancialEventActivities => Empty<FinancialEventActivity>();
        public IQueryable<FinancialEventCaptureLink> FinancialEventCaptureLinks => Empty<FinancialEventCaptureLink>();
        public IQueryable<CreditCardTransactionMetadata> CreditCardTransactionMetadata => Empty<CreditCardTransactionMetadata>();
        public IQueryable<InstallmentPlan> InstallmentPlans => Empty<InstallmentPlan>();
        public IQueryable<InstallmentScheduleItem> InstallmentScheduleItems => Empty<InstallmentScheduleItem>();
        public IQueryable<StatementImportBatch> StatementImportBatches => Empty<StatementImportBatch>();
        public IQueryable<StatementImportRow> StatementImportRows => Empty<StatementImportRow>();
        public IQueryable<RecurringTransactionTemplate> RecurringTransactionTemplates => Empty<RecurringTransactionTemplate>();
        public IQueryable<RecurringTransactionOccurrence> RecurringTransactionOccurrences => Empty<RecurringTransactionOccurrence>();
        public IQueryable<Transaction> Transactions => Empty<Transaction>();
        public IQueryable<TransactionEntry> TransactionEntries => Empty<TransactionEntry>();
        public IQueryable<TransactionCapture> TransactionCaptures => Empty<TransactionCapture>();
        public IQueryable<CaptureApiToken> CaptureApiTokens => Tokens.AsQueryable();
        public IQueryable<UserSetting> UserSettings => Empty<UserSetting>();
        public void AddUser(User user) { }
        public void AddRefreshToken(RefreshToken refreshToken) { }
        public void AddAccount(Account account) { }
        public void AddCategory(Category category) { }
        public void AddCreditCardAccount(CreditCardAccount creditCardAccount) { }
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
        public void AddTransaction(Transaction transaction) { }
        public void AddTransactionEntries(IEnumerable<TransactionEntry> entries) { }
        public void AddTransactionCapture(TransactionCapture capture) { }
        public void AddCaptureApiToken(CaptureApiToken token) => Tokens.Add(token);
        public void AddUserSetting(UserSetting userSetting) { }
        public void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries) { }
        public void RemoveFinancialEventCaptureLink(FinancialEventCaptureLink link) { }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken) => Task.FromResult(1);
        public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken) => operation(cancellationToken);
        private static IQueryable<T> Empty<T>() => Array.Empty<T>().AsQueryable();
    }
}
