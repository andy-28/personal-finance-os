namespace PersonalFinance.Domain.FinancialEvents;

public enum FinancialEventStatus
{
    Planned,
    Pending,
    Confirmed,
    Completed,
    Cancelled
}
