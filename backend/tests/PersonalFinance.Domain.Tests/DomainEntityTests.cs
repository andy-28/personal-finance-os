using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;

namespace PersonalFinance.Domain.Tests;

public sealed class DomainEntityTests
{
    [Fact]
    public void Account_Create_Normalizes_Currency_And_Defaults_Archive_State()
    {
        var account = Account.Create(Guid.NewGuid(), " Wallet ", AccountType.Cash, "twd", null, 0, DateTimeOffset.UtcNow);
        Assert.Equal("Wallet", account.Name);
        Assert.Equal("TWD", account.CurrencyCode);
        Assert.False(account.IsArchived);
    }

    [Fact]
    public void Account_Create_Rejects_Invalid_Currency()
    {
        Assert.Throws<ArgumentException>(() => Account.Create(Guid.NewGuid(), "Wallet", AccountType.Cash, "TW", null, 0, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Account_Archive_And_Restore_Update_State()
    {
        var account = Account.Create(Guid.NewGuid(), "Wallet", AccountType.Cash, "TWD", null, 0, DateTimeOffset.UtcNow);
        account.Archive(DateTimeOffset.UtcNow);
        Assert.True(account.IsArchived);
        account.Restore(3, DateTimeOffset.UtcNow);
        Assert.False(account.IsArchived);
        Assert.Equal(3, account.DisplayOrder);
    }

    [Fact]
    public void Category_Create_Child_Assigns_Parent()
    {
        var parentId = Guid.NewGuid();
        var category = Category.Create(Guid.NewGuid(), "Cafe", CategoryType.Expense, parentId, "coffee", 0, DateTimeOffset.UtcNow);
        Assert.Equal(parentId, category.ParentCategoryId);
        Assert.Equal("CAFE", category.NormalizedName);
    }

    [Fact]
    public void Category_Cannot_Be_Its_Own_Parent()
    {
        var category = Category.Create(Guid.NewGuid(), "Food", CategoryType.Expense, null, null, 0, DateTimeOffset.UtcNow);
        Assert.Throws<InvalidOperationException>(() => category.Update("Food", CategoryType.Expense, category.Id, null, DateTimeOffset.UtcNow));
    }
}
