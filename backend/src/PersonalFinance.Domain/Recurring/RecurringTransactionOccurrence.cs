using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Recurring;

public sealed class RecurringTransactionOccurrence : Entity
{
    private RecurringTransactionOccurrence() { }

    private RecurringTransactionOccurrence(Guid id, Guid templateId, DateOnly scheduledDate, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Occurrence id is required.", nameof(id)) : id;
        TemplateId = templateId == Guid.Empty ? throw new ArgumentException("Template id is required.", nameof(templateId)) : templateId;
        ScheduledDate = scheduledDate;
        Status = RecurringOccurrenceStatus.Pending;
        CreatedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public Guid TemplateId { get; private set; }
    public DateOnly ScheduledDate { get; private set; }
    public RecurringOccurrenceStatus Status { get; private set; }
    public Guid? PostedTransactionId { get; private set; }
    public DateTimeOffset? SkippedAtUtc { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }

    public static RecurringTransactionOccurrence Create(Guid templateId, DateOnly scheduledDate, DateTimeOffset utcNow) => new(Guid.NewGuid(), templateId, scheduledDate, utcNow);

    public void MarkPosted(Guid transactionId, DateTimeOffset utcNow)
    {
        if (Status != RecurringOccurrenceStatus.Pending) throw new InvalidOperationException("Only pending occurrences can be posted.");
        PostedTransactionId = transactionId == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(transactionId)) : transactionId;
        Status = RecurringOccurrenceStatus.Posted;
        UpdatedAtUtc = utcNow;
    }

    public void Skip(DateTimeOffset utcNow)
    {
        if (Status != RecurringOccurrenceStatus.Pending) throw new InvalidOperationException("Only pending occurrences can be skipped.");
        Status = RecurringOccurrenceStatus.Skipped;
        SkippedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }
}
