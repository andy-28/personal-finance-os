using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.StatementImports;

public sealed class StatementImportBatch : Entity
{
    private StatementImportBatch() { }

    private StatementImportBatch(Guid id, Guid userId, Guid creditCardAccountId, string provider, string originalFileName, string fileHash, string parserVersion, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Batch id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        CreditCardAccountId = creditCardAccountId == Guid.Empty ? throw new ArgumentException("Credit card account id is required.", nameof(creditCardAccountId)) : creditCardAccountId;
        Provider = Validate(provider, 80, nameof(provider));
        OriginalFileName = Validate(originalFileName, 260, nameof(originalFileName));
        FileHash = Validate(fileHash, 128, nameof(fileHash));
        ParserVersion = Validate(parserVersion, 80, nameof(parserVersion));
        Status = StatementImportBatchStatus.Uploaded;
        CreatedAtUtc = utcNow;
    }

    public Guid UserId { get; private set; }
    public Guid CreditCardAccountId { get; private set; }
    public string Provider { get; private set; } = string.Empty;
    public string OriginalFileName { get; private set; } = string.Empty;
    public string FileHash { get; private set; } = string.Empty;
    public DateOnly? StatementPeriodStart { get; private set; }
    public DateOnly? StatementPeriodEnd { get; private set; }
    public DateOnly? PaymentDueDate { get; private set; }
    public decimal? PreviousBalance { get; private set; }
    public decimal? PaymentAmount { get; private set; }
    public decimal? NewCharges { get; private set; }
    public decimal? StatementAmount { get; private set; }
    public decimal? MinimumPayment { get; private set; }
    public StatementImportBatchStatus Status { get; private set; }
    public string ParserVersion { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? ParsedAtUtc { get; private set; }
    public DateTimeOffset? PostedAtUtc { get; private set; }
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }

    public static StatementImportBatch Create(Guid userId, Guid creditCardAccountId, string provider, string originalFileName, string fileHash, string parserVersion, DateTimeOffset utcNow)
    {
        return new StatementImportBatch(Guid.NewGuid(), userId, creditCardAccountId, provider, originalFileName, fileHash, parserVersion, utcNow);
    }

    public void MarkParsed(DateOnly? periodStart, DateOnly? periodEnd, DateOnly? paymentDueDate, decimal? previousBalance, decimal? paymentAmount, decimal? newCharges, decimal? statementAmount, decimal? minimumPayment, bool requiresReview, DateTimeOffset utcNow)
    {
        StatementPeriodStart = periodStart;
        StatementPeriodEnd = periodEnd;
        PaymentDueDate = paymentDueDate;
        PreviousBalance = previousBalance;
        PaymentAmount = paymentAmount;
        NewCharges = newCharges;
        StatementAmount = statementAmount;
        MinimumPayment = minimumPayment;
        Status = requiresReview ? StatementImportBatchStatus.ReviewRequired : StatementImportBatchStatus.Parsed;
        ParsedAtUtc = utcNow;
        ErrorCode = null;
        ErrorMessage = null;
    }

    public void MarkFailed(string code, string message)
    {
        ErrorCode = Validate(code, 80, nameof(code));
        ErrorMessage = Validate(message, 1000, nameof(message));
        Status = StatementImportBatchStatus.Failed;
    }

    public void MarkDuplicate(DateTimeOffset utcNow)
    {
        Status = StatementImportBatchStatus.Duplicate;
        ParsedAtUtc = utcNow;
    }

    public void MarkPosted(bool partial, DateTimeOffset utcNow)
    {
        Status = partial ? StatementImportBatchStatus.PartiallyPosted : StatementImportBatchStatus.Completed;
        PostedAtUtc = utcNow;
    }

    public void Discard()
    {
        Status = StatementImportBatchStatus.Discarded;
    }

    private static string Validate(string value, int maxLength, string name)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{name} is required.", name);
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? throw new ArgumentException($"{name} must be {maxLength} characters or fewer.", name) : trimmed;
    }
}
