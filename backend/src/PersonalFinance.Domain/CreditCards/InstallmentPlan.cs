using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.CreditCards;

public sealed class InstallmentPlan : AuditableEntity
{
    private readonly List<InstallmentScheduleItem> _scheduleItems = [];

    private InstallmentPlan() { }

    private InstallmentPlan(Guid id, Guid userId, Guid creditCardAccountId, string merchant, string? description, DateOnly purchaseDate, decimal originalAmount, int installmentCount, DateOnly firstInstallmentDate, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Installment plan id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        CreditCardAccountId = creditCardAccountId == Guid.Empty ? throw new ArgumentException("Credit card account id is required.", nameof(creditCardAccountId)) : creditCardAccountId;
        Merchant = ValidateRequired(merchant, 150, nameof(merchant));
        Description = ValidateDescription(description);
        PurchaseDate = purchaseDate;
        OriginalAmount = originalAmount <= 0 ? throw new ArgumentOutOfRangeException(nameof(originalAmount), "Original amount must be greater than zero.") : decimal.Round(originalAmount, 2);
        InstallmentCount = installmentCount <= 0 ? throw new ArgumentOutOfRangeException(nameof(installmentCount), "Installment count must be greater than zero.") : installmentCount;
        FirstInstallmentDate = firstInstallmentDate;
        Status = InstallmentPlanStatus.Pending;
        SetCreated(utcNow);
        BuildSchedule(utcNow);
    }

    public Guid UserId { get; private set; }
    public Guid CreditCardAccountId { get; private set; }
    public string Merchant { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly PurchaseDate { get; private set; }
    public decimal OriginalAmount { get; private set; }
    public int InstallmentCount { get; private set; }
    public decimal InstallmentAmount { get; private set; }
    public DateOnly FirstInstallmentDate { get; private set; }
    public InstallmentPlanStatus Status { get; private set; }
    public IReadOnlyCollection<InstallmentScheduleItem> ScheduleItems => _scheduleItems.AsReadOnly();

    public static InstallmentPlan Create(Guid userId, Guid creditCardAccountId, string merchant, string? description, DateOnly purchaseDate, decimal originalAmount, int installmentCount, DateOnly firstInstallmentDate, DateTimeOffset utcNow)
    {
        return new InstallmentPlan(Guid.NewGuid(), userId, creditCardAccountId, merchant, description, purchaseDate, originalAmount, installmentCount, firstInstallmentDate, utcNow);
    }

    public void RefreshStatus(IReadOnlyCollection<InstallmentScheduleItem> scheduleItems, DateTimeOffset utcNow)
    {
        if (Status == InstallmentPlanStatus.Cancelled) return;
        if (scheduleItems.All(item => item.Status == InstallmentScheduleItemStatus.Posted))
        {
            Status = InstallmentPlanStatus.Completed;
        }
        else if (scheduleItems.Any(item => item.Status == InstallmentScheduleItemStatus.Posted))
        {
            Status = InstallmentPlanStatus.Active;
        }
        else
        {
            Status = InstallmentPlanStatus.Pending;
        }

        Touch(utcNow);
    }

    private void BuildSchedule(DateTimeOffset utcNow)
    {
        var baseAmount = Math.Floor(OriginalAmount / InstallmentCount * 100m) / 100m;
        InstallmentAmount = baseAmount;
        var assigned = 0m;
        for (var i = 1; i <= InstallmentCount; i++)
        {
            var amount = i == InstallmentCount ? OriginalAmount - assigned : baseAmount;
            assigned += amount;
            _scheduleItems.Add(InstallmentScheduleItem.Create(Id, i, FirstInstallmentDate.AddMonths(i - 1), amount, utcNow));
        }
    }

    private static string ValidateRequired(string value, int maxLength, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{paramName} is required.", paramName);
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? throw new ArgumentException($"{paramName} must be {maxLength} characters or fewer.", paramName) : trimmed;
    }

    private static string? ValidateDescription(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length > 500 ? throw new ArgumentException("Description must be 500 characters or fewer.", nameof(value)) : trimmed;
    }
}

public enum InstallmentPlanStatus
{
    Pending,
    Active,
    Completed,
    Cancelled
}
