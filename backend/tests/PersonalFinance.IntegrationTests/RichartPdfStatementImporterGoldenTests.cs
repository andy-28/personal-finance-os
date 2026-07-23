using PersonalFinance.Domain.StatementImports;
using PersonalFinance.Infrastructure.StatementImports;

namespace PersonalFinance.IntegrationTests;

public sealed class RichartPdfStatementImporterGoldenTests
{
    [Fact]
    public async Task ParseAsync_WithRichartGoldenPdf_RebuildsStatementFromCoordinates()
    {
        var pdfPath = Environment.GetEnvironmentVariable("RICHART_GOLDEN_PDF_PATH");
        var password = Environment.GetEnvironmentVariable("RICHART_GOLDEN_PDF_PASSWORD");
        if (string.IsNullOrWhiteSpace(pdfPath) || string.IsNullOrWhiteSpace(password) || !File.Exists(pdfPath)) return;

        var importer = new RichartPdfStatementImporter();
        await using var stream = File.OpenRead(pdfPath);
        var statement = await importer.ParseAsync(stream, password, CancellationToken.None);

        Assert.Equal(new DateOnly(2026, 7, 19), statement.PeriodEnd);
        Assert.Equal(new DateOnly(2026, 8, 3), statement.PaymentDueDate);
        Assert.Equal(12983m, statement.NewCharges);
        Assert.Equal(12983m, statement.StatementAmount);
        Assert.Equal(7185m, statement.MinimumPayment);
        Assert.Equal(39, statement.Rows.Count);
        Assert.DoesNotContain(statement.Warnings, warning => warning.StartsWith("SummaryMismatch", StringComparison.Ordinal));

        var payment = Assert.Single(statement.Rows.Where(row => row.Type == StatementImportRowType.Payment));
        Assert.Equal(new DateOnly(2026, 6, 22), payment.TransactionDate);
        Assert.Equal(29104m, payment.Amount);
        Assert.Contains("Richart", payment.RawDescription, StringComparison.OrdinalIgnoreCase);

        var installments = statement.Rows.Where(row => row.Type == StatementImportRowType.Installment).ToArray();
        Assert.Equal(3, installments.Length);
        Assert.Contains(installments, row => row.InstallmentCurrentNumber == 9 && row.InstallmentTotalNumber == 12 && row.Amount == 2491m);
        Assert.Contains(installments, row => row.InstallmentCurrentNumber == 5 && row.InstallmentTotalNumber == 12 && row.Amount == 2491m);
        Assert.Contains(installments, row => row.InstallmentCurrentNumber == 4 && row.InstallmentTotalNumber == 12 && row.Amount == 1556m);

        var jpy = Assert.Single(statement.Rows.Where(row => row.ForeignCurrency == "JPY"));
        Assert.Equal(StatementImportRowType.Purchase, jpy.Type);
        Assert.Equal(226m, jpy.Amount);
        Assert.Equal(1153m, jpy.ForeignAmount);
        Assert.Contains("MIGLAMUTOKYO", jpy.NormalizedDescription, StringComparison.OrdinalIgnoreCase);

        var foreignFee = Assert.Single(statement.Rows.Where(row => row.Type == StatementImportRowType.Fee));
        Assert.Equal(3m, foreignFee.Amount);
        Assert.Contains("國外交易服務費", foreignFee.RawDescription, StringComparison.Ordinal);

        Assert.Equal(3, statement.InstallmentSummaries.Count);
        Assert.Contains(statement.InstallmentSummaries, summary => summary.TransactionDate == new DateOnly(2025, 10, 30) && summary.NextPrincipal == 2491m && summary.RemainingPrincipal == 7473m);
        Assert.Contains(statement.InstallmentSummaries, summary => summary.TransactionDate == new DateOnly(2026, 3, 9) && summary.NextPrincipal == 2491m && summary.RemainingPrincipal == 17437m);
        Assert.Contains(statement.InstallmentSummaries, summary => summary.TransactionDate == new DateOnly(2026, 3, 18) && summary.NextPrincipal == 1556m && summary.RemainingPrincipal == 12448m);

        var calculatedNewCharges = statement.Rows
            .Where(row => row.Type != StatementImportRowType.Payment)
            .Sum(row => row.Type == StatementImportRowType.Refund ? -row.Amount : row.Amount);
        Assert.Equal(statement.NewCharges, calculatedNewCharges);
    }
}
