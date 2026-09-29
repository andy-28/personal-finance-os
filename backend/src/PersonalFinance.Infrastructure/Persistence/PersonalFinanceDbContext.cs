using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;
using PersonalFinance.Application.Abstractions.Persistence;
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

namespace PersonalFinance.Infrastructure.Persistence;

public sealed class PersonalFinanceDbContext : DbContext, IApplicationDbContext
{
    public PersonalFinanceDbContext(DbContextOptions<PersonalFinanceDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<CreditCardAccount> CreditCardAccounts => Set<CreditCardAccount>();
    public DbSet<FinancialEvent> FinancialEvents => Set<FinancialEvent>();
    public DbSet<FinancialEventChecklistItem> FinancialEventChecklistItems => Set<FinancialEventChecklistItem>();
    public DbSet<FinancialEventActivity> FinancialEventActivities => Set<FinancialEventActivity>();
    public DbSet<FinancialEventCaptureLink> FinancialEventCaptureLinks => Set<FinancialEventCaptureLink>();
    public DbSet<CreditCardTransactionMetadata> CreditCardTransactionMetadata => Set<CreditCardTransactionMetadata>();
    public DbSet<InstallmentPlan> InstallmentPlans => Set<InstallmentPlan>();
    public DbSet<InstallmentScheduleItem> InstallmentScheduleItems => Set<InstallmentScheduleItem>();
    public DbSet<StatementImportBatch> StatementImportBatches => Set<StatementImportBatch>();
    public DbSet<StatementImportRow> StatementImportRows => Set<StatementImportRow>();
    public DbSet<RecurringTransactionTemplate> RecurringTransactionTemplates => Set<RecurringTransactionTemplate>();
    public DbSet<RecurringTransactionOccurrence> RecurringTransactionOccurrences => Set<RecurringTransactionOccurrence>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionEntry> TransactionEntries => Set<TransactionEntry>();
    public DbSet<TransactionCapture> TransactionCaptures => Set<TransactionCapture>();
    public DbSet<CaptureApiToken> CaptureApiTokens => Set<CaptureApiToken>();
    public DbSet<UserSetting> UserSettings => Set<UserSetting>();

    IQueryable<User> IApplicationDbContext.Users => Users;
    IQueryable<RefreshToken> IApplicationDbContext.RefreshTokens => RefreshTokens;
    IQueryable<Account> IApplicationDbContext.Accounts => Accounts;
    IQueryable<Category> IApplicationDbContext.Categories => Categories;
    IQueryable<CreditCardAccount> IApplicationDbContext.CreditCardAccounts => CreditCardAccounts;
    IQueryable<FinancialEvent> IApplicationDbContext.FinancialEvents => FinancialEvents;
    IQueryable<FinancialEventChecklistItem> IApplicationDbContext.FinancialEventChecklistItems => FinancialEventChecklistItems;
    IQueryable<FinancialEventActivity> IApplicationDbContext.FinancialEventActivities => FinancialEventActivities;
    IQueryable<FinancialEventCaptureLink> IApplicationDbContext.FinancialEventCaptureLinks => FinancialEventCaptureLinks;
    IQueryable<CreditCardTransactionMetadata> IApplicationDbContext.CreditCardTransactionMetadata => CreditCardTransactionMetadata;
    IQueryable<InstallmentPlan> IApplicationDbContext.InstallmentPlans => InstallmentPlans;
    IQueryable<InstallmentScheduleItem> IApplicationDbContext.InstallmentScheduleItems => InstallmentScheduleItems;
    IQueryable<StatementImportBatch> IApplicationDbContext.StatementImportBatches => StatementImportBatches;
    IQueryable<StatementImportRow> IApplicationDbContext.StatementImportRows => StatementImportRows;
    IQueryable<RecurringTransactionTemplate> IApplicationDbContext.RecurringTransactionTemplates => RecurringTransactionTemplates;
    IQueryable<RecurringTransactionOccurrence> IApplicationDbContext.RecurringTransactionOccurrences => RecurringTransactionOccurrences;
    IQueryable<Transaction> IApplicationDbContext.Transactions => Transactions;
    IQueryable<TransactionEntry> IApplicationDbContext.TransactionEntries => TransactionEntries;
    IQueryable<TransactionCapture> IApplicationDbContext.TransactionCaptures => TransactionCaptures;
    IQueryable<CaptureApiToken> IApplicationDbContext.CaptureApiTokens => CaptureApiTokens;
    IQueryable<UserSetting> IApplicationDbContext.UserSettings => UserSettings;

    public void AddUser(User user) => Users.Add(user);
    public void AddRefreshToken(RefreshToken refreshToken) => RefreshTokens.Add(refreshToken);
    public void AddAccount(Account account) => Accounts.Add(account);
    public void AddCategory(Category category) => Categories.Add(category);
    public void AddCreditCardAccount(CreditCardAccount creditCardAccount) => CreditCardAccounts.Add(creditCardAccount);
    public void AddFinancialEvent(FinancialEvent financialEvent) => FinancialEvents.Add(financialEvent);
    public void AddFinancialEventChecklistItem(FinancialEventChecklistItem item) => FinancialEventChecklistItems.Add(item);
    public void AddFinancialEventActivity(FinancialEventActivity activity) => FinancialEventActivities.Add(activity);
    public void AddFinancialEventCaptureLink(FinancialEventCaptureLink link) => FinancialEventCaptureLinks.Add(link);
    public void AddCreditCardTransactionMetadata(CreditCardTransactionMetadata metadata) => CreditCardTransactionMetadata.Add(metadata);
    public void AddInstallmentPlan(InstallmentPlan installmentPlan) => InstallmentPlans.Add(installmentPlan);
    public void AddStatementImportBatch(StatementImportBatch batch) => StatementImportBatches.Add(batch);
    public void AddStatementImportRows(IEnumerable<StatementImportRow> rows) => StatementImportRows.AddRange(rows);
    public void AddRecurringTransactionTemplate(RecurringTransactionTemplate template) => RecurringTransactionTemplates.Add(template);
    public void AddRecurringTransactionOccurrence(RecurringTransactionOccurrence occurrence) => RecurringTransactionOccurrences.Add(occurrence);
    public void AddTransaction(Transaction transaction) => Transactions.Add(transaction);
    public void AddTransactionEntries(IEnumerable<TransactionEntry> entries) => TransactionEntries.AddRange(entries);
    public void AddTransactionCapture(TransactionCapture capture) => TransactionCaptures.Add(capture);
    public void AddCaptureApiToken(CaptureApiToken token) => CaptureApiTokens.Add(token);
    public void AddUserSetting(UserSetting userSetting) => UserSettings.Add(userSetting);
    public void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries) => TransactionEntries.RemoveRange(entries);
    public void RemoveFinancialEventCaptureLink(FinancialEventCaptureLink link) => FinancialEventCaptureLinks.Remove(link);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken)
    {
        if (Database.CurrentTransaction is not null)
        {
            await operation(cancellationToken);
            return;
        }

        await using IDbContextTransaction transaction = await Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await operation(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PersonalFinanceDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
