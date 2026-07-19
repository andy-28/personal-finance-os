using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.CreditCards;

public sealed class CreditCardAccount : AuditableEntity
{
    private CreditCardAccount() { }

    private CreditCardAccount(Guid id, Guid userId, Guid accountId, string issuerName, string cardName, string? lastFourDigits, decimal? creditLimit, int statementClosingDay, int paymentDueDay, Guid? paymentAccountId, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Credit card id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        AccountId = accountId == Guid.Empty ? throw new ArgumentException("Account id is required.", nameof(accountId)) : accountId;
        Update(issuerName, cardName, lastFourDigits, creditLimit, statementClosingDay, paymentDueDay, paymentAccountId, utcNow);
        SetCreated(utcNow);
    }

    public Guid UserId { get; private set; }
    public Guid AccountId { get; private set; }
    public string IssuerName { get; private set; } = string.Empty;
    public string CardName { get; private set; } = string.Empty;
    public string? LastFourDigits { get; private set; }
    public decimal? CreditLimit { get; private set; }
    public int StatementClosingDay { get; private set; }
    public int PaymentDueDay { get; private set; }
    public Guid? PaymentAccountId { get; private set; }

    public static CreditCardAccount Create(Guid userId, Guid accountId, string issuerName, string cardName, string? lastFourDigits, decimal? creditLimit, int statementClosingDay, int paymentDueDay, Guid? paymentAccountId, DateTimeOffset utcNow)
    {
        return new CreditCardAccount(Guid.NewGuid(), userId, accountId, issuerName, cardName, lastFourDigits, creditLimit, statementClosingDay, paymentDueDay, paymentAccountId, utcNow);
    }

    public void Update(string issuerName, string cardName, string? lastFourDigits, decimal? creditLimit, int statementClosingDay, int paymentDueDay, Guid? paymentAccountId, DateTimeOffset utcNow)
    {
        IssuerName = ValidateRequired(issuerName, 100, nameof(issuerName));
        CardName = ValidateRequired(cardName, 100, nameof(cardName));
        LastFourDigits = ValidateLastFourDigits(lastFourDigits);
        CreditLimit = creditLimit is null ? null : creditLimit <= 0 ? throw new ArgumentOutOfRangeException(nameof(creditLimit), "Credit limit must be greater than zero.") : decimal.Round(creditLimit.Value, 2);
        StatementClosingDay = ValidateDay(statementClosingDay, nameof(statementClosingDay));
        PaymentDueDay = ValidateDay(paymentDueDay, nameof(paymentDueDay));
        PaymentAccountId = paymentAccountId;
        Touch(utcNow);
    }

    private static int ValidateDay(int value, string paramName) => value is < 1 or > 31 ? throw new ArgumentOutOfRangeException(paramName, "Day must be between 1 and 31.") : value;

    private static string ValidateRequired(string value, int maxLength, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{paramName} is required.", paramName);
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? throw new ArgumentException($"{paramName} must be {maxLength} characters or fewer.", paramName) : trimmed;
    }

    private static string? ValidateLastFourDigits(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length != 4 || trimmed.Any(static c => c < '0' || c > '9')
            ? throw new ArgumentException("Last four digits must contain exactly four digits.", nameof(value))
            : trimmed;
    }
}
