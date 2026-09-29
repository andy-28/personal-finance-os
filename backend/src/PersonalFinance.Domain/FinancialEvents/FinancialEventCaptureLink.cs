using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.FinancialEvents;

public sealed class FinancialEventCaptureLink : Entity
{
    private FinancialEventCaptureLink() { }

    private FinancialEventCaptureLink(Guid id, Guid financialEventId, Guid transactionCaptureId, DateTimeOffset createdAtUtc)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Relation id is required.", nameof(id)) : id;
        FinancialEventId = financialEventId == Guid.Empty ? throw new ArgumentException("Financial event id is required.", nameof(financialEventId)) : financialEventId;
        TransactionCaptureId = transactionCaptureId == Guid.Empty ? throw new ArgumentException("Transaction capture id is required.", nameof(transactionCaptureId)) : transactionCaptureId;
        CreatedAtUtc = createdAtUtc;
    }

    public Guid FinancialEventId { get; private set; }
    public Guid TransactionCaptureId { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public static FinancialEventCaptureLink Create(Guid financialEventId, Guid transactionCaptureId, DateTimeOffset utcNow) =>
        new(Guid.NewGuid(), financialEventId, transactionCaptureId, utcNow);
}
