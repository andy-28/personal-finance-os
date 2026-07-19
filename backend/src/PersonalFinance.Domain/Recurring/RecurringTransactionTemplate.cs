using PersonalFinance.Domain.Common;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Domain.Recurring;

public sealed class RecurringTransactionTemplate : AuditableEntity
{
    private RecurringTransactionTemplate() { }

    private RecurringTransactionTemplate(Guid id, Guid userId, string name, TransactionType transactionType, decimal amount, string currencyCode, Guid? sourceAccountId, Guid? destinationAccountId, Guid? categoryId, string? merchant, string? description, string? note, RecurringFrequency frequency, int interval, int? dayOfMonth, DayOfWeek? dayOfWeek, DateOnly startDate, DateOnly? endDate, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Template id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Name = ValidateRequired(name, 120, nameof(name));
        TransactionType = transactionType;
        Amount = amount <= 0 ? throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.") : decimal.Round(amount, 2);
        CurrencyCode = ValidateCurrency(currencyCode);
        SourceAccountId = sourceAccountId;
        DestinationAccountId = destinationAccountId;
        CategoryId = categoryId;
        Merchant = ValidateOptional(merchant, 150, nameof(merchant));
        Description = ValidateOptional(description, 150, nameof(description));
        Note = ValidateOptional(note, 1000, nameof(note));
        Frequency = frequency;
        Interval = interval <= 0 ? throw new ArgumentOutOfRangeException(nameof(interval), "Interval must be greater than zero.") : interval;
        DayOfMonth = dayOfMonth is null ? null : dayOfMonth is < 1 or > 31 ? throw new ArgumentOutOfRangeException(nameof(dayOfMonth), "Day of month must be between 1 and 31.") : dayOfMonth;
        DayOfWeek = dayOfWeek;
        StartDate = startDate;
        EndDate = endDate;
        IsActive = true;
        NextOccurrenceDate = RecurrenceCalculator.FirstOccurrenceOnOrAfter(startDate, frequency, Interval, DayOfMonth, DayOfWeek, startDate, endDate);
        SetCreated(utcNow);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public TransactionType TransactionType { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "TWD";
    public Guid? SourceAccountId { get; private set; }
    public Guid? DestinationAccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string? Merchant { get; private set; }
    public string? Description { get; private set; }
    public string? Note { get; private set; }
    public RecurringFrequency Frequency { get; private set; }
    public int Interval { get; private set; }
    public int? DayOfMonth { get; private set; }
    public DayOfWeek? DayOfWeek { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public DateOnly? NextOccurrenceDate { get; private set; }
    public bool IsActive { get; private set; }

    public static RecurringTransactionTemplate Create(Guid userId, string name, TransactionType transactionType, decimal amount, string? currencyCode, Guid? sourceAccountId, Guid? destinationAccountId, Guid? categoryId, string? merchant, string? description, string? note, RecurringFrequency frequency, int interval, int? dayOfMonth, DayOfWeek? dayOfWeek, DateOnly startDate, DateOnly? endDate, DateTimeOffset utcNow)
    {
        return new RecurringTransactionTemplate(Guid.NewGuid(), userId, name, transactionType, amount, string.IsNullOrWhiteSpace(currencyCode) ? "TWD" : currencyCode, sourceAccountId, destinationAccountId, categoryId, merchant, description, note, frequency, interval, dayOfMonth, dayOfWeek, startDate, endDate, utcNow);
    }

    public void Update(string name, TransactionType transactionType, decimal amount, string currencyCode, Guid? sourceAccountId, Guid? destinationAccountId, Guid? categoryId, string? merchant, string? description, string? note, RecurringFrequency frequency, int interval, int? dayOfMonth, DayOfWeek? dayOfWeek, DateOnly startDate, DateOnly? endDate, DateTimeOffset utcNow)
    {
        Name = ValidateRequired(name, 120, nameof(name));
        TransactionType = transactionType;
        Amount = amount <= 0 ? throw new ArgumentOutOfRangeException(nameof(amount)) : decimal.Round(amount, 2);
        CurrencyCode = ValidateCurrency(currencyCode);
        SourceAccountId = sourceAccountId;
        DestinationAccountId = destinationAccountId;
        CategoryId = categoryId;
        Merchant = ValidateOptional(merchant, 150, nameof(merchant));
        Description = ValidateOptional(description, 150, nameof(description));
        Note = ValidateOptional(note, 1000, nameof(note));
        Frequency = frequency;
        Interval = interval <= 0 ? throw new ArgumentOutOfRangeException(nameof(interval)) : interval;
        DayOfMonth = dayOfMonth is null ? null : dayOfMonth is < 1 or > 31 ? throw new ArgumentOutOfRangeException(nameof(dayOfMonth)) : dayOfMonth;
        DayOfWeek = dayOfWeek;
        StartDate = startDate;
        EndDate = endDate;
        NextOccurrenceDate = IsActive ? RecurrenceCalculator.FirstOccurrenceOnOrAfter(DateOnly.FromDateTime(utcNow.Date), Frequency, Interval, DayOfMonth, DayOfWeek, StartDate, EndDate) : NextOccurrenceDate;
        Touch(utcNow);
    }

    public void Archive(DateTimeOffset utcNow)
    {
        IsActive = false;
        Touch(utcNow);
    }

    public void Restore(DateTimeOffset utcNow)
    {
        IsActive = true;
        NextOccurrenceDate = RecurrenceCalculator.FirstOccurrenceOnOrAfter(DateOnly.FromDateTime(utcNow.Date), Frequency, Interval, DayOfMonth, DayOfWeek, StartDate, EndDate);
        Touch(utcNow);
    }

    public void AdvanceAfter(DateOnly scheduledDate, DateTimeOffset utcNow)
    {
        NextOccurrenceDate = RecurrenceCalculator.NextAfter(scheduledDate, Frequency, Interval, DayOfMonth, DayOfWeek, StartDate, EndDate);
        Touch(utcNow);
    }

    private static string ValidateRequired(string value, int maxLength, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{paramName} is required.", paramName);
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? throw new ArgumentException($"{paramName} must be {maxLength} characters or fewer.", paramName) : trimmed;
    }

    private static string? ValidateOptional(string? value, int maxLength, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? throw new ArgumentException($"{paramName} must be {maxLength} characters or fewer.", paramName) : trimmed;
    }

    private static string ValidateCurrency(string value)
    {
        var normalized = value.Trim().ToUpperInvariant();
        return normalized.Length != 3 || normalized.Any(static c => c < 'A' || c > 'Z') ? throw new ArgumentException("Currency code must be a 3-letter ISO 4217 code.", nameof(value)) : normalized;
    }
}
