using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.TransactionCaptures;

public sealed class CaptureApiToken : Entity
{
    private CaptureApiToken() { }

    private CaptureApiToken(Guid id, Guid userId, string name, string tokenHash, DateTimeOffset utcNow)
    {
        Id = id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Name = string.IsNullOrWhiteSpace(name) ? throw new ArgumentException("Token name is required.", nameof(name)) : name.Trim();
        if (Name.Length > 100) throw new ArgumentException("Token name must be 100 characters or fewer.", nameof(name));
        TokenHash = string.IsNullOrWhiteSpace(tokenHash) ? throw new ArgumentException("Token hash is required.", nameof(tokenHash)) : tokenHash;
        CreatedAtUtc = utcNow;
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string TokenHash { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? LastUsedAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }
    public bool IsRevoked => RevokedAtUtc.HasValue;

    public static CaptureApiToken Create(Guid userId, string name, string tokenHash, DateTimeOffset utcNow) => new(Guid.NewGuid(), userId, name, tokenHash, utcNow);
    public void MarkUsed(DateTimeOffset utcNow) => LastUsedAtUtc = utcNow;
    public void Revoke(DateTimeOffset utcNow) { if (!RevokedAtUtc.HasValue) RevokedAtUtc = utcNow; }
}
