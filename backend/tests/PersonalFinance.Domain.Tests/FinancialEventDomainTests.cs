using PersonalFinance.Domain.FinancialEvents;

namespace PersonalFinance.Domain.Tests;

public sealed class FinancialEventDomainTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 17, 8, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(FinancialEventKind.ConfirmedExpense, FinancialEventStatus.Confirmed)]
    [InlineData(FinancialEventKind.ConditionalExpense, FinancialEventStatus.Pending)]
    [InlineData(FinancialEventKind.PlannedExpense, FinancialEventStatus.Planned)]
    public void Create_Uses_NonLedger_Status_Model(FinancialEventKind kind, FinancialEventStatus expectedStatus)
    {
        var item = FinancialEvent.Create(Guid.NewGuid(), "BIGBANG", kind, 15960m, "TWD", new DateOnly(2026, 9, 17),
            kind == FinancialEventKind.ConditionalExpense ? new DateOnly(2026, 9, 22) : null, null, null, null, Now);

        Assert.Equal(expectedStatus, item.Status);
        Assert.Equal(15960m, item.Amount);
    }

    [Fact]
    public void Conditional_Event_Requires_Result_Date()
    {
        Assert.Throws<ArgumentException>(() => FinancialEvent.Create(Guid.NewGuid(), "YOASOBI", FinancialEventKind.ConditionalExpense,
            12000m, "TWD", new DateOnly(2026, 9, 22), null, null, null, null, Now));
    }
}
