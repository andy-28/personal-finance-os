using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.StatementImports;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.StatementImports.Models;
using PersonalFinance.Application.Transactions.Models;
using PersonalFinance.Domain.Categories;
using PersonalFinance.Domain.CreditCards;
using PersonalFinance.Domain.StatementImports;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Application.StatementImports;

public sealed record ParseStatementImportCommand(Guid CreditCardAccountId, string OriginalFileName, string ContentType, long Length, Stream File, string? Password) : IRequest<Result<StatementImportBatchDto>>;
public sealed record GetStatementImportsQuery(Guid? CreditCardAccountId) : IRequest<Result<IReadOnlyList<StatementImportBatchDto>>>;
public sealed record GetStatementImportQuery(Guid BatchId) : IRequest<Result<StatementImportBatchDto>>;
public sealed record UpdateStatementImportRowCommand(Guid BatchId, Guid RowId, StatementImportRowUpdateRequest Request) : IRequest<Result<StatementImportRowDto>>;
public sealed record PostStatementImportCommand(Guid BatchId, StatementImportPostRequest Request) : IRequest<Result<StatementImportBatchDto>>;
public sealed record DiscardStatementImportCommand(Guid BatchId) : IRequest<Result>;

public sealed class ParseStatementImportCommandValidator : AbstractValidator<ParseStatementImportCommand>
{
    public ParseStatementImportCommandValidator()
    {
        RuleFor(x => x.CreditCardAccountId).NotEmpty();
        RuleFor(x => x.OriginalFileName).NotEmpty().MaximumLength(260).Must(name => name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)).WithMessage("Only PDF files are supported.");
        RuleFor(x => x.Length).GreaterThan(0).LessThanOrEqualTo(10 * 1024 * 1024).WithMessage("PDF must be 10 MB or smaller.");
    }
}

