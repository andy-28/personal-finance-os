using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.TransactionCaptures;

public sealed class TransactionCapture : Entity
{
    private TransactionCapture() { }

    private TransactionCapture(Guid id, Guid userId, TransactionCaptureSource source, decimal amount, string currencyCode,
        DateTimeOffset occurredAtUtc, DateTimeOffset capturedAtUtc, string description, string? merchantRaw,
        PaymentInstrumentType paymentInstrumentType, Guid paymentInstrumentId, string? sourceReference, string? note)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Capture id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Source = source;
        Amount = amount > 0 && amount <= 999999999999m ? decimal.Round(amount, 2) : throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero and within the supported range.");
        CurrencyCode = ValidateCurrency(currencyCode);
        OccurredAtUtc = occurredAtUtc.ToUniversalTime();
        CapturedAtUtc = capturedAtUtc.ToUniversalTime();
        Description = ValidateRequired(description, 160, nameof(description));
        MerchantRaw = ValidateOptional(merchantRaw, 200, nameof(merchantRaw));
        PaymentInstrumentType = paymentInstrumentType;
        PaymentInstrumentId = paymentInstrumentId == Guid.Empty ? throw new ArgumentException("Payment instrument id is required.", nameof(paymentInstrumentId)) : paymentInstrumentId;
        SourceReference = ValidateOptional(sourceReference, 120, nameof(sourceReference));
        Note = ValidateOptional(note, 1000, nameof(note));
        Status = TransactionCaptureStatus.Pending;
    }

    public Guid UserId { get; private set; }
    public TransactionCaptureSource Source { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "TWD";
    public DateTimeOffset OccurredAtUtc { get; private set; }
    public DateTimeOffset CapturedAtUtc { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string? MerchantRaw { get; private set; }
    public PaymentInstrumentType PaymentInstrumentType { get; private set; }
    public Guid PaymentInstrumentId { get; private set; }
    public TransactionCaptureStatus Status { get; private set; }
    public string? SourceReference { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset? DismissedAtUtc { get; private set; }

    public static TransactionCapture Create(Guid userId, TransactionCaptureSource source, decimal amount, string? currencyCode,
        DateTimeOffset occurredAtUtc, string description, string? merchantRaw, PaymentInstrumentType paymentInstrumentType,
        Guid paymentInstrumentId, string? sourceReference, string? note, DateTimeOffset utcNow) =>
        new(Guid.NewGuid(), userId, source, amount, string.IsNullOrWhiteSpace(currencyCode) ? "TWD" : currencyCode,
            occurredAtUtc, utcNow, description, merchantRaw, paymentInstrumentType, paymentInstrumentId, sourceReference, note);

    public void Dismiss(DateTimeOffset utcNow)
    {
        if (Status == TransactionCaptureStatus.Dismissed) return;
        Status = TransactionCaptureStatus.Dismissed;
        DismissedAtUtc = utcNow;
    }

    private static string ValidateCurrency(string value)
    {
        var normalized = value.Trim().ToUpperInvariant();
        return normalized.Length == 3 && normalized.All(char.IsLetter) ? normalized : throw new ArgumentException("Currency code must be a 3-letter ISO 4217 code.", nameof(value));
    }

    private static string ValidateRequired(string value, int maxLength, string name)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{name} is required.", name);
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : throw new ArgumentException($"{name} must be {maxLength} characters or fewer.", name);
    }

    private static string? ValidateOptional(string? value, int maxLength, string name)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : throw new ArgumentException($"{name} must be {maxLength} characters or fewer.", name);
    }
}
