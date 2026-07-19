using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Transactions;

public sealed class Transaction : Entity
{
    private readonly List<TransactionEntry> _entries = [];

    private Transaction() { }

    private Transaction(Guid id, Guid userId, TransactionType type, DateOnly transactionDate, Guid? categoryId, string? payee, string? note, DateTimeOffset utcNow)
    {
        Id = id == Guid.Empty ? throw new ArgumentException("Transaction id is required.", nameof(id)) : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Type = type;
        Status = TransactionStatus.Posted;
        TransactionDate = transactionDate;
        CategoryId = categoryId;
        Payee = ValidatePayee(payee);
        Note = ValidateNote(note);
        CreatedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    public Guid UserId { get; private set; }
    public TransactionType Type { get; private set; }
    public TransactionStatus Status { get; private set; }
    public DateOnly TransactionDate { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string? Payee { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }
    public DateTimeOffset? VoidedAtUtc { get; private set; }
    public IReadOnlyCollection<TransactionEntry> Entries => _entries.AsReadOnly();

    public static Transaction CreateIncome(Guid userId, Guid accountId, Guid categoryId, decimal amount, DateOnly transactionDate, string? payee, string? note, DateTimeOffset utcNow)
    {
        EnsurePositive(amount);
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.Income, transactionDate, categoryId, payee, note, utcNow);
        transaction.AddEntry(accountId, amount, utcNow);
        return transaction;
    }

    public static Transaction CreateExpense(Guid userId, Guid accountId, AccountType accountType, Guid categoryId, decimal amount, DateOnly transactionDate, string? payee, string? note, DateTimeOffset utcNow)
    {
        EnsurePositive(amount);
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.Expense, transactionDate, categoryId, payee, note, utcNow);
        transaction.AddEntry(accountId, IsLiability(accountType) ? amount : -amount, utcNow);
        return transaction;
    }

