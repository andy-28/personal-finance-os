using PersonalFinance.Domain.CreditCards;

namespace PersonalFinance.Domain.Tests;

public sealed class StatementPeriodCalculatorTests
{
    [Fact]
    public void Calculates_General_Month_With_Same_Month_Due_Date()
    {
        var schedule = StatementPeriodCalculator.Calculate(new DateOnly(2026, 7, 18), 2, 20);

        Assert.Equal(new DateOnly(2026, 7, 3), schedule.CurrentStatementPeriod.StartDate);
        Assert.Equal(new DateOnly(2026, 8, 2), schedule.CurrentStatementPeriod.EndDate);
        Assert.Equal(new DateOnly(2026, 8, 2), schedule.NextClosingDate);
        Assert.Equal(new DateOnly(2026, 8, 20), schedule.NextPaymentDueDate);
    }

    [Fact]
    public void Due_Date_Earlier_Than_Closing_Day_Crosses_Month()
    {
        var due = StatementPeriodCalculator.PaymentDueDate(new DateOnly(2026, 6, 25), 25, 10);

        Assert.Equal(new DateOnly(2026, 7, 10), due);
    }

    [Fact]
    public void Closing_Day_31_Uses_Last_Day_For_Short_Month()
    {
        var schedule = StatementPeriodCalculator.Calculate(new DateOnly(2026, 4, 20), 31, 15);

        Assert.Equal(new DateOnly(2026, 4, 30), schedule.CurrentStatementPeriod.EndDate);
    }

    [Fact]
    public void February_Uses_28_Days_In_Common_Year()
    {
        var schedule = StatementPeriodCalculator.Calculate(new DateOnly(2026, 2, 10), 31, 15);

        Assert.Equal(new DateOnly(2026, 2, 28), schedule.CurrentStatementPeriod.EndDate);
    }

    [Fact]
    public void February_Uses_29_Days_In_Leap_Year()
    {
        var schedule = StatementPeriodCalculator.Calculate(new DateOnly(2028, 2, 10), 31, 15);

        Assert.Equal(new DateOnly(2028, 2, 29), schedule.CurrentStatementPeriod.EndDate);
    }
}
