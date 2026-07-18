using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Users;

public sealed class RefreshToken : Entity
{
    private RefreshToken() { }

    private RefreshToken(Guid id, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, DateTimeOffset utcNow)
    {
        Id = id;
        UserId = userId;
        TokenHash = string.IsNullOrWhiteSpace(tokenHash) ? throw new ArgumentException("Token hash is required.", nameof(tokenHash)) : tokenHash;
        ExpiresAtUtc = expiresAtUtc;
        CreatedAtUtc = utcNow;
    }

    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }
    public User? User { get; private set; }

    public bool IsExpired(DateTimeOffset utcNow) => utcNow >= ExpiresAtUtc;
    public bool IsRevoked => RevokedAtUtc.HasValue;
    public bool IsActive(DateTimeOffset utcNow) => !IsRevoked && !IsExpired(utcNow);

    public static RefreshToken Create(Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, DateTimeOffset utcNow)
    {
        return new RefreshToken(Guid.NewGuid(), userId, tokenHash, expiresAtUtc, utcNow);
    }

    public void Revoke(DateTimeOffset utcNow, Guid? replacedByTokenId = null)
    {
        if (RevokedAtUtc.HasValue)
        {
            return;
        }

        RevokedAtUtc = utcNow;
        ReplacedByTokenId = replacedByTokenId;
    }
}
