using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using PersonalFinance.Application.Abstractions.StatementImports;
using PersonalFinance.Domain.StatementImports;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;

namespace PersonalFinance.Infrastructure.StatementImports;

public sealed partial class EsunPdfStatementImporter : IStatementImporter
{
    private const string EsunLabel = "\u7389\u5c71";
    private const string StatementLabel = "\u4fe1\u7528\u5361\u5e33\u55ae";
    private const string CurrentChargesLabel = "\u672c\u671f\u65b0\u589e\u6b3e\u9805";
    private const string StatementAmountLabel = "\u672c\u671f\u61c9\u7e73\u7e3d\u91d1\u984d";
    private const string MinimumPaymentLabel = "\u672c\u671f\u6700\u4f4e\u61c9\u7e73\u91d1\u984d";
    private const string PaymentLineLabel = "\u611f\u8b1d\u60a8\u8fa6\u7406\u672c\u884c\u81ea\u52d5\u8f49\u5e33\u7e73\u6b3e";
    private const string DetailStartLabel = "\u672c\u671f\u6d88\u8cbb\u660e\u7d30";
    private const string DetailTotalLabel = "\u672c\u671f\u5408\u8a08";
    private const string ServiceFeeLabel = "\u570b\u5916\u4ea4\u6613\u670d\u52d9\u8cbb";
    private const string InstallmentMarker = "\u671f\u4e4b\u7b2c";

    public string Provider => "ESUN";
    public string ParserVersion => "EsunPdfParser/v1-text-table";

