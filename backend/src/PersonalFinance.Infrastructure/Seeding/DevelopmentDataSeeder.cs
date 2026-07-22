using Microsoft.Extensions.Options;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.Recurring;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Infrastructure.Seeding;

public sealed class DevelopmentDataSeeder
{
    private const string Currency = "TWD";
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly DevelopmentSeedOptions _options;

    public DevelopmentDataSeeder(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IDateTimeProvider dateTimeProvider,
        IOptions<DevelopmentSeedOptions> options)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _dateTimeProvider = dateTimeProvider;
        _options = options.Value;
    }

    public async Task<DevelopmentSeedReport> SeedAsync(DevelopmentSeedRunOptions runOptions, CancellationToken cancellationToken)
    {
        var report = new DevelopmentSeedReport(runOptions.DryRun);
        if (!_options.Enabled)
        {
            report.Disabled("DevelopmentSeed", "DevelopmentSeed:Enabled is false.");
            return report;
        }

        if (string.IsNullOrWhiteSpace(_options.Email)) report.Missing("DevelopmentSeed:Email", "Set DevelopmentSeed:Email or PFOS_SEED_EMAIL.");
        if (string.IsNullOrWhiteSpace(_options.Password)) report.Missing("DevelopmentSeed:Password", "Set DevelopmentSeed:Password or PFOS_SEED_PASSWORD.");
        if (report.HasMissingConfiguration) return report;

        var utcNow = _dateTimeProvider.UtcNow;
        var user = EnsureUser(_options.Email!, _options.Password!, _options.DisplayName, utcNow, report, runOptions.DryRun);
        if (user is null) return report;

        var accounts = EnsureAccounts(user.Id, utcNow, report, runOptions.DryRun);
        var categories = EnsureCategories(user.Id, utcNow, report, runOptions.DryRun);
        var cards = EnsureCreditCards(user.Id, accounts, utcNow, report, runOptions.DryRun);
        EnsureOpeningBalances(user.Id, accounts, new DateOnly(2026, 7, 1), utcNow, report, runOptions.DryRun);
        EnsureRecurringTemplates(user.Id, accounts, categories, cards, utcNow, report, runOptions.DryRun);
        EnsureInstallmentPlans(user.Id, cards, utcNow, report, runOptions.DryRun);

        report.Disabled("Travel transaction: Airfare", "Missing transaction date and credit card/account. Configure separately before importing.");
        report.Disabled("Travel transaction: Booking.com hotel", "Missing transaction date and credit card/account. Configure separately before importing.");
        report.Disabled("Installment plan: iPhone 17", "Missing purchase date and credit card. Kept out of executable seed data.");

        if (!runOptions.DryRun)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return report;
    }

    private User? EnsureUser(string email, string password, string displayName, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var normalizedEmail = User.NormalizeEmail(email);
        var existing = _db.Users.FirstOrDefault(user => user.NormalizedEmail == normalizedEmail);
        if (existing is not null)
        {
            report.Skipped("User", email);
            return existing;
        }

        report.Created("User", email);
        var user = User.Create(email, _passwordHasher.Hash(password), displayName, utcNow);
        if (!dryRun)
        {
            _db.AddUser(user);
        }

        return user;
    }

    private Dictionary<string, Account> EnsureAccounts(Guid userId, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var definitions = new[]
        {
            new AccountDefinition("Richart", AccountType.Checking, "Richart", 0, 20_932m),
            new AccountDefinition("玉山銀行", AccountType.Checking, "玉山銀行", 1, 7_000m),
            new AccountDefinition("現金", AccountType.Cash, null, 2, 2_000m),
            new AccountDefinition("旅遊基金", AccountType.Savings, null, 3, 0m),
            new AccountDefinition("Richart GoGo", AccountType.CreditCard, "Richart", 4, 0m),
            new AccountDefinition("玉山 Pi 拍錢包", AccountType.CreditCard, "玉山銀行", 5, 0m)
        };

        var result = new Dictionary<string, Account>(StringComparer.OrdinalIgnoreCase);
        foreach (var definition in definitions)
        {
            var existing = _db.Accounts.FirstOrDefault(account => account.UserId == userId && account.Name == definition.Name);
            if (existing is not null)
            {
                report.Skipped("Account", definition.Name);
                result[definition.Name] = existing;
                continue;
            }

            report.Created("Account", definition.Name);
            var account = Account.Create(userId, definition.Name, definition.Type, Currency, definition.InstitutionName, definition.DisplayOrder, utcNow);
            if (!dryRun)
            {
                _db.AddAccount(account);
            }

            result[definition.Name] = account;
        }

        return result;
    }

    private Dictionary<string, Category> EnsureCategories(Guid userId, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var result = new Dictionary<string, Category>(StringComparer.OrdinalIgnoreCase);
        EnsureCategory(userId, "薪資", CategoryType.Income, null, "wallet", 0, utcNow, report, dryRun, result);
        EnsureCategory(userId, "其他收入", CategoryType.Income, null, "circle-plus", 1, utcNow, report, dryRun, result);

        var daily = EnsureCategory(userId, "日常", CategoryType.Expense, null, "shopping-bag", 0, utcNow, report, dryRun, result);
        EnsureCategory(userId, "餐飲", CategoryType.Expense, daily?.Id, "utensils", 1, utcNow, report, dryRun, result);
        EnsureCategory(userId, "交通", CategoryType.Expense, daily?.Id, "train", 2, utcNow, report, dryRun, result);
        EnsureCategory(userId, "生活用品", CategoryType.Expense, daily?.Id, "shopping-cart", 3, utcNow, report, dryRun, result);
        EnsureCategory(userId, "娛樂", CategoryType.Expense, daily?.Id, "ticket", 4, utcNow, report, dryRun, result);

        EnsureCategory(userId, "訂閱", CategoryType.Expense, null, "repeat", 5, utcNow, report, dryRun, result);
        EnsureCategory(userId, "卡費", CategoryType.Expense, null, "credit-card", 6, utcNow, report, dryRun, result);
        EnsureCategory(userId, "電子產品", CategoryType.Expense, null, "monitor-smartphone", 7, utcNow, report, dryRun, result);

        var travel = EnsureCategory(userId, "旅遊", CategoryType.Expense, null, "plane", 8, utcNow, report, dryRun, result);
        EnsureCategory(userId, "機票", CategoryType.Expense, travel?.Id, "plane-takeoff", 9, utcNow, report, dryRun, result);
        EnsureCategory(userId, "住宿", CategoryType.Expense, travel?.Id, "bed", 10, utcNow, report, dryRun, result);
        EnsureCategory(userId, "旅遊交通", CategoryType.Expense, travel?.Id, "route", 11, utcNow, report, dryRun, result);
        EnsureCategory(userId, "旅遊餐飲", CategoryType.Expense, travel?.Id, "soup", 12, utcNow, report, dryRun, result);
        EnsureCategory(userId, "門票", CategoryType.Expense, travel?.Id, "landmark", 13, utcNow, report, dryRun, result);
        EnsureCategory(userId, "保險", CategoryType.Expense, travel?.Id, "shield-check", 14, utcNow, report, dryRun, result);
        EnsureCategory(userId, "旅遊其他", CategoryType.Expense, travel?.Id, "map", 15, utcNow, report, dryRun, result);

        return result;
    }

    private Category? EnsureCategory(Guid userId, string name, CategoryType type, Guid? parentCategoryId, string? icon, int displayOrder, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun, Dictionary<string, Category> categories)
    {
        var normalizedName = Category.NormalizeName(name);
        var existing = _db.Categories.FirstOrDefault(category => category.UserId == userId && category.Type == type && category.ParentCategoryId == parentCategoryId && category.NormalizedName == normalizedName);
        if (existing is not null)
        {
            report.Skipped("Category", name);
            categories[name] = existing;
            return existing;
        }

        report.Created("Category", name);
        var category = Category.Create(userId, name, type, parentCategoryId, icon, displayOrder, utcNow);
        if (!dryRun)
        {
            _db.AddCategory(category);
        }

        categories[name] = category;
        return category;
    }

    private Dictionary<string, Account> EnsureCreditCards(Guid userId, IReadOnlyDictionary<string, Account> accounts, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var definitions = new[]
        {
            new CreditCardDefinition("Richart GoGo", "Richart", "Richart GoGo", 200_000m, 17, 3, "Richart"),
            new CreditCardDefinition("玉山 Pi 拍錢包", "玉山銀行", "玉山 Pi 拍錢包", 200_000m, 7, 22, "玉山銀行")
        };

        var result = new Dictionary<string, Account>(StringComparer.OrdinalIgnoreCase);
        foreach (var definition in definitions)
        {
            if (!accounts.TryGetValue(definition.AccountName, out var account))
            {
                report.Missing($"CreditCard:{definition.CardName}", "Credit card account was not available.");
                continue;
            }

            result[definition.CardName] = account;
            if (_db.CreditCardAccounts.Any(card => card.UserId == userId && card.AccountId == account.Id))
            {
                report.Skipped("CreditCard", definition.CardName);
                continue;
            }

            var paymentAccountId = accounts.TryGetValue(definition.PaymentAccountName, out var paymentAccount) ? paymentAccount.Id : (Guid?)null;
            report.Created("CreditCard", definition.CardName);
            if (!dryRun)
            {
                _db.AddCreditCardAccount(CreditCardAccount.Create(userId, account.Id, definition.IssuerName, definition.CardName, null, definition.CreditLimit, definition.StatementClosingDay, definition.PaymentDueDay, paymentAccountId, utcNow));
            }
        }

        return result;
    }

    private void EnsureOpeningBalances(Guid userId, IReadOnlyDictionary<string, Account> accounts, DateOnly date, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var balances = new[]
        {
            new OpeningBalanceDefinition("Richart", 20_932m),
            new OpeningBalanceDefinition("玉山銀行", 7_000m),
            new OpeningBalanceDefinition("現金", 2_000m)
        };

        foreach (var balance in balances)
        {
            if (!accounts.TryGetValue(balance.AccountName, out var account))
            {
                report.Missing($"OpeningBalance:{balance.AccountName}", "Account was not available.");
                continue;
            }

            var openingIds = _db.Transactions
                .Where(transaction => transaction.UserId == userId && transaction.Type == TransactionType.OpeningBalance && transaction.Status == TransactionStatus.Posted)
                .Select(transaction => transaction.Id)
                .ToArray();
            if (_db.TransactionEntries.Any(entry => entry.AccountId == account.Id && openingIds.Contains(entry.TransactionId)))
            {
                report.Skipped("OpeningBalance", balance.AccountName);
                continue;
            }

            report.Created("OpeningBalance", $"{balance.AccountName} {balance.Amount:N0}");
            if (!dryRun)
            {
                _db.AddTransaction(Transaction.CreateOpeningBalance(userId, account.Id, balance.Amount, date, "Development personal seed opening balance", utcNow));
            }
        }

        report.Skipped("OpeningBalance", "旅遊基金 0 (zero opening balance is intentionally not posted)");
    }

    private void EnsureRecurringTemplates(Guid userId, IReadOnlyDictionary<string, Account> accounts, IReadOnlyDictionary<string, Category> categories, IReadOnlyDictionary<string, Account> cards, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var startDate = new DateOnly(2026, 7, 1);
        var definitions = new[]
        {
            new RecurringDefinition("薪資入帳", TransactionType.Income, 46_213m, "Richart", null, "薪資", null, "薪資", 5),
            new RecurringDefinition("ChatGPT Plus", TransactionType.CreditCardPurchase, 699m, "Richart GoGo", null, "訂閱", "OpenAI", "ChatGPT Plus", 1),
            new RecurringDefinition("iCloud+", TransactionType.CreditCardPurchase, 200m, "Richart GoGo", null, "訂閱", "Apple", "iCloud+", 1),
            new RecurringDefinition("影音串流", TransactionType.CreditCardPurchase, 699m, "Richart GoGo", null, "訂閱", "Streaming", "影音訂閱", 1),
            new RecurringDefinition("娛樂月費", TransactionType.CreditCardPurchase, 490m, "Richart GoGo", null, "娛樂", "Entertainment", "娛樂月費", 1),
            new RecurringDefinition("玉山卡費", TransactionType.CreditCardPayment, 3_045m, "玉山銀行", "玉山 Pi 拍錢包", null, "玉山銀行", "信用卡自動扣繳", 22),
            new RecurringDefinition("Richart 卡費", TransactionType.CreditCardPayment, 495m, "Richart", "Richart GoGo", null, "Richart", "信用卡自動扣繳", 3)
        };

        foreach (var definition in definitions)
        {
            if (_db.RecurringTransactionTemplates.Any(template => template.UserId == userId && template.Name == definition.Name))
            {
                report.Skipped("RecurringTemplate", definition.Name);
                continue;
            }

            var source = ResolveAccount(definition.SourceAccountName, accounts, cards);
            var destination = ResolveAccount(definition.DestinationAccountName, accounts, cards);
            var category = definition.CategoryName is null ? null : categories.GetValueOrDefault(definition.CategoryName);
            if (source is null || definition.DestinationAccountName is not null && destination is null || definition.CategoryName is not null && category is null)
            {
                report.Missing($"RecurringTemplate:{definition.Name}", "Source, destination, or category was not available.");
                continue;
            }

            report.Created("RecurringTemplate", definition.Name);
            if (!dryRun)
            {
                _db.AddRecurringTransactionTemplate(RecurringTransactionTemplate.Create(userId, definition.Name, definition.TransactionType, definition.Amount, Currency, source.Id, destination?.Id, category?.Id, definition.Merchant, definition.Description, null, RecurringFrequency.Monthly, 1, definition.DayOfMonth, null, startDate, null, utcNow));
            }
        }
    }

    private void EnsureInstallmentPlans(Guid userId, IReadOnlyDictionary<string, Account> cards, DateTimeOffset utcNow, DevelopmentSeedReport report, bool dryRun)
    {
        var definitions = new[]
        {
            new InstallmentDefinition("Nintendo Switch 2", "Nintendo Switch 2", "Richart GoGo", new DateOnly(2026, 3, 20), 68_672m, 12, new DateOnly(2026, 4, 1)),
            new InstallmentDefinition("Samsung 裝置", "Samsung 裝置", "玉山 Pi 拍錢包", new DateOnly(2026, 2, 20), 29_892m, 12, new DateOnly(2026, 3, 1))
        };

        foreach (var definition in definitions)
        {
            if (!cards.TryGetValue(definition.CreditCardName, out var creditCardAccount))
            {
                report.Missing($"InstallmentPlan:{definition.Merchant}", "Credit card account was not available.");
                continue;
            }

            if (_db.InstallmentPlans.Any(plan => plan.UserId == userId && plan.Merchant == definition.Merchant && plan.OriginalAmount == definition.OriginalAmount && plan.PurchaseDate == definition.PurchaseDate))
            {
                report.Skipped("InstallmentPlan", definition.Merchant);
                continue;
            }

            report.Created("InstallmentPlan", definition.Merchant);
            if (!dryRun)
            {
                _db.AddInstallmentPlan(InstallmentPlan.Create(userId, creditCardAccount.Id, definition.Merchant, definition.Description, definition.PurchaseDate, definition.OriginalAmount, definition.InstallmentCount, definition.FirstInstallmentDate, utcNow));
            }
        }
    }

    private static Account? ResolveAccount(string? accountName, IReadOnlyDictionary<string, Account> accounts, IReadOnlyDictionary<string, Account> cards)
    {
        if (accountName is null) return null;
        return accounts.TryGetValue(accountName, out var account) ? account : cards.GetValueOrDefault(accountName);
    }

    private sealed record AccountDefinition(string Name, AccountType Type, string? InstitutionName, int DisplayOrder, decimal OpeningBalance);
    private sealed record CreditCardDefinition(string AccountName, string IssuerName, string CardName, decimal CreditLimit, int StatementClosingDay, int PaymentDueDay, string PaymentAccountName);
    private sealed record OpeningBalanceDefinition(string AccountName, decimal Amount);
    private sealed record RecurringDefinition(string Name, TransactionType TransactionType, decimal Amount, string SourceAccountName, string? DestinationAccountName, string? CategoryName, string? Merchant, string? Description, int DayOfMonth);
    private sealed record InstallmentDefinition(string Merchant, string Description, string CreditCardName, DateOnly PurchaseDate, decimal OriginalAmount, int InstallmentCount, DateOnly FirstInstallmentDate);
}

public sealed class DevelopmentSeedReport
{
    private readonly List<string> _lines = [];

    public DevelopmentSeedReport(bool dryRun)
    {
        DryRun = dryRun;
        _lines.Add($"Mode: {(dryRun ? "dry-run" : "write")}");
    }

    public bool DryRun { get; }
    public bool HasMissingConfiguration { get; private set; }

    public void Created(string kind, string name) => _lines.Add($"CREATE {kind}: {name}");
    public void Skipped(string kind, string name) => _lines.Add($"SKIP {kind}: {name}");
    public void Disabled(string kind, string reason) => _lines.Add($"DISABLED {kind}: {reason}");
    public void Missing(string kind, string reason)
    {
        HasMissingConfiguration = true;
        _lines.Add($"MISSING {kind}: {reason}");
    }

    public override string ToString() => string.Join(Environment.NewLine, _lines);
}

