using PersonalFinance.Application.Transactions.Models;
using PersonalFinance.Domain.CreditCards;

namespace PersonalFinance.Application.CreditCards.Models;

public sealed record StatementPeriodDto(DateOnly StartDate, DateOnly EndDate);

public sealed record CreditCardDto(
    Guid AccountId,
    string AccountName,
    string CurrencyCode,
    string IssuerName,
    string CardName,
    string? LastFourDigits,
    decimal? CreditLimit,
    int StatementClosingDay,
    int PaymentDueDay,
    Guid? PaymentAccountId,
    string? PaymentAccountName,
    decimal LedgerBalance,
    decimal OutstandingAmount,
    decimal CreditBalance,
    decimal? AvailableCredit,
    decimal? CreditUtilization,
    decimal LatestStatementAmount,
    decimal BilledOutstandingAmount,
    decimal UnbilledAmount,
    StatementPeriodDto CurrentStatementPeriod,
    StatementPeriodDto PreviousStatementPeriod,
    decimal StatementCharges,
    decimal StatementCredits,
    decimal EstimatedStatementNet,
    decimal EstimatedAmountDue,
    decimal EstimatedStatementAmount,
    DateOnly NextClosingDate,
    DateOnly NextPaymentDueDate,
    decimal RemainingInstallmentCommitment);

public sealed record CreditCardDetailDto(CreditCardDto Summary, IReadOnlyList<TransactionDto> RecentTransactions, IReadOnlyList<InstallmentPlanDto> InstallmentPlans);

public sealed record CreditCardRequest(
    Guid? AccountId,
    string? AccountName,
    string? CurrencyCode,
    string IssuerName,
    string CardName,
    string? LastFourDigits,
    decimal? CreditLimit,
    int StatementClosingDay,
    int PaymentDueDay,
    Guid? PaymentAccountId);

public sealed record CreditCardPurchaseRequest(Guid CreditCardAccountId, Guid CategoryId, decimal Amount, DateOnly PurchaseDate, DateOnly? PostedDate, string? Merchant, string? Note);
public sealed record CreditCardRefundRequest(Guid CreditCardAccountId, decimal Amount, DateOnly RefundDate, Guid? OriginalTransactionId, string? Note);
public sealed record CreditCardPaymentRequest(Guid CreditCardAccountId, Guid? PaymentAccountId, decimal Amount, DateOnly PaymentDate, string? Note);

public sealed record InstallmentPlanRequest(Guid CreditCardAccountId, string Merchant, string? Description, DateOnly PurchaseDate, decimal OriginalAmount, int InstallmentCount, DateOnly FirstInstallmentDate);
public sealed record PostInstallmentScheduleItemRequest(DateOnly? PostingDate, Guid? CategoryId, string? Note);

public sealed record InstallmentPlanDto(
    Guid Id,
    Guid CreditCardAccountId,
    string Merchant,
    string? Description,
    DateOnly PurchaseDate,
    decimal OriginalAmount,
    int InstallmentCount,
    decimal InstallmentAmount,
    DateOnly FirstInstallmentDate,
    InstallmentPlanStatus Status,
    decimal RemainingCommitmentAmount,
    IReadOnlyList<InstallmentScheduleItemDto> ScheduleItems);

public sealed record InstallmentScheduleItemDto(Guid Id, int InstallmentNumber, DateOnly DueDate, decimal Amount, Guid? TransactionId, InstallmentScheduleItemStatus Status);
