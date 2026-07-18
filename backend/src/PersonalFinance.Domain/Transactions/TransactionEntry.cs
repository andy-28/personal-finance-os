using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Transactions;

public sealed class TransactionEntry : Entity
{
    private TransactionEntry() { }

    internal TransactionEntry(Guid id, Guid transactionId, Guid accountId, decimal amount, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Entry id is required.", nameof(id)) : id;
        TransactionId = transactionId == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(transactionId)) : transactionId;
        AccountId = accountId == Guid.Empty ? throw new ArgumentException("Account id is required.", nameof(accountId)) : accountId;
        Amount = amount == 0 ? throw new ArgumentException("Entry amount cannot be zero.", nameof(amount)) : decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        CreatedAtUtc = utcNow;
    }

    public Guid TransactionId { get; private set; }
    public Guid AccountId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public Transaction? Transaction { get; private set; }
    public Account? Account { get; private set; }
}
