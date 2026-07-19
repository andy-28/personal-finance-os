using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Domain.Tests;

public sealed class CreditCardDomainTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid CreditCardAccountId = Guid.NewGuid();
    private static readonly Guid PaymentAccountId = Guid.NewGuid();
    private static readonly Guid CategoryId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void CreditCard_Purchase_Increases_Liability_Balance()
    {
        var transaction = Transaction.CreateCreditCardPurchase(UserId, CreditCardAccountId, CategoryId, 10000m, new DateOnly(2026, 7, 18), "Store", null, Now);

        var entry = Assert.Single(transaction.Entries);
        Assert.Equal(TransactionType.CreditCardPurchase, transaction.Type);
        Assert.Equal(10000m, entry.Amount);
    }

    [Fact]
    public void CreditCard_Refund_Decreases_Liability_Balance()
    {
        var transaction = Transaction.CreateCreditCardRefund(UserId, CreditCardAccountId, 1000m, new DateOnly(2026, 7, 19), "Refund", Now);

        var entry = Assert.Single(transaction.Entries);
        Assert.Equal(TransactionType.CreditCardRefund, transaction.Type);
        Assert.Equal(-1000m, entry.Amount);
    }

    [Fact]
    public void CreditCard_Payment_Decreases_Bank_And_Card_Balances()
    {
        var transaction = Transaction.CreateCreditCardPayment(UserId, PaymentAccountId, CreditCardAccountId, 5000m, new DateOnly(2026, 7, 20), "Payment", Now);

        Assert.Equal(TransactionType.CreditCardPayment, transaction.Type);
        Assert.Contains(transaction.Entries, entry => entry.AccountId == PaymentAccountId && entry.Amount == -5000m);
        Assert.Contains(transaction.Entries, entry => entry.AccountId == CreditCardAccountId && entry.Amount == -5000m);
    }

    [Fact]
    public void Installment_Plan_Splits_Remainder_To_Last_Item()
    {
        var plan = InstallmentPlan.Create(UserId, CreditCardAccountId, "Merchant", "Laptop", new DateOnly(2026, 7, 18), 10000m, 3, new DateOnly(2026, 8, 2), Now);

        var items = plan.ScheduleItems.OrderBy(item => item.InstallmentNumber).ToArray();
        Assert.Equal(3, items.Length);
        Assert.Equal(3333.33m, items[0].Amount);
        Assert.Equal(3333.33m, items[1].Amount);
        Assert.Equal(3333.34m, items[2].Amount);
        Assert.Equal(10000m, items.Sum(item => item.Amount));
    }

    [Fact]
    public void Installment_Item_Cannot_Be_Posted_Twice()
    {
        var plan = InstallmentPlan.Create(UserId, CreditCardAccountId, "Merchant", null, new DateOnly(2026, 7, 18), 10000m, 3, new DateOnly(2026, 8, 2), Now);
        var item = plan.ScheduleItems.First();

        item.MarkPosted(Guid.NewGuid());

        Assert.Equal(InstallmentScheduleItemStatus.Posted, item.Status);
        Assert.Throws<InvalidOperationException>(() => item.MarkPosted(Guid.NewGuid()));
    }

    [Fact]
    public void Installment_Plan_Status_Completes_When_All_Items_Posted()
    {
        var plan = InstallmentPlan.Create(UserId, CreditCardAccountId, "Merchant", null, new DateOnly(2026, 7, 18), 10000m, 2, new DateOnly(2026, 8, 2), Now);
        var items = plan.ScheduleItems.ToArray();

        items[0].MarkPosted(Guid.NewGuid());
        plan.RefreshStatus(items, Now);
        Assert.Equal(InstallmentPlanStatus.Active, plan.Status);

        items[1].MarkPosted(Guid.NewGuid());
        plan.RefreshStatus(items, Now);
        Assert.Equal(InstallmentPlanStatus.Completed, plan.Status);
    }
}
