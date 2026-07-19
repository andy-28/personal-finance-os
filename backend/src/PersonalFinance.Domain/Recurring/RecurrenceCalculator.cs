namespace PersonalFinance.Domain.Recurring;

public static class RecurrenceCalculator
{
    public static DateOnly? FirstOccurrenceOnOrAfter(DateOnly targetDate, RecurringFrequency frequency, int interval, int? dayOfMonth, DayOfWeek? dayOfWeek, DateOnly startDate, DateOnly? endDate)
    {
        if (interval <= 0) throw new ArgumentOutOfRangeException(nameof(interval));
        var cursor = startDate;
        for (var i = 0; i < 1000; i++)
        {
            if (cursor >= targetDate && (endDate is null || cursor <= endDate)) return cursor;
            var next = NextAfter(cursor, frequency, interval, dayOfMonth, dayOfWeek, startDate, endDate);
            if (next is null) return null;
            cursor = next.Value;
        }

        return null;
    }

    public static DateOnly? NextAfter(DateOnly date, RecurringFrequency frequency, int interval, int? dayOfMonth, DayOfWeek? dayOfWeek, DateOnly startDate, DateOnly? endDate)
    {
        var next = frequency switch
        {
            RecurringFrequency.Weekly => date.AddDays(7 * interval),
            RecurringFrequency.Monthly => MonthlyAfter(date, interval, dayOfMonth ?? startDate.Day),
            RecurringFrequency.Yearly => YearlyAfter(date, interval, dayOfMonth ?? startDate.Day),
            _ => throw new ArgumentOutOfRangeException(nameof(frequency))
        };

        if (frequency == RecurringFrequency.Weekly && dayOfWeek is { } requestedDay)
        {
            var delta = ((int)requestedDay - (int)next.DayOfWeek + 7) % 7;
            next = next.AddDays(delta);
        }

        return endDate is not null && next > endDate ? null : next;
    }

    public static IReadOnlyList<DateOnly> GenerateBetween(DateOnly startDate, DateOnly throughDate, RecurringFrequency frequency, int interval, int? dayOfMonth, DayOfWeek? dayOfWeek, DateOnly templateStartDate, DateOnly? endDate)
    {
        var dates = new List<DateOnly>();
        var current = FirstOccurrenceOnOrAfter(startDate, frequency, interval, dayOfMonth, dayOfWeek, templateStartDate, endDate);
        while (current is { } value && value <= throughDate)
        {
            dates.Add(value);
            current = NextAfter(value, frequency, interval, dayOfMonth, dayOfWeek, templateStartDate, endDate);
        }

        return dates;
    }

    private static DateOnly MonthlyAfter(DateOnly date, int interval, int dayOfMonth)
    {
        var target = date.AddMonths(interval);
        return ClampDay(target.Year, target.Month, dayOfMonth);
    }

    private static DateOnly YearlyAfter(DateOnly date, int interval, int dayOfMonth)
    {
        var target = date.AddYears(interval);
        return ClampDay(target.Year, target.Month, dayOfMonth);
    }

    private static DateOnly ClampDay(int year, int month, int day)
    {
        return new DateOnly(year, month, Math.Min(day, DateTime.DaysInMonth(year, month)));
    }
}
