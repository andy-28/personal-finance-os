using PersonalFinance.Application.FinancialOperations;
using PersonalFinance.Application.FinancialOperations.Models;

namespace PersonalFinance.Application.Tests;

public sealed class CashFlowProjectorTests
{
    private static readonly DateOnly Today = new(2026, 9, 17);

    [Fact]
    public void Projection_Applies_Outflow_And_Income_On_CashFlow_Date()
    {
        var result = CashFlowProjector.Project(Today, 45, "TWD", 30000m,
        [
            Item("card", new DateOnly(2026, 10, 3), -20000m),
            Item("salary", new DateOnly(2026, 10, 25), 36000m)
        ], 0);

        Assert.Equal(10000m, result.ProjectedLowestLiquidity);
        Assert.Equal(new DateOnly(2026, 10, 3), result.ProjectedLowestLiquidityDate);
        Assert.Equal(36000m, result.NextExpectedIncome);
        Assert.Equal(new DateOnly(2026, 10, 25), result.NextExpectedIncomeDate);
    }

    [Fact]
    public void Conditional_Expense_Is_Excluded_From_Baseline_And_Included_In_Scenario()
    {
        var result = CashFlowProjector.Project(Today, 45, "TWD", 30000m,
        [
            Item("confirmed", new DateOnly(2026, 10, 3), -10000m),
            Item("conditional", new DateOnly(2026, 10, 8), -12000m, true)
        ], 1);

        Assert.Equal(20000m, result.ProjectedLowestLiquidity);
        Assert.Equal(8000m, result.ConditionalLowestLiquidity);
        Assert.Equal(12000m, result.ConditionalExposure);
    }

    [Fact]
    public void Projection_Detects_Liquidity_Gap_Until_Next_Income()
    {
        var result = CashFlowProjector.Project(Today, 45, "TWD", 10000m,
        [
            Item("outflow", new DateOnly(2026, 10, 22), -18000m),
            Item("salary", new DateOnly(2026, 10, 25), 36000m)
        ], 0);

        var gap = Assert.Single(result.Gaps);
        Assert.Equal(new DateOnly(2026, 10, 22), gap.StartDate);
        Assert.Equal(new DateOnly(2026, 10, 25), gap.EndDate);
        Assert.Equal(-8000m, gap.LowestLiquidity);
    }

    private static CashFlowItemDto Item(string id, DateOnly date, decimal amount, bool conditional = false) =>
        new(id, "Test", "Test", "Test", id, date, date, amount, "TWD", conditional, null, null, null, null);
}
