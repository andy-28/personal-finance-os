using PersonalFinance.Domain.StatementImports;

namespace PersonalFinance.Application.Abstractions.StatementImports;

public sealed record StatementImportContext(string OriginalFileName, string ContentType);

public interface IStatementImporter
{
    string Provider { get; }
    string ParserVersion { get; }
    bool CanHandle(StatementImportContext context);
    Task<ParsedStatement> ParseAsync(Stream pdfStream, string? password, CancellationToken cancellationToken);
}

public sealed record ParsedStatement(
    string Provider,
    string Currency,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd,
    DateOnly? PaymentDueDate,
    decimal? PreviousBalance,
    decimal? PaymentAmount,
    decimal? NewCharges,
    decimal? StatementAmount,
    decimal? MinimumPayment,
    IReadOnlyList<ParsedStatementRow> Rows,
    IReadOnlyList<ParsedInstallmentSummary> InstallmentSummaries,
    IReadOnlyList<string> Warnings);

public sealed record ParsedInstallmentSummary(
    string CardLastFour,
    DateOnly? TransactionDate,
    string Description,
    decimal TotalAmount,
    decimal NextPrincipal,
    decimal RemainingPrincipal,
    decimal FeePerPeriod,
    decimal NextInterest);

public sealed record ParsedStatementRow(
    int SourceRowNumber,
    DateOnly? TransactionDate,
    DateOnly? PostingDate,
    string RawDescription,
    string NormalizedDescription,
    decimal Amount,
    string Currency,
    decimal? ForeignAmount,
    string? ForeignCurrency,
    StatementImportRowType Type,
    bool IsInstallment,
    int? InstallmentCurrentNumber,
    int? InstallmentTotalNumber,
    string RawText);
