namespace PersonalFinance.Domain.Common;

public abstract class AuditableEntity : Entity
{
    public DateTimeOffset CreatedAtUtc { get; protected set; }
    public DateTimeOffset UpdatedAtUtc { get; protected set; }

    protected void SetCreated(DateTimeOffset utcNow)
    {
        CreatedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public void Touch(DateTimeOffset utcNow)
    {
        UpdatedAtUtc = utcNow;
    }
}
