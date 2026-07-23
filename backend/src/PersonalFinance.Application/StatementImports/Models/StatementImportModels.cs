using PersonalFinance.Domain.StatementImports;

namespace PersonalFinance.Application.StatementImports.Models;

public sealed record StatementImportBatchDto(
    Guid Id,
    Guid CreditCardAccountId,
    string Provider,
    string OriginalFileName,
    DateOnly? StatementPeriodStart,
    DateOnly? StatementPeriodEnd,
    DateOnly? PaymentDueDate,
    decimal? PreviousBalance,
    decimal? PaymentAmount,
    decimal? NewCharges,
    decimal? StatementAmount,
    decimal? MinimumPayment,
    StatementImportBatchStatus Status,
    string ParserVersion,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ParsedAtUtc,
    DateTimeOffset? PostedAtUtc,
    string? ErrorCode,
    string? ErrorMessage,
    IReadOnlyList<StatementImportRowDto> Rows,
    IReadOnlyList<string> Warnings);

public sealed record StatementImportRowDto(
    Guid Id,
    int SourceRowNumber,
    DateOnly? TransactionDate,
    DateOnly? PostingDate,
    string RawDescription,
    string NormalizedDescription,
    decimal Amount,
    string Currency,
    decimal? ForeignAmount,
    string? ForeignCurrency,
    StatementImportRowType Type,
    bool IsInstallment,
    int? InstallmentCurrentNumber,
    int? InstallmentTotalNumber,
    string? RawText,
    StatementImportMatchStatus MatchStatus,
    Guid? MatchedTransactionId,
    StatementImportReviewStatus ReviewStatus,
    Guid? CategoryId,
    Guid? CreatedTransactionId,
    string? FailureReason);

public sealed record StatementImportRowUpdateRequest(StatementImportReviewStatus ReviewStatus, Guid? CategoryId, decimal? Amount, StatementImportRowType? Type);
public sealed record StatementImportPostRequest(Guid? DefaultCategoryId);
