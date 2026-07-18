using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Application.Abstractions.Persistence;

public interface IApplicationDbContext
{
    IQueryable<User> Users { get; }
    IQueryable<RefreshToken> RefreshTokens { get; }
    IQueryable<Account> Accounts { get; }
    IQueryable<Category> Categories { get; }
    IQueryable<Transaction> Transactions { get; }
    IQueryable<TransactionEntry> TransactionEntries { get; }

    void AddUser(User user);
    void AddRefreshToken(RefreshToken refreshToken);
    void AddAccount(Account account);
    void AddCategory(Category category);
    void AddTransaction(Transaction transaction);
    void AddTransactionEntries(IEnumerable<TransactionEntry> entries);
    void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken);
}