    public static Transaction CreateTransfer(Guid userId, Guid fromAccountId, Guid toAccountId, decimal amount, DateOnly transactionDate, string? note, DateTimeOffset utcNow)
    {
        EnsurePositive(amount);
        if (fromAccountId == toAccountId) throw new ArgumentException("Transfer accounts must be different.", nameof(toAccountId));
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.Transfer, transactionDate, null, null, note, utcNow);
        transaction.AddEntry(fromAccountId, -amount, utcNow);
        transaction.AddEntry(toAccountId, amount, utcNow);
        return transaction;
    }

    public static Transaction CreateOpeningBalance(Guid userId, Guid accountId, decimal amount, DateOnly transactionDate, string? note, DateTimeOffset utcNow)
    {
        if (amount == 0) throw new ArgumentException("Opening balance amount cannot be zero.", nameof(amount));
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.OpeningBalance, transactionDate, null, null, note, utcNow);
        transaction.AddEntry(accountId, amount, utcNow);
        return transaction;
    }

    public static Transaction CreateCreditCardPurchase(Guid userId, Guid creditCardAccountId, Guid categoryId, decimal amount, DateOnly purchaseDate, string? merchant, string? note, DateTimeOffset utcNow)
    {
        EnsurePositive(amount);
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.CreditCardPurchase, purchaseDate, categoryId, merchant, note, utcNow);
        transaction.AddEntry(creditCardAccountId, amount, utcNow);
        return transaction;
    }

    public static Transaction CreateCreditCardRefund(Guid userId, Guid creditCardAccountId, decimal amount, DateOnly refundDate, string? note, DateTimeOffset utcNow)
    {
        EnsurePositive(amount);
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.CreditCardRefund, refundDate, null, null, note, utcNow);
        transaction.AddEntry(creditCardAccountId, -amount, utcNow);
        return transaction;
    }

    public static Transaction CreateCreditCardPayment(Guid userId, Guid paymentAccountId, Guid creditCardAccountId, decimal amount, DateOnly paymentDate, string? note, DateTimeOffset utcNow)
    {
        EnsurePositive(amount);
        if (paymentAccountId == creditCardAccountId) throw new ArgumentException("Payment accounts must be different.", nameof(creditCardAccountId));
        var transaction = new Transaction(Guid.NewGuid(), userId, TransactionType.CreditCardPayment, paymentDate, null, null, note, utcNow);
        transaction.AddEntry(paymentAccountId, -amount, utcNow);
        transaction.AddEntry(creditCardAccountId, -amount, utcNow);
        return transaction;
    }

    public void UpdateIncome(Guid accountId, Guid categoryId, decimal amount, DateOnly transactionDate, string? payee, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.Income);
        EnsurePositive(amount);
        ReplaceCore(transactionDate, categoryId, payee, note, utcNow);
        ReplaceEntries([new PendingEntry(accountId, amount)], utcNow);
    }

    public void UpdateExpense(Guid accountId, AccountType accountType, Guid categoryId, decimal amount, DateOnly transactionDate, string? payee, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.Expense);
        EnsurePositive(amount);
        ReplaceCore(transactionDate, categoryId, payee, note, utcNow);
        ReplaceEntries([new PendingEntry(accountId, IsLiability(accountType) ? amount : -amount)], utcNow);
    }

    public void UpdateTransfer(Guid fromAccountId, Guid toAccountId, decimal amount, DateOnly transactionDate, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.Transfer);
        EnsurePositive(amount);
        if (fromAccountId == toAccountId) throw new ArgumentException("Transfer accounts must be different.", nameof(toAccountId));
        ReplaceCore(transactionDate, null, null, note, utcNow);
        ReplaceEntries([new PendingEntry(fromAccountId, -amount), new PendingEntry(toAccountId, amount)], utcNow);
    }

    public void UpdateOpeningBalance(Guid accountId, decimal amount, DateOnly transactionDate, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.OpeningBalance);
        if (amount == 0) throw new ArgumentException("Opening balance amount cannot be zero.", nameof(amount));
        ReplaceCore(transactionDate, null, null, note, utcNow);
        ReplaceEntries([new PendingEntry(accountId, amount)], utcNow);
    }

    public void UpdateCreditCardPurchase(Guid creditCardAccountId, Guid categoryId, decimal amount, DateOnly purchaseDate, string? merchant, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.CreditCardPurchase);
        EnsurePositive(amount);
        ReplaceCore(purchaseDate, categoryId, merchant, note, utcNow);
        ReplaceEntries([new PendingEntry(creditCardAccountId, amount)], utcNow);
    }

    public void UpdateCreditCardRefund(Guid creditCardAccountId, decimal amount, DateOnly refundDate, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.CreditCardRefund);
        EnsurePositive(amount);
        ReplaceCore(refundDate, null, null, note, utcNow);
        ReplaceEntries([new PendingEntry(creditCardAccountId, -amount)], utcNow);
    }

    public void UpdateCreditCardPayment(Guid paymentAccountId, Guid creditCardAccountId, decimal amount, DateOnly paymentDate, string? note, DateTimeOffset utcNow)
    {
        EnsureCanUpdate(TransactionType.CreditCardPayment);
        EnsurePositive(amount);
        if (paymentAccountId == creditCardAccountId) throw new ArgumentException("Payment accounts must be different.", nameof(creditCardAccountId));
        ReplaceCore(paymentDate, null, null, note, utcNow);
        ReplaceEntries([new PendingEntry(paymentAccountId, -amount), new PendingEntry(creditCardAccountId, -amount)], utcNow);
    }

    public void Void(DateTimeOffset utcNow)
    {
        if (Status == TransactionStatus.Voided)
        {
            return;
        }

        Status = TransactionStatus.Voided;
        VoidedAtUtc = utcNow;
        UpdatedAtUtc = utcNow;
    }

    private void ReplaceCore(DateOnly transactionDate, Guid? categoryId, string? payee, string? note, DateTimeOffset utcNow)
    {
        TransactionDate = transactionDate;
        CategoryId = categoryId;
        Payee = ValidatePayee(payee);
        Note = ValidateNote(note);
        UpdatedAtUtc = utcNow;
    }

    private void ReplaceEntries(IReadOnlyList<PendingEntry> entries, DateTimeOffset utcNow)
    {
        _entries.Clear();
        foreach (var entry in entries)
        {
            AddEntry(entry.AccountId, entry.Amount, utcNow);
        }
    }

    private void AddEntry(Guid accountId, decimal amount, DateTimeOffset utcNow)
    {
        if (_entries.Any(entry => entry.AccountId == accountId)) throw new InvalidOperationException("A transaction can only contain one entry per account.");
        _entries.Add(new TransactionEntry(Guid.NewGuid(), Id, accountId, amount, utcNow));
    }

    private void EnsureCanUpdate(TransactionType expectedType)
    {
        if (Status == TransactionStatus.Voided) throw new InvalidOperationException("Voided transactions cannot be updated.");
        if (Type != expectedType) throw new InvalidOperationException("Transaction type cannot be changed.");
    }

    private static void EnsurePositive(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
    }

    private static bool IsLiability(AccountType accountType) => accountType is AccountType.CreditCard or AccountType.Loan;

    private static string? ValidatePayee(string? payee)
    {
        if (string.IsNullOrWhiteSpace(payee)) return null;
        var trimmed = payee.Trim();
        return trimmed.Length > 150 ? throw new ArgumentException("Payee must be 150 characters or fewer.", nameof(payee)) : trimmed;
    }

    private static string? ValidateNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note)) return null;
        var trimmed = note.Trim();
        return trimmed.Length > 1000 ? throw new ArgumentException("Note must be 1000 characters or fewer.", nameof(note)) : trimmed;
    }

    private sealed record PendingEntry(Guid AccountId, decimal Amount);
}
