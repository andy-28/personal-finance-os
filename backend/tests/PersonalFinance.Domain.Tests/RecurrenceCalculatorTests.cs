using PersonalFinance.Domain.Recurring;

namespace PersonalFinance.Domain.Tests;

public sealed class RecurrenceCalculatorTests
{
    [Fact]
    public void Weekly_And_Every_Two_Weeks()
    {
        var weekly = RecurrenceCalculator.NextAfter(new DateOnly(2026, 7, 6), RecurringFrequency.Weekly, 1, null, DayOfWeek.Monday, new DateOnly(2026, 7, 6), null);
        var everyTwoWeeks = RecurrenceCalculator.NextAfter(new DateOnly(2026, 7, 6), RecurringFrequency.Weekly, 2, null, DayOfWeek.Monday, new DateOnly(2026, 7, 6), null);

        Assert.Equal(new DateOnly(2026, 7, 13), weekly);
        Assert.Equal(new DateOnly(2026, 7, 20), everyTwoWeeks);
    }

    [Fact]
    public void Monthly_And_Every_Three_Months_Clamp_Day_31()
    {
        var monthly = RecurrenceCalculator.NextAfter(new DateOnly(2027, 1, 31), RecurringFrequency.Monthly, 1, 31, null, new DateOnly(2027, 1, 31), null);
        var quarterly = RecurrenceCalculator.NextAfter(new DateOnly(2027, 1, 31), RecurringFrequency.Monthly, 3, 31, null, new DateOnly(2027, 1, 31), null);

        Assert.Equal(new DateOnly(2027, 2, 28), monthly);
        Assert.Equal(new DateOnly(2027, 4, 30), quarterly);
    }

    [Fact]
    public void Yearly_Handles_Leap_Year()
    {
        var next = RecurrenceCalculator.NextAfter(new DateOnly(2028, 2, 29), RecurringFrequency.Yearly, 1, 29, null, new DateOnly(2028, 2, 29), null);

        Assert.Equal(new DateOnly(2029, 2, 28), next);
    }

    [Fact]
    public void End_Date_Stops_Generation()
    {
        var dates = RecurrenceCalculator.GenerateBetween(new DateOnly(2026, 7, 1), new DateOnly(2026, 9, 30), RecurringFrequency.Monthly, 1, 5, null, new DateOnly(2026, 7, 5), new DateOnly(2026, 8, 31));

        Assert.Equal([new DateOnly(2026, 7, 5), new DateOnly(2026, 8, 5)], dates);
    }
}
