using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.StatementImports;

public sealed class StatementImportRow : Entity
{
    private StatementImportRow() { }

    private StatementImportRow(Guid id, Guid batchId, int sourceRowNumber, DateOnly? transactionDate, DateOnly? postingDate, string rawDescription, string normalizedDescription, decimal amount, string currency, decimal? foreignAmount, string? foreignCurrency, StatementImportRowType type, bool isInstallment, int? installmentCurrentNumber, int? installmentTotalNumber, string? rawText, string fingerprint, StatementImportMatchStatus matchStatus, StatementImportReviewStatus reviewStatus, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Row id is required.", nameof(id)) : id;
        BatchId = batchId == Guid.Empty ? throw new ArgumentException("Batch id is required.", nameof(batchId)) : batchId;
        SourceRowNumber = sourceRowNumber <= 0 ? throw new ArgumentOutOfRangeException(nameof(sourceRowNumber)) : sourceRowNumber;
        TransactionDate = transactionDate;
        PostingDate = postingDate;
        RawDescription = Validate(rawDescription, 500, nameof(rawDescription));
        NormalizedDescription = Validate(normalizedDescription, 200, nameof(normalizedDescription));
        Amount = amount;
        Currency = Validate(currency, 3, nameof(currency)).ToUpperInvariant();
        ForeignAmount = foreignAmount;
        ForeignCurrency = string.IsNullOrWhiteSpace(foreignCurrency) ? null : Validate(foreignCurrency, 3, nameof(foreignCurrency)).ToUpperInvariant();
        Type = type;
        IsInstallment = isInstallment;
        InstallmentCurrentNumber = installmentCurrentNumber;
        InstallmentTotalNumber = installmentTotalNumber;
        RawText = string.IsNullOrWhiteSpace(rawText) ? null : rawText.Trim()[..Math.Min(rawText.Trim().Length, 1000)];
        Fingerprint = Validate(fingerprint, 128, nameof(fingerprint));
        MatchStatus = matchStatus;
        ReviewStatus = reviewStatus;
        CreatedAtUtc = utcNow;
    }

    public Guid BatchId { get; private set; }
    public int SourceRowNumber { get; private set; }
    public DateOnly? TransactionDate { get; private set; }
    public DateOnly? PostingDate { get; private set; }
    public string RawDescription { get; private set; } = string.Empty;
    public string NormalizedDescription { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = string.Empty;
    public decimal? ForeignAmount { get; private set; }
    public string? ForeignCurrency { get; private set; }
    public StatementImportRowType Type { get; private set; }
    public bool IsInstallment { get; private set; }
    public int? InstallmentCurrentNumber { get; private set; }
    public int? InstallmentTotalNumber { get; private set; }
    public string? RawText { get; private set; }
    public string Fingerprint { get; private set; } = string.Empty;
    public StatementImportMatchStatus MatchStatus { get; private set; }
    public Guid? MatchedTransactionId { get; private set; }
    public StatementImportReviewStatus ReviewStatus { get; private set; }
    public Guid? CategoryId { get; private set; }
    public Guid? CreatedTransactionId { get; private set; }
    public string? FailureReason { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public static StatementImportRow Create(Guid batchId, int sourceRowNumber, DateOnly? transactionDate, DateOnly? postingDate, string rawDescription, string normalizedDescription, decimal amount, string currency, decimal? foreignAmount, string? foreignCurrency, StatementImportRowType type, bool isInstallment, int? installmentCurrentNumber, int? installmentTotalNumber, string? rawText, string fingerprint, StatementImportMatchStatus matchStatus, StatementImportReviewStatus reviewStatus, DateTimeOffset utcNow)
    {
        return new StatementImportRow(Guid.NewGuid(), batchId, sourceRowNumber, transactionDate, postingDate, rawDescription, normalizedDescription, amount, currency, foreignAmount, foreignCurrency, type, isInstallment, installmentCurrentNumber, installmentTotalNumber, rawText, fingerprint, matchStatus, reviewStatus, utcNow);
    }

    public void Review(StatementImportReviewStatus reviewStatus, Guid? categoryId)
    {
        if (ReviewStatus == StatementImportReviewStatus.Posted) throw new InvalidOperationException("Posted rows cannot be changed.");
        ReviewStatus = reviewStatus;
        CategoryId = categoryId;
        FailureReason = null;
    }

    public void ApplyReviewEdits(decimal? amount, StatementImportRowType? type, string fingerprint)
    {
        if (ReviewStatus == StatementImportReviewStatus.Posted) throw new InvalidOperationException("Posted rows cannot be changed.");
        if (amount is { } nextAmount)
        {
            if (nextAmount <= 0) throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
            Amount = nextAmount;
        }
        if (type is { } nextType) Type = nextType;
        Fingerprint = Validate(fingerprint, 128, nameof(fingerprint));
        MatchStatus = StatementImportMatchStatus.New;
        MatchedTransactionId = null;
        FailureReason = null;
    }

    public void MarkMatched(Guid transactionId)
    {
        MatchedTransactionId = transactionId == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(transactionId)) : transactionId;
        MatchStatus = StatementImportMatchStatus.Matched;
    }

    public void MarkPosted(Guid transactionId)
    {
        CreatedTransactionId = transactionId == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(transactionId)) : transactionId;
        ReviewStatus = StatementImportReviewStatus.Posted;
        FailureReason = null;
    }

    public void MarkFailed(string reason)
    {
        ReviewStatus = StatementImportReviewStatus.Failed;
        FailureReason = string.IsNullOrWhiteSpace(reason) ? "Post failed." : reason.Trim()[..Math.Min(reason.Trim().Length, 500)];
    }

    private static string Validate(string value, int maxLength, string name)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{name} is required.", name);
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? throw new ArgumentException($"{name} must be {maxLength} characters or fewer.", name) : trimmed;
    }
}
