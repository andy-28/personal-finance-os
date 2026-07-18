using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Accounts;

public sealed class Account : AuditableEntity
{
    private Account() { }

    private Account(Guid id, Guid userId, string name, AccountType type, string currencyCode, string? institutionName, int displayOrder, DateTimeOffset utcNow)
    {
        Id = id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Name = ValidateName(name);
        Type = type;
        CurrencyCode = ValidateCurrencyCode(currencyCode);
        InstitutionName = ValidateInstitutionName(institutionName);
        DisplayOrder = displayOrder < 0 ? throw new ArgumentOutOfRangeException(nameof(displayOrder), "Display order cannot be negative.") : displayOrder;
        IsArchived = false;
        SetCreated(utcNow);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AccountType Type { get; private set; }
    public string CurrencyCode { get; private set; } = "TWD";
    public string? InstitutionName { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsArchived { get; private set; }

    public static Account Create(Guid userId, string name, AccountType type, string? currencyCode, string? institutionName, int displayOrder, DateTimeOffset utcNow)
    {
        return new Account(Guid.NewGuid(), userId, name, type, string.IsNullOrWhiteSpace(currencyCode) ? "TWD" : currencyCode, institutionName, displayOrder, utcNow);
    }

    public void Update(string name, AccountType type, string currencyCode, string? institutionName, DateTimeOffset utcNow)
    {
        Name = ValidateName(name);
        Type = type;
        CurrencyCode = ValidateCurrencyCode(currencyCode);
        InstitutionName = ValidateInstitutionName(institutionName);
        Touch(utcNow);
    }

    public void SetDisplayOrder(int displayOrder, DateTimeOffset utcNow)
    {
        DisplayOrder = displayOrder < 0 ? throw new ArgumentOutOfRangeException(nameof(displayOrder)) : displayOrder;
        Touch(utcNow);
    }

    public void Archive(DateTimeOffset utcNow)
    {
        if (IsArchived)
        {
            return;
        }

        IsArchived = true;
        Touch(utcNow);
    }

    public void Restore(int displayOrder, DateTimeOffset utcNow)
    {
        IsArchived = false;
        SetDisplayOrder(displayOrder, utcNow);
    }

    private static string ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name is required.", nameof(name));
        }

        var trimmed = name.Trim();
        return trimmed.Length > 100 ? throw new ArgumentException("Name must be 100 characters or fewer.", nameof(name)) : trimmed;
    }

    private static string ValidateCurrencyCode(string currencyCode)
    {
        if (string.IsNullOrWhiteSpace(currencyCode))
        {
            throw new ArgumentException("Currency code is required.", nameof(currencyCode));
        }

        var normalized = currencyCode.Trim().ToUpperInvariant();
        return normalized.Length != 3 || normalized.Any(static c => c < 'A' || c > 'Z')
            ? throw new ArgumentException("Currency code must be a 3-letter ISO 4217 code.", nameof(currencyCode))
            : normalized;
    }

    private static string? ValidateInstitutionName(string? institutionName)
    {
        if (string.IsNullOrWhiteSpace(institutionName))
        {
            return null;
        }

        var trimmed = institutionName.Trim();
        return trimmed.Length > 100 ? throw new ArgumentException("Institution name must be 100 characters or fewer.", nameof(institutionName)) : trimmed;
    }
}