    public bool CanHandle(StatementImportContext context) => context.OriginalFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);

    public Task<ParsedStatement> ParseAsync(Stream pdfStream, string? password, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        using var memory = new MemoryStream();
        pdfStream.CopyTo(memory);
        memory.Position = 0;

        string text;
        IReadOnlyList<VisualPage> pages;
        try
        {
            using var document = PdfDocument.Open(memory, new ParsingOptions { Password = password });
            var pdfPages = document.GetPages().ToArray();
            pages = pdfPages.Select(ToVisualPage).ToArray();
            text = NormalizeText(string.Join("\n", pdfPages.Select(page => page.Text).Concat(pages.SelectMany(page => page.Lines.Select(line => line.RawText)))));
        }
        catch (Exception ex) when (IsPasswordFailure(ex))
        {
            throw new StatementImportParseException("WrongPassword", "The PDF password is invalid.", ex);
        }
        catch (Exception ex) when (ex is PdfDocumentFormatException or InvalidOperationException or IOException)
        {
            throw new StatementImportParseException("InvalidPdf", "The PDF could not be opened as a readable PDF.", ex);
        }

        if (!text.Contains(EsunLabel, StringComparison.Ordinal) || !text.Contains(StatementLabel, StringComparison.Ordinal))
        {
            throw new StatementImportParseException("NotEsunStatement", "The PDF is not a supported ESUN credit card statement.");
        }

        var lines = pages.SelectMany(page => page.Lines).Select(line => line.RawText.Trim()).Where(line => line.Length > 0).ToArray();
        var statementMonth = ParseStatementMonth(lines);
        var summary = ParseSummary(lines);
        var dueDate = ParseDueDate(lines, statementMonth);
        var periodEnd = ParseClosingDate(lines, statementMonth);
        var rows = ParseRows(lines, statementMonth, out var warnings);
        var periodStart = rows.Select(row => row.TransactionDate).Where(date => date is not null).Select(date => date!.Value).DefaultIfEmpty().Min();
        DateOnly? nullablePeriodStart = periodStart == default ? null : periodStart;

        AddSummaryWarning(rows, summary.NewCharges, warnings);

        return Task.FromResult(new ParsedStatement(
            Provider,
            "TWD",
            nullablePeriodStart,
            periodEnd,
            dueDate,
            summary.PreviousBalance,
            summary.PaymentAmount,
            summary.NewCharges,
            summary.StatementAmount,
            summary.MinimumPayment,
            rows,
            [],
            warnings));
    }

    private static VisualPage ToVisualPage(Page page)
    {
        var glyphs = page.Letters
            .Where(letter => !string.IsNullOrWhiteSpace(letter.Value))
            .Select(letter => new Glyph(letter.Value, letter.GlyphRectangle.Left, letter.GlyphRectangle.Right, letter.GlyphRectangle.Top, letter.GlyphRectangle.Bottom))
            .OrderByDescending(glyph => glyph.CenterY)
            .ToArray();

        var groups = new List<List<Glyph>>();
        foreach (var glyph in glyphs)
        {
            var group = groups.FirstOrDefault(candidate => Math.Abs(candidate.Average(item => item.CenterY) - glyph.CenterY) <= 2.5d);
            if (group is null)
            {
                group = [];
                groups.Add(group);
            }
            group.Add(glyph);
        }

        var lines = groups
            .Select(group => new VisualLine(group.OrderBy(glyph => glyph.Left).ToArray()))
            .OrderByDescending(line => line.Y)
            .ToArray();
        return new VisualPage(page.Number, page.Height, lines);
    }
    private static StatementSummary ParseSummary(IReadOnlyList<string> lines)
    {
        for (var i = 0; i < lines.Count; i++)
        {
            if (!lines[i].Contains(CurrentChargesLabel, StringComparison.Ordinal) || i + 1 >= lines.Count) continue;
            var match = SummaryLineRegex().Match(lines[i + 1]);
            if (!match.Success) continue;
            return new StatementSummary(
                ParseMoney(match.Groups["previous"].Value),
                ParsePaymentAmount(lines),
                ParseMoney(match.Groups["charges"].Value),
                ParseMoney(match.Groups["statement"].Value),
                ParseMoney(match.Groups["minimum"].Value));
        }
        return new StatementSummary(null, ParsePaymentAmount(lines), null, ParseLabeledMoney(lines, StatementAmountLabel), ParseLabeledMoney(lines, MinimumPaymentLabel));
    }

    private static List<ParsedStatementRow> ParseRows(IReadOnlyList<string> lines, StatementMonth statementMonth, out List<string> warnings)
    {
        warnings = [];
        var rows = new List<ParsedStatementRow>();
        var inDetails = false;
        var sourceRow = 1;

        foreach (var line in lines)
        {
            var paymentBeforeDetails = PaymentRowRegex().Match(line);
            if (!inDetails && paymentBeforeDetails.Success && paymentBeforeDetails.Groups["description"].Value.Contains(PaymentLineLabel, StringComparison.Ordinal))
            {
                var paymentAmount = Math.Abs(ParseMoney(paymentBeforeDetails.Groups["amount"].Value) ?? 0m);
                rows.Add(new ParsedStatementRow(sourceRow++, ResolveDate(paymentBeforeDetails.Groups["tx"].Value, statementMonth), null, paymentBeforeDetails.Groups["description"].Value.Trim(), NormalizeDescription(paymentBeforeDetails.Groups["description"].Value), paymentAmount, "TWD", null, null, StatementImportRowType.Payment, false, null, null, line));
                continue;
            }
            if (line.Contains(DetailStartLabel, StringComparison.Ordinal))
            {
                inDetails = true;
                continue;
            }
            if (!inDetails) continue;
            if (line.Contains(DetailTotalLabel, StringComparison.Ordinal)) break;
            if (line.StartsWith("\u5361\u865f", StringComparison.Ordinal)) continue;
            if (line.StartsWith("(", StringComparison.Ordinal) || line.StartsWith("\u203b", StringComparison.Ordinal)) continue;

            var transaction = TransactionRowRegex().Match(line);
            if (transaction.Success)
            {
                var txDate = ResolveDate(transaction.Groups["tx"].Value, statementMonth);
                var postDate = ResolveDate(transaction.Groups["post"].Value, statementMonth);
                var beforeAmount = transaction.Groups["body"].Value.Trim();
                var amount = ParseMoney(transaction.Groups["amount"].Value) ?? 0m;
                var description = ExtractDescription(beforeAmount);
                var (foreignCurrency, foreignAmount) = ExtractForeign(beforeAmount);
                var normalized = NormalizeDescription(description);
                var type = Classify(normalized, amount);
                var installment = ParseInstallment(normalized);

                rows.Add(new ParsedStatementRow(sourceRow++, txDate, postDate, description, normalized, Math.Abs(amount), "TWD", foreignAmount, foreignCurrency, type, installment.Current is not null, installment.Current, installment.Total, line));
                continue;
            }

            var payment = PaymentRowRegex().Match(line);
            if (payment.Success && payment.Groups["description"].Value.Contains(PaymentLineLabel, StringComparison.Ordinal))
            {
                var paymentAmount = Math.Abs(ParseMoney(payment.Groups["amount"].Value) ?? 0m);
                rows.Add(new ParsedStatementRow(sourceRow++, ResolveDate(payment.Groups["tx"].Value, statementMonth), null, payment.Groups["description"].Value.Trim(), NormalizeDescription(payment.Groups["description"].Value), paymentAmount, "TWD", null, null, StatementImportRowType.Payment, false, null, null, line));
                continue;
            }
        }

        if (rows.Count == 0) warnings.Add("No transaction rows were recognized.");
        return rows;
    }

    private static string ExtractDescription(string value)
    {
        var description = value;
        var lastTwd = LastTwdAmountRegex().Match(description);
        if (lastTwd.Success) description = description[..lastTwd.Index].Trim();
        var foreign = ForeignTailRegex().Match(description);
        if (foreign.Success) description = description[..foreign.Index].Trim();
        return description.Trim();
    }

    private static (string? Currency, decimal? Amount) ExtractForeign(string value)
    {
        var foreign = ForeignTailRegex().Match(value);
        return foreign.Success ? (foreign.Groups["currency"].Value.ToUpperInvariant(), ParseMoney(foreign.Groups["amount"].Value)) : (null, null);
    }

    private static StatementImportRowType Classify(string description, decimal signedAmount)
    {
        if (signedAmount < 0 || description.Contains(PaymentLineLabel, StringComparison.Ordinal)) return StatementImportRowType.Payment;
        if (description.Contains(ServiceFeeLabel, StringComparison.Ordinal)) return StatementImportRowType.Fee;
        if (description.Contains(InstallmentMarker, StringComparison.Ordinal)) return StatementImportRowType.Installment;
        return StatementImportRowType.Purchase;
    }

    private static (int? Current, int? Total) ParseInstallment(string description)
    {
        var match = InstallmentRegex().Match(description);
        if (!match.Success) return (null, null);
        return (int.Parse(match.Groups["current"].Value, CultureInfo.InvariantCulture), int.Parse(match.Groups["total"].Value, CultureInfo.InvariantCulture));
    }

    private static void AddSummaryWarning(IReadOnlyList<ParsedStatementRow> rows, decimal? declaredNewCharges, List<string> warnings)
    {
        if (declaredNewCharges is null || rows.Count == 0) return;
        var calculated = rows.Where(row => row.Type != StatementImportRowType.Payment).Sum(row => row.Type == StatementImportRowType.Refund ? -row.Amount : row.Amount);
        if (Math.Abs(calculated - declaredNewCharges.Value) >= 1m)
        {
            warnings.Add($"SummaryMismatch:DeclaredNewCharges={declaredNewCharges.Value.ToString(CultureInfo.InvariantCulture)};CalculatedNewCharges={calculated.ToString(CultureInfo.InvariantCulture)}");
        }
    }

    private static StatementMonth ParseStatementMonth(IReadOnlyList<string> lines)
    {
        var match = lines.Select(line => StatementMonthRegex().Match(line)).FirstOrDefault(match => match.Success);
        if (match is not null && match.Success)
        {
            return new StatementMonth(int.Parse(match.Groups["year"].Value, CultureInfo.InvariantCulture) + 1911, int.Parse(match.Groups["month"].Value, CultureInfo.InvariantCulture));
        }
        return new StatementMonth(DateTime.Today.Year, DateTime.Today.Month);
    }

    private static DateOnly? ParseDueDate(IReadOnlyList<string> lines, StatementMonth statementMonth)
    {
        foreach (var line in lines)
        {
            var match = FullMinguoDateRegex().Match(line);
            if (match.Success) return ParseMinguoDate(match.Value);
        }
        return null;
    }

    private static DateOnly? ParseClosingDate(IReadOnlyList<string> lines, StatementMonth statementMonth)
    {
        foreach (var line in lines)
        {
            if (!line.Contains("/", StringComparison.Ordinal) || !line.Contains("100,000", StringComparison.Ordinal)) continue;
            var match = FullMinguoDateRegex().Match(line);
            if (match.Success) return ParseMinguoDate(match.Value);
        }
        return null;
    }

    private static DateOnly? ResolveDate(string mmdd, StatementMonth statementMonth)
    {
        var parts = mmdd.Split('/');
        if (parts.Length != 2) return null;
        var month = int.Parse(parts[0], CultureInfo.InvariantCulture);
        var day = int.Parse(parts[1], CultureInfo.InvariantCulture);
        var year = statementMonth.Year;
        if (month > 11 && statementMonth.Month <= 2) year--;
        return new DateOnly(year, month, day);
    }

    private static DateOnly? ParseMinguoDate(string value)
    {
        var match = FullMinguoDateRegex().Match(value);
        if (!match.Success) return null;
        return new DateOnly(int.Parse(match.Groups["year"].Value, CultureInfo.InvariantCulture) + 1911, int.Parse(match.Groups["month"].Value, CultureInfo.InvariantCulture), int.Parse(match.Groups["day"].Value, CultureInfo.InvariantCulture));
    }

    private static decimal? ParsePaymentAmount(IEnumerable<string> lines)
    {
        foreach (var line in lines)
        {
            if (!line.Contains(PaymentLineLabel, StringComparison.Ordinal)) continue;
            var match = PaymentRowRegex().Match(line);
            if (match.Success) return Math.Abs(ParseMoney(match.Groups["amount"].Value) ?? 0m);
        }
        return null;
    }
    private static decimal? ParseLabeledMoney(IEnumerable<string> lines, string label)
    {
        foreach (var line in lines)
        {
            if (!line.Contains(label, StringComparison.Ordinal)) continue;
            var match = MoneyRegex().Match(line);
            if (match.Success) return ParseMoney(match.Value);
        }
        return null;
    }

    private static decimal? ParseMoney(string value) => decimal.TryParse(value.Replace(",", string.Empty), NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var amount) ? amount : null;
    private static string NormalizeText(string text) => Regex.Replace(text.Replace("\r\n", "\n").Replace('\r', '\n'), "[ \t]+", " ");
    private static string NormalizeDescription(string description) => Regex.Replace(description.Normalize(NormalizationForm.FormKC), "\\s+", " ").Trim();

    private static bool IsPasswordFailure(Exception ex)
    {
        var message = ex.Message.ToLowerInvariant();
        return message.Contains("password") || message.Contains("encrypted") || message.Contains("decrypt");
    }

    private sealed record VisualPage(int Number, double Height, IReadOnlyList<VisualLine> Lines);
    private sealed record Glyph(string Text, double Left, double Right, double Top, double Bottom)
    {
        public double CenterY => (Top + Bottom) / 2d;
    }

    private sealed class VisualLine
    {
        public VisualLine(IReadOnlyList<Glyph> glyphs)
        {
            Glyphs = glyphs;
            Y = glyphs.Average(glyph => glyph.CenterY);
            RawText = JoinWithColumnSpaces(glyphs);
        }

        public IReadOnlyList<Glyph> Glyphs { get; }
        public double Y { get; }
        public string RawText { get; }

        private static string JoinWithColumnSpaces(IReadOnlyList<Glyph> glyphs)
        {
            var builder = new StringBuilder();
            Glyph? previous = null;
            foreach (var glyph in glyphs)
            {
                if (previous is not null && glyph.Left - previous.Left > 18d) builder.Append(' ');
                builder.Append(glyph.Text);
                previous = glyph;
            }
            return builder.ToString();
        }
    }
    private sealed record StatementSummary(decimal? PreviousBalance, decimal? PaymentAmount, decimal? NewCharges, decimal? StatementAmount, decimal? MinimumPayment);
    private sealed record StatementMonth(int Year, int Month);

    [GeneratedRegex(@"(?<year>\d{2,3})\u5e74(?<month>\d{2})\u6708")]
    private static partial Regex StatementMonthRegex();

    [GeneratedRegex(@"^TWD\s+(?<previous>-?[\d,]+)\s+(?<charges>[\d,]+)\s+(?<statement>[\d,]+)\s+(?<minimum>[\d,]+)$")]
    private static partial Regex SummaryLineRegex();

    [GeneratedRegex(@"(?<year>\d{2,3})/(?<month>\d{2})/(?<day>\d{2})")]
    private static partial Regex FullMinguoDateRegex();

    [GeneratedRegex(@"^(?<tx>\d{2}/\d{2})\s*(?<post>\d{2}/\d{2})\s*(?<body>.+?)\s*TWD\s*(?<amount>-?[\d,]+)$")]
    private static partial Regex TransactionRowRegex();

    [GeneratedRegex(@"^(?<tx>\d{2}/\d{2})\s+(?<description>.+?)\s+TWD\s*(?<amount>-?[\d,]+)$")]
    private static partial Regex PaymentRowRegex();

    [GeneratedRegex(@"\s+TWD\s+-?[\d,]+$")]
    private static partial Regex LastTwdAmountRegex();

    [GeneratedRegex(@"(?<date>\d{2}/\d{2}\s+)?(?<currency>[A-Z]{3})\s+(?<amount>[\d,.]+)$")]
    private static partial Regex ForeignTailRegex();

    [GeneratedRegex(@"\u5206(?<total>\d+)\u671f\u4e4b\u7b2c(?<current>\d+)\u671f")]
    private static partial Regex InstallmentRegex();

    [GeneratedRegex(@"-?\d{1,3}(?:,\d{3})*|-?\d+")]
    private static partial Regex MoneyRegex();
}