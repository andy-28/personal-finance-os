using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.StatementImports;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Users;
using PersonalFinance.Domain.UserSettings;

namespace PersonalFinance.Application.Abstractions.Persistence;

public interface IApplicationDbContext
{
    IQueryable<User> Users { get; }
    IQueryable<RefreshToken> RefreshTokens { get; }
    IQueryable<Account> Accounts { get; }
    IQueryable<Category> Categories { get; }
    IQueryable<CreditCardAccount> CreditCardAccounts { get; }
    IQueryable<CreditCardTransactionMetadata> CreditCardTransactionMetadata { get; }
    IQueryable<InstallmentPlan> InstallmentPlans { get; }
    IQueryable<InstallmentScheduleItem> InstallmentScheduleItems { get; }
    IQueryable<StatementImportBatch> StatementImportBatches { get; }
    IQueryable<StatementImportRow> StatementImportRows { get; }
    IQueryable<RecurringTransactionTemplate> RecurringTransactionTemplates { get; }
    IQueryable<RecurringTransactionOccurrence> RecurringTransactionOccurrences { get; }
    IQueryable<Transaction> Transactions { get; }
    IQueryable<TransactionEntry> TransactionEntries { get; }
    IQueryable<UserSetting> UserSettings { get; }

    void AddUser(User user);
    void AddRefreshToken(RefreshToken refreshToken);
    void AddAccount(Account account);
    void AddCategory(Category category);
    void AddCreditCardAccount(CreditCardAccount creditCardAccount);
    void AddCreditCardTransactionMetadata(CreditCardTransactionMetadata metadata);
    void AddInstallmentPlan(InstallmentPlan installmentPlan);
    void AddStatementImportBatch(StatementImportBatch batch);
    void AddStatementImportRows(IEnumerable<StatementImportRow> rows);
    void AddRecurringTransactionTemplate(RecurringTransactionTemplate template);
    void AddRecurringTransactionOccurrence(RecurringTransactionOccurrence occurrence);
    void AddTransaction(Transaction transaction);
    void AddTransactionEntries(IEnumerable<TransactionEntry> entries);
    void AddUserSetting(UserSetting userSetting);
    void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken);
}
