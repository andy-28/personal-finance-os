using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.FinancialEvents;

public sealed class FinancialEventActivity : Entity
{
    private FinancialEventActivity() { }

    private FinancialEventActivity(Guid id, Guid financialEventId, FinancialEventActivityType type, string description, DateTimeOffset occurredAtUtc)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Activity id is required.", nameof(id)) : id;
        FinancialEventId = financialEventId == Guid.Empty ? throw new ArgumentException("Financial event id is required.", nameof(financialEventId)) : financialEventId;
        Type = type;
        Description = ValidateDescription(description);
        OccurredAtUtc = occurredAtUtc;
    }

    public Guid FinancialEventId { get; private set; }
    public FinancialEventActivityType Type { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; private set; }

    public static FinancialEventActivity Create(Guid financialEventId, FinancialEventActivityType type, string description, DateTimeOffset occurredAtUtc) =>
        new(Guid.NewGuid(), financialEventId, type, description, occurredAtUtc);

    private static string ValidateDescription(string description)
    {
        if (string.IsNullOrWhiteSpace(description)) throw new ArgumentException("Activity description is required.", nameof(description));
        var trimmed = description.Trim();
        return trimmed.Length <= 300 ? trimmed : throw new ArgumentException("Activity description must be 300 characters or fewer.", nameof(description));
    }
}
