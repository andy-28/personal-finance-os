using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.CreditCards;

public sealed class CreditCardTransactionMetadata : Entity
{
    private CreditCardTransactionMetadata() { }

    private CreditCardTransactionMetadata(Guid id, Guid userId, Guid transactionId, Guid creditCardAccountId, DateOnly purchaseDate, DateOnly? postedDate, string? merchant, Guid? originalTransactionId, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Metadata id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        TransactionId = transactionId == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(transactionId)) : transactionId;
        CreditCardAccountId = creditCardAccountId == Guid.Empty ? throw new ArgumentException("Credit card account id is required.", nameof(creditCardAccountId)) : creditCardAccountId;
        PurchaseDate = purchaseDate;
        PostedDate = postedDate;
        Merchant = ValidateMerchant(merchant);
        OriginalTransactionId = originalTransactionId;
        CreatedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public Guid UserId { get; private set; }
    public Guid TransactionId { get; private set; }
    public Guid CreditCardAccountId { get; private set; }
    public DateOnly PurchaseDate { get; private set; }
    public DateOnly? PostedDate { get; private set; }
    public string? Merchant { get; private set; }
    public Guid? OriginalTransactionId { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }

    public static CreditCardTransactionMetadata Create(Guid userId, Guid transactionId, Guid creditCardAccountId, DateOnly purchaseDate, DateOnly? postedDate, string? merchant, Guid? originalTransactionId, DateTimeOffset utcNow)
    {
        return new CreditCardTransactionMetadata(Guid.NewGuid(), userId, transactionId, creditCardAccountId, purchaseDate, postedDate, merchant, originalTransactionId, utcNow);
    }

    public void Update(DateOnly purchaseDate, DateOnly? postedDate, string? merchant, Guid? originalTransactionId, DateTimeOffset utcNow)
    {
        PurchaseDate = purchaseDate;
        PostedDate = postedDate;
        Merchant = ValidateMerchant(merchant);
        OriginalTransactionId = originalTransactionId;
        UpdatedAtUtc = utcNow;
    }

    private static string? ValidateMerchant(string? merchant)
    {
        if (string.IsNullOrWhiteSpace(merchant)) return null;
        var trimmed = merchant.Trim();
        return trimmed.Length > 150 ? throw new ArgumentException("Merchant must be 150 characters or fewer.", nameof(merchant)) : trimmed;
    }
}
