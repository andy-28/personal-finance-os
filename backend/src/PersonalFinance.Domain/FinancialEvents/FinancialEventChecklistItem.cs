using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.FinancialEvents;

public sealed class FinancialEventChecklistItem : Entity
{
    private FinancialEventChecklistItem() { }

    private FinancialEventChecklistItem(Guid id, Guid financialEventId, string text, int sortOrder, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Checklist item id is required.", nameof(id)) : id;
        FinancialEventId = financialEventId == Guid.Empty ? throw new ArgumentException("Financial event id is required.", nameof(financialEventId)) : financialEventId;
        Text = ValidateText(text);
        SortOrder = sortOrder < 0 ? throw new ArgumentOutOfRangeException(nameof(sortOrder)) : sortOrder;
        CreatedAtUtc = utcNow;
    }

    public Guid FinancialEventId { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public bool IsCompleted { get; private set; }
    public int SortOrder { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }

    public static FinancialEventChecklistItem Create(Guid financialEventId, string text, int sortOrder, DateTimeOffset utcNow) =>
        new(Guid.NewGuid(), financialEventId, text, sortOrder, utcNow);

    public void SetCompleted(bool isCompleted, DateTimeOffset utcNow)
    {
        IsCompleted = isCompleted;
        CompletedAtUtc = isCompleted ? utcNow : null;
    }

    private static string ValidateText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) throw new ArgumentException("Checklist text is required.", nameof(text));
        var trimmed = text.Trim();
        return trimmed.Length <= 240 ? trimmed : throw new ArgumentException("Checklist text must be 240 characters or fewer.", nameof(text));
    }
}
