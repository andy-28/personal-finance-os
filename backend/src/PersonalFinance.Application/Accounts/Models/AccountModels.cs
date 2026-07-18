using PersonalFinance.Domain.Accounts;

namespace PersonalFinance.Application.Accounts.Models;

public sealed record AccountDto(
    Guid Id,
    string Name,
    AccountType Type,
    string CurrencyCode,
    string? InstitutionName,
    int DisplayOrder,
    bool IsArchived,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    decimal Balance,
    string BalanceLabel,
    bool HasOpeningBalance);

public sealed record AccountSummaryCurrencyDto(string CurrencyCode, decimal AssetBalance, decimal LiabilityBalance, decimal NetBalance);
public sealed record AccountSummaryDto(IReadOnlyList<AccountSummaryCurrencyDto> Currencies);
