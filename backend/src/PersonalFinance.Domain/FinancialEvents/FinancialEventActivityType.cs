namespace PersonalFinance.Domain.FinancialEvents;

public enum FinancialEventActivityType
{
    Created,
    Updated,
    StatusChanged,
    ChecklistAdded,
    ChecklistCompleted,
    ChecklistReopened,
    CaptureLinked,
    CaptureUnlinked,
    TransactionLinked,
    TransactionUnlinked
}
