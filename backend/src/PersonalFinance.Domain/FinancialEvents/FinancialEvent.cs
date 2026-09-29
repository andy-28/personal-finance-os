using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.FinancialEvents;

public sealed class FinancialEvent : AuditableEntity
{
    private FinancialEvent() { }

    private FinancialEvent(Guid id, Guid userId, string name, FinancialEventKind kind, decimal amount, string currencyCode,
        DateOnly eventDate, DateOnly? resultDate, Guid? paymentSourceAccountId, Guid? relatedTransactionId, string? note,
        DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Event id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Apply(name, kind, amount, currencyCode, eventDate, resultDate, paymentSourceAccountId, relatedTransactionId, note);
        Status = kind switch
        {
            FinancialEventKind.ConfirmedExpense => FinancialEventStatus.Confirmed,
            FinancialEventKind.ConditionalExpense => FinancialEventStatus.Pending,
            _ => FinancialEventStatus.Planned
        };
        SetCreated(utcNow);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public FinancialEventKind Kind { get; private set; }
    public FinancialEventStatus Status { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "TWD";
    public DateOnly EventDate { get; private set; }
    public DateOnly? ResultDate { get; private set; }
    public Guid? PaymentSourceAccountId { get; private set; }
    public Guid? RelatedTransactionId { get; private set; }
    public bool IsCashFlowRealized { get; private set; }
    public string? Note { get; private set; }

    public static FinancialEvent Create(Guid userId, string name, FinancialEventKind kind, decimal amount,
        string? currencyCode, DateOnly eventDate, DateOnly? resultDate, Guid? paymentSourceAccountId,
        Guid? relatedTransactionId, string? note, DateTimeOffset utcNow) =>
        new(Guid.NewGuid(), userId, name, kind, amount, string.IsNullOrWhiteSpace(currencyCode) ? "TWD" : currencyCode,
            eventDate, resultDate, paymentSourceAccountId, relatedTransactionId, note, utcNow);

    public void Update(string name, FinancialEventKind kind, decimal amount, string currencyCode, DateOnly eventDate,
        DateOnly? resultDate, Guid? paymentSourceAccountId, Guid? relatedTransactionId, string? note, DateTimeOffset utcNow)
    {
        Apply(name, kind, amount, currencyCode, eventDate, resultDate, paymentSourceAccountId, relatedTransactionId, note);
        Touch(utcNow);
    }

    public void SetStatus(FinancialEventStatus status, DateTimeOffset utcNow)
    {
        if (Status == FinancialEventStatus.Completed && status != FinancialEventStatus.Completed)
            throw new InvalidOperationException("Completed events cannot be reopened.");
        Status = status;
        Touch(utcNow);
    }

    public void LinkPostedTransaction(Guid transactionId, DateTimeOffset utcNow)
    {
        if (transactionId == Guid.Empty) throw new ArgumentException("Transaction id is required.", nameof(transactionId));
        RelatedTransactionId = transactionId;
        IsCashFlowRealized = true;
        Touch(utcNow);
    }

    public void UnlinkTransaction(DateTimeOffset utcNow)
    {
        RelatedTransactionId = null;
        Touch(utcNow);
    }

    private void Apply(string name, FinancialEventKind kind, decimal amount, string currencyCode, DateOnly eventDate,
        DateOnly? resultDate, Guid? paymentSourceAccountId, Guid? relatedTransactionId, string? note)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required.", nameof(name));
        Name = name.Trim().Length <= 120 ? name.Trim() : throw new ArgumentException("Name must be 120 characters or fewer.", nameof(name));
        Kind = kind;
        Amount = amount > 0 ? decimal.Round(amount, 2) : throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
        var currency = currencyCode.Trim().ToUpperInvariant();
        CurrencyCode = currency.Length == 3 && currency.All(char.IsLetter) ? currency : throw new ArgumentException("Currency code must be a 3-letter ISO 4217 code.", nameof(currencyCode));
        EventDate = eventDate;
        ResultDate = kind == FinancialEventKind.ConditionalExpense ? resultDate : null;
        if (kind == FinancialEventKind.ConditionalExpense && resultDate is null) throw new ArgumentException("Conditional events require a result date.", nameof(resultDate));
        PaymentSourceAccountId = paymentSourceAccountId;
        RelatedTransactionId = relatedTransactionId;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim().Length <= 1000 ? note.Trim() : throw new ArgumentException("Note must be 1000 characters or fewer.", nameof(note));
    }
}
