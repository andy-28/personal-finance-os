using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Categories;

namespace PersonalFinance.Application.Transactions.Models;

public sealed record TransactionEntryDto(Guid AccountId, string AccountName, decimal Amount);
public sealed record TransactionCategoryDto(Guid Id, string Name, string? Icon, CategoryType Type);

public sealed record TransactionDto(
    Guid Id,
    TransactionType Type,
    TransactionStatus Status,
    DateOnly TransactionDate,
    TransactionCategoryDto? Category,
    string? Payee,
    string? Note,
    decimal DisplayAmount,
    IReadOnlyList<TransactionEntryDto> Entries,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset? VoidedAtUtc);

public sealed record PagedTransactionsDto(
    IReadOnlyList<TransactionDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record TransactionMutationDto(
    Guid? AccountId,
    Guid? CategoryId,
    Guid? FromAccountId,
    Guid? ToAccountId,
    decimal Amount,
    DateOnly TransactionDate,
    string? Payee,
    string? Note);
