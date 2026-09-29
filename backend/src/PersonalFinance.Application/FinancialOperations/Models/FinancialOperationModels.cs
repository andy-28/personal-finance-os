using PersonalFinance.Domain.FinancialEvents;

namespace PersonalFinance.Application.FinancialOperations.Models;

public sealed record FinancialEventRequest(
    string Name,
    FinancialEventKind Kind,
    decimal Amount,
    string? CurrencyCode,
    DateOnly EventDate,
    DateOnly? ResultDate,
    Guid? PaymentSourceAccountId,
    Guid? RelatedTransactionId,
    string? Note);

public sealed record FinancialEventStatusRequest(FinancialEventStatus Status);
public sealed record FinancialEventChecklistRequest(string Text);
public sealed record FinancialEventChecklistToggleRequest(bool IsCompleted);
public sealed record PromoteTransactionRequest(
    string Name,
    FinancialEventKind Kind,
    decimal Amount,
    string? CurrencyCode,
    DateOnly EventDate,
    Guid? PaymentSourceAccountId,
    string? Note);

public sealed record FinancialEventChecklistItemDto(
    Guid Id,
    string Text,
    bool IsCompleted,
    int SortOrder,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record FinancialEventActivityDto(
    Guid Id,
    FinancialEventActivityType Type,
    string Description,
    DateTimeOffset OccurredAtUtc);

public sealed record RelatedCaptureDto(
    Guid Id,
    string Description,
    decimal Amount,
    string CurrencyCode,
    string PaymentInstrumentName,
    string Status,
    DateTimeOffset CapturedAtUtc);

public sealed record RelatedLedgerTransactionDto(
    Guid Id,
    string Key,
    string Title,
    string Type,
    string Status,
    decimal Amount,
    string CurrencyCode,
    DateOnly TransactionDate,
    Guid? PaymentSourceAccountId,
    string? PaymentSourceName);

public sealed record FinancialEventDto(
    Guid Id,
    string Name,
    FinancialEventKind Kind,
    FinancialEventStatus Status,
    decimal Amount,
    string CurrencyCode,
    DateOnly EventDate,
    DateOnly CashFlowDate,
    DateOnly? ResultDate,
    Guid? PaymentSourceAccountId,
    string? PaymentSourceName,
    Guid? RelatedTransactionId,
    RelatedLedgerTransactionDto? RelatedTransaction,
    bool IsCashFlowRealized,
    string? Note,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    bool NeedsAction,
    IReadOnlyList<FinancialEventChecklistItemDto> Checklist,
    IReadOnlyList<RelatedCaptureDto> RelatedCaptures,
    IReadOnlyList<FinancialEventActivityDto> Activity);

public sealed record CashFlowItemDto(
    string Id,
    string Source,
    string Kind,
    string Status,
    string Title,
    DateOnly Date,
    DateOnly CashFlowDate,
    decimal Amount,
    string CurrencyCode,
    bool IsConditional,
    Guid? PaymentSourceAccountId,
    string? PaymentSourceName,
    Guid? FinancialEventId,
    string? Note);

public sealed record LiquidityPointDto(DateOnly Date, decimal BaselineLiquidity, decimal ConditionalLiquidity);
public sealed record LiquidityGapDto(DateOnly StartDate, DateOnly? EndDate, decimal LowestLiquidity, DateOnly? NextExpectedIncomeDate);

public sealed record LiquidityProjectionDto(
    string CurrencyCode,
    int HorizonDays,
    decimal CurrentLiquidity,
    decimal ProjectedLowestLiquidity,
    DateOnly ProjectedLowestLiquidityDate,
    decimal ConditionalLowestLiquidity,
    DateOnly ConditionalLowestLiquidityDate,
    decimal ConfirmedOutflow,
    decimal ConditionalExposure,
    decimal? NextExpectedIncome,
    DateOnly? NextExpectedIncomeDate,
    int EventCount,
    int PendingCount,
    IReadOnlyList<LiquidityPointDto> Points,
    IReadOnlyList<LiquidityGapDto> Gaps);

public sealed record FinancialOperationsWorkspaceDto(
    DateOnly AsOfDate,
    DateOnly ThroughDate,
    IReadOnlyList<FinancialEventDto> FinancialEvents,
    IReadOnlyList<CashFlowItemDto> Timeline,
    IReadOnlyList<OperationalItemDto> Operations,
    int NeedsActionCount,
    LiquidityProjectionDto Projection);

public sealed record OperationalItemDto(
    string Id,
    string Key,
    string RecordType,
    string Source,
    string Kind,
    string Status,
    string Title,
    string? Description,
    DateOnly FinancialDate,
    DateOnly? SecondaryDate,
    decimal Amount,
    string CurrencyCode,
    bool IsConditional,
    bool NeedsAction,
    Guid? PaymentSourceAccountId,
    string? PaymentSourceName,
    Guid? FinancialEventId,
    Guid? TransactionCaptureId,
    Guid? TransactionId,
    Guid? RelatedFinancialEventId,
    string? RelatedFinancialEventName);