public sealed class StatementImportsHandler :
    IRequestHandler<ParseStatementImportCommand, Result<StatementImportBatchDto>>,
    IRequestHandler<GetStatementImportsQuery, Result<IReadOnlyList<StatementImportBatchDto>>>,
    IRequestHandler<GetStatementImportQuery, Result<StatementImportBatchDto>>,
    IRequestHandler<UpdateStatementImportRowCommand, Result<StatementImportRowDto>>,
    IRequestHandler<PostStatementImportCommand, Result<StatementImportBatchDto>>,
    IRequestHandler<DiscardStatementImportCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IReadOnlyList<IStatementImporter> _importers;

    public StatementImportsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider, IEnumerable<IStatementImporter> importers)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
        _importers = importers.ToArray();
    }

    public async Task<Result<StatementImportBatchDto>> Handle(ParseStatementImportCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<StatementImportBatchDto>.Failure(UnauthorizedError());
        var card = GetOwnedCard(userId.Value, request.CreditCardAccountId);
        if (card is null) return Result<StatementImportBatchDto>.Failure(NotFoundError());

        await using var buffer = new MemoryStream();
        await request.File.CopyToAsync(buffer, cancellationToken);
        if (!LooksLikePdf(buffer)) return Result<StatementImportBatchDto>.Failure(Error.Validation("File", "The uploaded file is not a valid PDF."));
        var hash = Hash(buffer);
        var existing = _db.StatementImportBatches.FirstOrDefault(batch => batch.UserId == userId.Value && batch.CreditCardAccountId == request.CreditCardAccountId && batch.FileHash == hash && batch.Status != StatementImportBatchStatus.Discarded);
        if (existing is not null) return Result<StatementImportBatchDto>.Failure(Error.Conflict("StatementImport", "This PDF has already been imported for this card."));

        var context = new StatementImportContext(request.OriginalFileName, request.ContentType);
        var importer = _importers.FirstOrDefault(candidate => candidate.CanHandle(context));
        if (importer is null) return Result<StatementImportBatchDto>.Failure(Error.Validation("File", "No statement importer supports this PDF."));

        ParsedStatement parsed;
        try
        {
            buffer.Position = 0;
            parsed = await importer.ParseAsync(buffer, request.Password, cancellationToken);
        }
        catch (Exception ex) when (ex.GetType().Name == "StatementImportParseException")
        {
            var codeProperty = ex.GetType().GetProperty("Code");
            var code = codeProperty?.GetValue(ex)?.ToString() ?? "ParserFailure";
            return Result<StatementImportBatchDto>.Failure(Error.Validation(code, ex.Message));
        }

        var utcNow = _dateTimeProvider.UtcNow;
        var batch = StatementImportBatch.Create(userId.Value, request.CreditCardAccountId, parsed.Provider, request.OriginalFileName, hash, importer.ParserVersion, utcNow);
        batch.MarkParsed(parsed.PeriodStart, parsed.PeriodEnd, parsed.PaymentDueDate, parsed.PreviousBalance, parsed.PaymentAmount, parsed.NewCharges, parsed.StatementAmount, parsed.MinimumPayment, true, utcNow);
        var rows = parsed.Rows.Select(row => ToEntity(batch.Id, request.CreditCardAccountId, row, utcNow)).ToArray();
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            _db.AddStatementImportBatch(batch);
            _db.AddStatementImportRows(rows);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result<StatementImportBatchDto>.Success(ToBatchDto(batch, rows, parsed.Warnings));
    }

    public Task<Result<IReadOnlyList<StatementImportBatchDto>>> Handle(GetStatementImportsQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<StatementImportBatchDto>>.Failure(UnauthorizedError()));
        var query = _db.StatementImportBatches.Where(batch => batch.UserId == userId.Value);
        if (request.CreditCardAccountId is { } cardId) query = query.Where(batch => batch.CreditCardAccountId == cardId);
        var batches = query.OrderByDescending(batch => batch.CreatedAtUtc).Take(20).ToArray();
        return Task.FromResult(Result<IReadOnlyList<StatementImportBatchDto>>.Success(batches.Select(batch => ToBatchDto(batch, Rows(batch.Id), [])).ToArray()));
    }

    public Task<Result<StatementImportBatchDto>> Handle(GetStatementImportQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<StatementImportBatchDto>.Failure(UnauthorizedError()));
        var batch = _db.StatementImportBatches.FirstOrDefault(candidate => candidate.Id == request.BatchId && candidate.UserId == userId.Value);
        return Task.FromResult(batch is null ? Result<StatementImportBatchDto>.Failure(Error.NotFound("StatementImport", "Import batch was not found.")) : Result<StatementImportBatchDto>.Success(ToBatchDto(batch, Rows(batch.Id), [])));
    }

    public async Task<Result<StatementImportRowDto>> Handle(UpdateStatementImportRowCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<StatementImportRowDto>.Failure(UnauthorizedError());
        var batch = _db.StatementImportBatches.FirstOrDefault(candidate => candidate.Id == request.BatchId && candidate.UserId == userId.Value);
        if (batch is null) return Result<StatementImportRowDto>.Failure(Error.NotFound("StatementImport", "Import batch was not found."));
        var row = _db.StatementImportRows.FirstOrDefault(candidate => candidate.Id == request.RowId && candidate.BatchId == batch.Id);
        if (row is null) return Result<StatementImportRowDto>.Failure(Error.NotFound("StatementImportRow", "Import row was not found."));
        if (request.Request.Amount is <= 0) return Result<StatementImportRowDto>.Failure(Error.Validation("Amount", "Amount must be greater than zero."));
        if (request.Request.CategoryId is { } categoryId && !IsOwnedExpenseCategory(userId.Value, categoryId)) return Result<StatementImportRowDto>.Failure(Error.NotFound("Category", "Expense category was not found."));

        if (request.Request.Amount.HasValue || request.Request.Type.HasValue)
        {
            var nextAmount = request.Request.Amount ?? row.Amount;
            var nextType = request.Request.Type ?? row.Type;
            var nextFingerprint = Fingerprint(batch.CreditCardAccountId, row.TransactionDate, row.PostingDate, row.NormalizedDescription, nextAmount, row.Currency);
            row.ApplyReviewEdits(request.Request.Amount, nextType, nextFingerprint);
        }
        if (request.Request.ReviewStatus == StatementImportReviewStatus.ReadyToPost && row.Type == StatementImportRowType.Unknown) return Result<StatementImportRowDto>.Failure(Error.Validation("Type", "Choose a row type before marking this row ready."));
        if (request.Request.ReviewStatus == StatementImportReviewStatus.ReadyToPost && row.Amount <= 0) return Result<StatementImportRowDto>.Failure(Error.Validation("Amount", "Amount must be greater than zero."));
        row.Review(request.Request.ReviewStatus, request.Request.CategoryId);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<StatementImportRowDto>.Success(ToRowDto(row));
    }

    public async Task<Result<StatementImportBatchDto>> Handle(PostStatementImportCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result<StatementImportBatchDto>.Failure(UnauthorizedError());
        var batch = _db.StatementImportBatches.FirstOrDefault(candidate => candidate.Id == request.BatchId && candidate.UserId == userId.Value);
        if (batch is null) return Result<StatementImportBatchDto>.Failure(Error.NotFound("StatementImport", "Import batch was not found."));
        var card = GetOwnedCard(userId.Value, batch.CreditCardAccountId);
        if (card is null) return Result<StatementImportBatchDto>.Failure(NotFoundError());
        var rows = Rows(batch.Id).Where(row => row.ReviewStatus == StatementImportReviewStatus.ReadyToPost).ToArray();
        if (rows.Length == 0) return Result<StatementImportBatchDto>.Failure(Error.Validation("Rows", "No rows are ready to post."));
        if (request.Request.DefaultCategoryId is { } defaultCategoryId && !IsOwnedExpenseCategory(userId.Value, defaultCategoryId)) return Result<StatementImportBatchDto>.Failure(Error.NotFound("Category", "Default expense category was not found."));
        var rowsMissingCategory = rows.Where(row => RequiresExpenseCategory(row.Type) && row.CategoryId is null && request.Request.DefaultCategoryId is null).ToArray();
        if (rowsMissingCategory.Length > 0) return Result<StatementImportBatchDto>.Failure(Error.Validation("DefaultCategoryId", "Choose a default expense category or assign categories to purchase, installment, fee, interest, and adjustment rows before posting."));

        await _db.ExecuteInTransactionAsync(async ct =>
        {
            foreach (var row in rows)
            {
                try { PostRow(userId.Value, card, row, request.Request.DefaultCategoryId); }
                catch (Exception ex) { row.MarkFailed(ex.Message); }
            }
            await _db.SaveChangesAsync(ct);
            ReplacePersonalBaselineStatement(userId.Value, batch);
            var refreshedRows = Rows(batch.Id);
            var hasFailuresOrPending = refreshedRows.Any(row => row.ReviewStatus is StatementImportReviewStatus.Failed or StatementImportReviewStatus.ReadyToPost or StatementImportReviewStatus.New);
            batch.MarkPosted(hasFailuresOrPending, _dateTimeProvider.UtcNow);
            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result<StatementImportBatchDto>.Success(ToBatchDto(batch, Rows(batch.Id), []));
    }

    public async Task<Result> Handle(DiscardStatementImportCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result.Failure(UnauthorizedError());
        var batch = _db.StatementImportBatches.FirstOrDefault(candidate => candidate.Id == request.BatchId && candidate.UserId == userId.Value);
        if (batch is null) return Result.Failure(Error.NotFound("StatementImport", "Import batch was not found."));
        if (_db.StatementImportRows.Any(row => row.BatchId == batch.Id && row.ReviewStatus == StatementImportReviewStatus.Posted)) return Result.Failure(Error.Conflict("StatementImport", "Posted imports cannot be discarded."));
        batch.Discard();
        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private void PostRow(Guid userId, CreditCardAccount card, StatementImportRow row, Guid? defaultCategoryId)
    {
        if (row.MatchStatus != StatementImportMatchStatus.New) throw new InvalidOperationException("Matched or duplicate rows cannot be posted.");
        if (row.TransactionDate is null) throw new InvalidOperationException("Transaction date is required.");
        var date = row.TransactionDate.Value;
        Transaction transaction;
        CreditCardTransactionMetadata metadata;
        switch (row.Type)
        {
            case StatementImportRowType.Payment:
                var paymentAccountId = card.PaymentAccountId ?? throw new InvalidOperationException("Payment account is required for payment rows.");
                transaction = Transaction.CreateCreditCardPayment(userId, paymentAccountId, card.AccountId, row.Amount, date, "Statement import", _dateTimeProvider.UtcNow);
                metadata = CreditCardTransactionMetadata.Create(userId, transaction.Id, card.AccountId, date, row.PostingDate, row.NormalizedDescription, null, _dateTimeProvider.UtcNow);
                break;
            case StatementImportRowType.Refund:
                transaction = Transaction.CreateCreditCardRefund(userId, card.AccountId, row.Amount, date, "Statement import", _dateTimeProvider.UtcNow);
                metadata = CreditCardTransactionMetadata.Create(userId, transaction.Id, card.AccountId, date, row.PostingDate, row.NormalizedDescription, null, _dateTimeProvider.UtcNow);
                break;
            case StatementImportRowType.Purchase:
            case StatementImportRowType.Installment:
            case StatementImportRowType.Fee:
            case StatementImportRowType.Interest:
            case StatementImportRowType.Adjustment:
                var categoryId = row.CategoryId ?? defaultCategoryId ?? throw new InvalidOperationException("Expense category is required.");
                if (!IsOwnedExpenseCategory(userId, categoryId)) throw new InvalidOperationException("Expense category was not found.");
                transaction = Transaction.CreateCreditCardPurchase(userId, card.AccountId, categoryId, row.Amount, date, row.NormalizedDescription, "Statement import", _dateTimeProvider.UtcNow);
                metadata = CreditCardTransactionMetadata.Create(userId, transaction.Id, card.AccountId, date, row.PostingDate, row.NormalizedDescription, null, _dateTimeProvider.UtcNow);
                break;
            default:
                throw new InvalidOperationException("Unknown rows cannot be posted.");
        }
        _db.AddTransaction(transaction);
        _db.AddCreditCardTransactionMetadata(metadata);
        row.MarkPosted(transaction.Id);
    }

    private void ReplacePersonalBaselineStatement(Guid userId, StatementImportBatch batch)
    {
        if (batch.StatementAmount is null or <= 0) return;

        var postedRows = Rows(batch.Id)
            .Where(row => row.ReviewStatus == StatementImportReviewStatus.Posted
                && row.Type != StatementImportRowType.Payment
                && row.CreatedTransactionId is not null)
            .ToArray();
        if (postedRows.Length == 0) return;

        var createdTransactionIds = postedRows.Select(row => row.CreatedTransactionId!.Value).ToArray();
        var importedCardAmount = _db.TransactionEntries
            .Where(entry => createdTransactionIds.Contains(entry.TransactionId) && entry.AccountId == batch.CreditCardAccountId)
            .Select(entry => entry.Amount)
            .ToArray()
            .Sum();
        if (Math.Abs(importedCardAmount - batch.StatementAmount.Value) > 0.01m) return;

        var candidateIds = _db.TransactionEntries
            .Where(entry => entry.AccountId == batch.CreditCardAccountId && entry.Amount == batch.StatementAmount.Value)
            .Select(entry => entry.TransactionId)
            .ToArray();
        var baseline = _db.Transactions
            .Where(transaction => transaction.UserId == userId
                && candidateIds.Contains(transaction.Id)
                && transaction.Status == TransactionStatus.Posted
                && transaction.Type == TransactionType.CreditCardPurchase
                && transaction.Note == "PersonalBaselineSeed")
            .ToArray()
            .FirstOrDefault(transaction => transaction.Payee?.Contains("statement baseline", StringComparison.OrdinalIgnoreCase) == true);

        baseline?.Void(_dateTimeProvider.UtcNow);
    }

    private StatementImportRow ToEntity(Guid batchId, Guid creditCardAccountId, ParsedStatementRow row, DateTimeOffset utcNow)
    {
        var fingerprint = Fingerprint(creditCardAccountId, row.TransactionDate, row.PostingDate, row.NormalizedDescription, row.Amount, row.Currency);
        var duplicate = _db.StatementImportRows.Any(existing => existing.Fingerprint == fingerprint && existing.ReviewStatus == StatementImportReviewStatus.Posted);
        var requiresManualReview = row.Type is StatementImportRowType.Unknown or StatementImportRowType.Payment;
        var reviewStatus = requiresManualReview || duplicate ? StatementImportReviewStatus.New : StatementImportReviewStatus.ReadyToPost;
        return StatementImportRow.Create(batchId, row.SourceRowNumber, row.TransactionDate, row.PostingDate, row.RawDescription, row.NormalizedDescription, row.Amount, row.Currency, row.ForeignAmount, row.ForeignCurrency, row.Type, row.IsInstallment, row.InstallmentCurrentNumber, row.InstallmentTotalNumber, row.RawText, fingerprint, duplicate ? StatementImportMatchStatus.PossibleDuplicate : StatementImportMatchStatus.New, reviewStatus, utcNow);
    }

    private static bool RequiresExpenseCategory(StatementImportRowType type) => type is StatementImportRowType.Purchase or StatementImportRowType.Installment or StatementImportRowType.Fee or StatementImportRowType.Interest or StatementImportRowType.Adjustment;
    private IReadOnlyList<StatementImportRow> Rows(Guid batchId) => _db.StatementImportRows.Where(row => row.BatchId == batchId).OrderBy(row => row.SourceRowNumber).ToArray();
    private CreditCardAccount? GetOwnedCard(Guid userId, Guid accountId) => _db.CreditCardAccounts.FirstOrDefault(card => card.UserId == userId && card.AccountId == accountId);
    private bool IsOwnedExpenseCategory(Guid userId, Guid categoryId) => _db.Categories.Any(category => category.Id == categoryId && category.UserId == userId && category.Type == CategoryType.Expense && !category.IsArchived);
    private Guid? RequireUserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private static Error UnauthorizedError() => Error.Unauthorized("Auth", "Authentication is required.");
    private static Error NotFoundError() => Error.NotFound("CreditCard", "Credit card was not found.");

    private static bool LooksLikePdf(Stream stream)
    {
        stream.Position = 0;
        Span<byte> header = stackalloc byte[5];
        var read = stream.Read(header);
        stream.Position = 0;
        return read == 5 && Encoding.ASCII.GetString(header) == "%PDF-";
    }

    private static string Hash(Stream stream)
    {
        stream.Position = 0;
        var hash = SHA256.HashData(stream);
        stream.Position = 0;
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string Fingerprint(Guid creditCardAccountId, DateOnly? transactionDate, DateOnly? postingDate, string description, decimal amount, string currency)
    {
        var input = $"{creditCardAccountId:N}|{transactionDate:yyyyMMdd}|{postingDate:yyyyMMdd}|{description.Trim().ToUpperInvariant()}|{amount:0.00}|{currency.ToUpperInvariant()}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input))).ToLowerInvariant();
    }

    private static StatementImportBatchDto ToBatchDto(StatementImportBatch batch, IReadOnlyList<StatementImportRow> rows, IReadOnlyList<string> warnings)
    {
        return new StatementImportBatchDto(batch.Id, batch.CreditCardAccountId, batch.Provider, batch.OriginalFileName, batch.StatementPeriodStart, batch.StatementPeriodEnd, batch.PaymentDueDate, batch.PreviousBalance, batch.PaymentAmount, batch.NewCharges, batch.StatementAmount, batch.MinimumPayment, batch.Status, batch.ParserVersion, batch.CreatedAtUtc, batch.ParsedAtUtc, batch.PostedAtUtc, batch.ErrorCode, batch.ErrorMessage, rows.Select(ToRowDto).ToArray(), warnings);
    }

    private static StatementImportRowDto ToRowDto(StatementImportRow row)
    {
        return new StatementImportRowDto(row.Id, row.SourceRowNumber, row.TransactionDate, row.PostingDate, row.RawDescription, row.NormalizedDescription, row.Amount, row.Currency, row.ForeignAmount, row.ForeignCurrency, row.Type, row.IsInstallment, row.InstallmentCurrentNumber, row.InstallmentTotalNumber, row.RawText, row.MatchStatus, row.MatchedTransactionId, row.ReviewStatus, row.CategoryId, row.CreatedTransactionId, row.FailureReason);
    }
}
