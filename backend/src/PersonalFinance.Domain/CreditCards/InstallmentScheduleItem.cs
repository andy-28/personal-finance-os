using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.CreditCards;

public sealed class InstallmentScheduleItem : Entity
{
    private InstallmentScheduleItem() { }

    private InstallmentScheduleItem(Guid id, Guid installmentPlanId, int installmentNumber, DateOnly dueDate, decimal amount, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Schedule item id is required.", nameof(id)) : id;
        InstallmentPlanId = installmentPlanId == Guid.Empty ? throw new ArgumentException("Installment plan id is required.", nameof(installmentPlanId)) : installmentPlanId;
        InstallmentNumber = installmentNumber <= 0 ? throw new ArgumentOutOfRangeException(nameof(installmentNumber), "Installment number must be greater than zero.") : installmentNumber;
        DueDate = dueDate;
        Amount = amount <= 0 ? throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.") : decimal.Round(amount, 2);
        Status = InstallmentScheduleItemStatus.Pending;
        CreatedAtUtc = utcNow;
    }

    public Guid InstallmentPlanId { get; private set; }
    public int InstallmentNumber { get; private set; }
    public DateOnly DueDate { get; private set; }
    public decimal Amount { get; private set; }
    public Guid? TransactionId { get; private set; }
    public InstallmentScheduleItemStatus Status { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public static InstallmentScheduleItem Create(Guid installmentPlanId, int installmentNumber, DateOnly dueDate, decimal amount, DateTimeOffset utcNow)
    {
        return new InstallmentScheduleItem(Guid.NewGuid(), installmentPlanId, installmentNumber, dueDate, amount, utcNow);
    }

    public void MarkPosted(Guid transactionId)
    {
        if (Status != InstallmentScheduleItemStatus.Pending) throw new InvalidOperationException("Only pending installment schedule items can be posted.");
        TransactionId = transactionId == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(transactionId)) : transactionId;
        Status = InstallmentScheduleItemStatus.Posted;
    }

    public void Cancel()
    {
        if (Status == InstallmentScheduleItemStatus.Posted) throw new InvalidOperationException("Posted installment schedule items cannot be cancelled.");
        Status = InstallmentScheduleItemStatus.Cancelled;
    }
}

public enum InstallmentScheduleItemStatus
{
    Pending,
    Posted,
    Paid,
    Cancelled
}
