using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Application.Recurring.Models;

public sealed record RecurringTemplateRequest(
    string Name,
    TransactionType TransactionType,
    decimal Amount,
    string? Currency,
    Guid? SourceAccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    string? Merchant,
    string? Description,
    string? Note,
    RecurringFrequency Frequency,
    int Interval,
    int? DayOfMonth,
    DayOfWeek? DayOfWeek,
    DateOnly StartDate,
    DateOnly? EndDate);

public sealed record RecurringTemplateDto(
    Guid Id,
    string Name,
    TransactionType TransactionType,
    decimal Amount,
    string Currency,
    Guid? SourceAccountId,
    string? SourceAccountName,
    Guid? DestinationAccountId,
    string? DestinationAccountName,
    Guid? CategoryId,
    string? CategoryName,
    string? Merchant,
    string? Description,
    string? Note,
    RecurringFrequency Frequency,
    int Interval,
    int? DayOfMonth,
    DayOfWeek? DayOfWeek,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly? NextOccurrenceDate,
    bool IsActive);

public sealed record RecurringOccurrenceDto(
    Guid Id,
    Guid TemplateId,
    string TemplateName,
    TransactionType TransactionType,
    decimal Amount,
    string Currency,
    DateOnly ScheduledDate,
    RecurringOccurrenceStatus Status,
    Guid? PostedTransactionId,
    Guid? SourceAccountId,
    string? SourceAccountName,
    Guid? DestinationAccountId,
    string? DestinationAccountName,
    Guid? CategoryId,
    string? CategoryName,
    string? Merchant,
    string? Note);

public sealed record UpcomingDto(IReadOnlyList<RecurringOccurrenceDto> RecurringOccurrences, IReadOnlyList<UpcomingInstallmentDto> Installments, IReadOnlyList<CreditCardReminderDto> CreditCardReminders);
public sealed record UpcomingInstallmentDto(Guid PlanId, Guid ItemId, Guid CreditCardAccountId, string Merchant, DateOnly DueDate, decimal Amount, string Status);
public sealed record CreditCardReminderDto(Guid AccountId, string AccountName, string Kind, DateOnly Date);
