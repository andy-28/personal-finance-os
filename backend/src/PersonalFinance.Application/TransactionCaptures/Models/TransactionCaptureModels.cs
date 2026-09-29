using PersonalFinance.Domain.TransactionCaptures;

namespace PersonalFinance.Application.TransactionCaptures.Models;

public sealed record TransactionCaptureRequest(
    decimal Amount,
    string? Currency,
    DateTimeOffset OccurredAt,
    string Description,
    string? MerchantRaw,
    PaymentInstrumentType PaymentInstrumentType,
    Guid PaymentInstrumentId,
    string? SourceReference,
    string? Note);

public sealed record TransactionCaptureDto(
    Guid Id,
    TransactionCaptureSource Source,
    decimal Amount,
    string Currency,
    DateTimeOffset OccurredAt,
    DateTimeOffset CapturedAt,
    string Description,
    string? MerchantRaw,
    PaymentInstrumentType PaymentInstrumentType,
    Guid PaymentInstrumentId,
    string PaymentInstrumentName,
    TransactionCaptureStatus Status,
    string? SourceReference,
    string? Note,
    DateTimeOffset? DismissedAt,
    RelatedFinancialEventDto? RelatedFinancialEvent);

public sealed record RelatedFinancialEventDto(Guid Id, string Name, string Kind, string Status);

public sealed record CreateCaptureTokenRequest(string Name);
public sealed record CaptureApiTokenDto(Guid Id, string Name, DateTimeOffset CreatedAt, DateTimeOffset? LastUsedAt, DateTimeOffset? RevokedAt);
public sealed record CreatedCaptureApiTokenDto(CaptureApiTokenDto Token, string PlaintextToken);
