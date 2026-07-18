using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Infrastructure.Persistence;

public sealed class PersonalFinanceDbContext : DbContext, IApplicationDbContext
{
    public PersonalFinanceDbContext(DbContextOptions<PersonalFinanceDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionEntry> TransactionEntries => Set<TransactionEntry>();

    IQueryable<User> IApplicationDbContext.Users => Users;
    IQueryable<RefreshToken> IApplicationDbContext.RefreshTokens => RefreshTokens;
    IQueryable<Account> IApplicationDbContext.Accounts => Accounts;
    IQueryable<Category> IApplicationDbContext.Categories => Categories;
    IQueryable<Transaction> IApplicationDbContext.Transactions => Transactions;
    IQueryable<TransactionEntry> IApplicationDbContext.TransactionEntries => TransactionEntries;

    public void AddUser(User user) => Users.Add(user);
    public void AddRefreshToken(RefreshToken refreshToken) => RefreshTokens.Add(refreshToken);
    public void AddAccount(Account account) => Accounts.Add(account);
    public void AddCategory(Category category) => Categories.Add(category);
    public void AddTransaction(Transaction transaction) => Transactions.Add(transaction);
    public void AddTransactionEntries(IEnumerable<TransactionEntry> entries) => TransactionEntries.AddRange(entries);
    public void RemoveTransactionEntries(IEnumerable<TransactionEntry> entries) => TransactionEntries.RemoveRange(entries);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken)
    {
        if (Database.CurrentTransaction is not null)
        {
            await operation(cancellationToken);
            return;
        }

        await using IDbContextTransaction transaction = await Database.BeginTransactionAsync(cancellationToken);
        await operation(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PersonalFinanceDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}

