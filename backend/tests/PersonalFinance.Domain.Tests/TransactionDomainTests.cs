using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Domain.Tests;

public sealed class TransactionDomainTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid AccountId = Guid.NewGuid();
    private static readonly Guid CategoryId = Guid.NewGuid();
    private static readonly DateOnly Date = new(2026, 7, 18);
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void CreateIncome_Adds_Positive_Entry()
    {
        var transaction = Transaction.CreateIncome(UserId, AccountId, CategoryId, 30000m, Date, "Company", "Salary", Now);

        var entry = Assert.Single(transaction.Entries);
        Assert.Equal(TransactionType.Income, transaction.Type);
        Assert.Equal(TransactionStatus.Posted, transaction.Status);
        Assert.Equal(30000m, entry.Amount);
        Assert.Equal(CategoryId, transaction.CategoryId);
    }

    [Fact]
    public void CreateIncome_Rejects_Non_Positive_Amount()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Transaction.CreateIncome(UserId, AccountId, CategoryId, 0m, Date, null, null, Now));
    }

    [Fact]
    public void CreateExpense_Uses_Negative_Entry_For_Asset_Account()
    {
        var transaction = Transaction.CreateExpense(UserId, AccountId, AccountType.Cash, CategoryId, 500m, Date, "Store", null, Now);

        var entry = Assert.Single(transaction.Entries);
        Assert.Equal(TransactionType.Expense, transaction.Type);
        Assert.Equal(-500m, entry.Amount);
    }

    [Fact]
    public void CreateExpense_Uses_Positive_Entry_For_CreditCard_Account()
    {
        var transaction = Transaction.CreateExpense(UserId, AccountId, AccountType.CreditCard, CategoryId, 1000m, Date, "Store", null, Now);

        var entry = Assert.Single(transaction.Entries);
        Assert.Equal(1000m, entry.Amount);
    }

    [Fact]
    public void CreateTransfer_Adds_Balanced_Entries()
    {
        var from = Guid.NewGuid();
        var to = Guid.NewGuid();
        var transaction = Transaction.CreateTransfer(UserId, from, to, 2000m, Date, "ATM", Now);

        Assert.Equal(TransactionType.Transfer, transaction.Type);
        Assert.Null(transaction.CategoryId);
        Assert.Equal(2, transaction.Entries.Count);
        Assert.Equal(0m, transaction.Entries.Sum(entry => entry.Amount));
        Assert.Contains(transaction.Entries, entry => entry.AccountId == from && entry.Amount == -2000m);
        Assert.Contains(transaction.Entries, entry => entry.AccountId == to && entry.Amount == 2000m);
    }

    [Fact]
    public void CreateTransfer_Rejects_Same_Account()
    {
        Assert.Throws<ArgumentException>(() => Transaction.CreateTransfer(UserId, AccountId, AccountId, 2000m, Date, null, Now));
    }

    [Fact]
    public void CreateOpeningBalance_Allows_Positive_Or_Negative_But_Not_Zero()
    {
        var positive = Transaction.CreateOpeningBalance(UserId, AccountId, 20932m, Date, null, Now);
        var negative = Transaction.CreateOpeningBalance(UserId, Guid.NewGuid(), -1200m, Date, null, Now);

        Assert.Equal(TransactionType.OpeningBalance, positive.Type);
        Assert.Equal(20932m, Assert.Single(positive.Entries).Amount);
        Assert.Equal(-1200m, Assert.Single(negative.Entries).Amount);
        Assert.Throws<ArgumentException>(() => Transaction.CreateOpeningBalance(UserId, Guid.NewGuid(), 0m, Date, null, Now));
    }

    [Fact]
    public void Void_Changes_Status_And_Prevents_Update()
    {
        var transaction = Transaction.CreateExpense(UserId, AccountId, AccountType.Cash, CategoryId, 500m, Date, null, null, Now);

        transaction.Void(Now.AddMinutes(1));

        Assert.Equal(TransactionStatus.Voided, transaction.Status);
        Assert.NotNull(transaction.VoidedAtUtc);
        Assert.Throws<InvalidOperationException>(() => transaction.UpdateExpense(AccountId, AccountType.Cash, CategoryId, 700m, Date, null, null, Now.AddMinutes(2)));
    }
}
