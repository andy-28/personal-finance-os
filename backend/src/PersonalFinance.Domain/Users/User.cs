using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Users;

public sealed class User : AuditableEntity
{
    private readonly List<RefreshToken> _refreshTokens = [];

    private User() { }

    private User(Guid id, string email, string passwordHash, string displayName, DateTimeOffset utcNow)
    {
        Id = id;
        Email = NormalizeEmailInput(email);
        NormalizedEmail = NormalizeEmail(Email);
        PasswordHash = string.IsNullOrWhiteSpace(passwordHash) ? throw new ArgumentException("Password hash is required.", nameof(passwordHash)) : passwordHash;
        DisplayName = ValidateDisplayName(displayName);
        SetCreated(utcNow);
    }

    public string Email { get; private set; } = string.Empty;
    public string NormalizedEmail { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens;

    public static User Create(string email, string passwordHash, string displayName, DateTimeOffset utcNow)
    {
        return new User(Guid.NewGuid(), email, passwordHash, displayName, utcNow);
    }

    public RefreshToken AddRefreshToken(string tokenHash, DateTimeOffset expiresAtUtc, DateTimeOffset utcNow)
    {
        var token = RefreshToken.Create(Id, tokenHash, expiresAtUtc, utcNow);
        _refreshTokens.Add(token);
        Touch(utcNow);
        return token;
    }

    public static string NormalizeEmail(string email) => NormalizeEmailInput(email).ToUpperInvariant();

    private static string NormalizeEmailInput(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required.", nameof(email));
        }

        var trimmed = email.Trim();
        if (!trimmed.Contains('@', StringComparison.Ordinal) || trimmed.Length > 254)
        {
            throw new ArgumentException("Email is invalid.", nameof(email));
        }

        return trimmed;
    }

    private static string ValidateDisplayName(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ArgumentException("Display name is required.", nameof(displayName));
        }

        var trimmed = displayName.Trim();
        return trimmed.Length > 100 ? throw new ArgumentException("Display name must be 100 characters or fewer.", nameof(displayName)) : trimmed;
    }
}
