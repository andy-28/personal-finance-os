namespace PersonalFinance.Domain.CreditCards;

public sealed record StatementPeriod(DateOnly StartDate, DateOnly EndDate);

public sealed record StatementSchedule(StatementPeriod CurrentStatementPeriod, StatementPeriod PreviousStatementPeriod, DateOnly NextClosingDate, DateOnly NextPaymentDueDate);

public static class StatementPeriodCalculator
{
    public static StatementSchedule Calculate(DateOnly asOfDate, int statementClosingDay, int paymentDueDay)
    {
        ValidateDay(statementClosingDay);
        ValidateDay(paymentDueDay);

        var currentClosing = ClosingDate(asOfDate.Year, asOfDate.Month, statementClosingDay);
        if (asOfDate > currentClosing)
        {
            currentClosing = ClosingDate(asOfDate.AddMonths(1).Year, asOfDate.AddMonths(1).Month, statementClosingDay);
        }

        var previousClosingMonth = currentClosing.AddMonths(-1);
        var previousClosing = ClosingDate(previousClosingMonth.Year, previousClosingMonth.Month, statementClosingDay);
        var current = new StatementPeriod(previousClosing.AddDays(1), currentClosing);
        var beforePreviousMonth = previousClosing.AddMonths(-1);
        var beforePreviousClosing = ClosingDate(beforePreviousMonth.Year, beforePreviousMonth.Month, statementClosingDay);
        var previous = new StatementPeriod(beforePreviousClosing.AddDays(1), previousClosing);

        var nextClosingDate = asOfDate <= currentClosing ? currentClosing : ClosingDate(asOfDate.AddMonths(1).Year, asOfDate.AddMonths(1).Month, statementClosingDay);
        var nextPaymentDueDate = PaymentDueDate(nextClosingDate, statementClosingDay, paymentDueDay);
        if (nextPaymentDueDate < asOfDate)
        {
            nextClosingDate = ClosingDate(nextClosingDate.AddMonths(1).Year, nextClosingDate.AddMonths(1).Month, statementClosingDay);
            nextPaymentDueDate = PaymentDueDate(nextClosingDate, statementClosingDay, paymentDueDay);
        }

        return new StatementSchedule(current, previous, nextClosingDate, nextPaymentDueDate);
    }

    public static DateOnly PaymentDueDate(DateOnly closingDate, int statementClosingDay, int paymentDueDay)
    {
        ValidateDay(statementClosingDay);
        ValidateDay(paymentDueDay);
        var dueMonth = paymentDueDay > statementClosingDay ? closingDate : closingDate.AddMonths(1);
        return DayInMonth(dueMonth.Year, dueMonth.Month, paymentDueDay);
    }

    private static DateOnly ClosingDate(int year, int month, int statementClosingDay) => DayInMonth(year, month, statementClosingDay);

    private static DateOnly DayInMonth(int year, int month, int day)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        return new DateOnly(year, month, Math.Min(day, daysInMonth));
    }

    private static void ValidateDay(int day)
    {
        if (day is < 1 or > 31) throw new ArgumentOutOfRangeException(nameof(day), "Day must be between 1 and 31.");
    }
}
