using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using PersonalFinance.Application.Abstractions.StatementImports;
using PersonalFinance.Domain.StatementImports;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;

namespace PersonalFinance.Infrastructure.StatementImports;

public sealed partial class RichartPdfStatementImporter : IStatementImporter
{
    private const string CreditCardStatementLabel = "\u4fe1\u7528\u5361\u96fb\u5b50\u5e33\u55ae";
    private const string ClosingDateLabel = "\u5e33\u55ae\u7d50\u5e33\u65e5";
    private const string DueDateLabel = "\u7e73\u6b3e\u622a\u6b62\u65e5";
    private const string PreviousBalanceLabel = "\u4e0a\u671f\u61c9\u7e73\u7e3d\u984d";
    private const string PaymentAmountLabel = "\u5df2\u7e73\u9000\u6b3e\u7e3d\u984d";
    private const string NewChargesLabel = "\u672c\u671f\u65b0\u589e\u6b3e\u9805";
    private const string StatementAmountLabel = "\u672c\u671f\u7d2f\u8a08\u61c9\u7e73\u91d1\u984d";
    private const string MinimumPaymentLabel = "\u672c\u671f\u6700\u4f4e\u61c9\u7e73\u91d1\u984d";
    private const string DetailsHeaderLabel = "\u6d88\u8cbb\u65e5\u5165\u5e33\u8d77\u606f\u65e5\u6d88\u8cbb\u660e\u7d30";
    private const string InstallmentSummaryLabel = "\u5206\u671f\u4ea4\u6613\u5c1a\u672a\u5230\u671f\u8cc7\u8a0a";
    private const string RewardLabel = "\u672c\u671f\u6d88\u8cbb\u56de\u994b";
    private const string PaymentLabel = "\u7e73\u6b3e";
    private const string RefundLabel = "\u9000\u6b3e";
    private const string ServiceFeeLabel = "\u4ea4\u6613\u670d\u52d9\u8cbb";
    private const string InterestLabel = "\u5229\u606f";
    private const string ReminderLabel = "\u8cbc\u5fc3\u63d0\u9192";

    public string Provider => "Richart";
    public string ParserVersion => "RichartPdfParser/v2-coordinate";

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
            var options = new ParsingOptions { Password = password };
            using var document = PdfDocument.Open(memory, options);
            var pdfPages = document.GetPages().ToArray();
            text = string.Join("\n", pdfPages.Select(page => SanitizeText(page.Text)));
            pages = pdfPages.Select(ToVisualPage).ToArray();
        }
        catch (Exception ex) when (IsPasswordFailure(ex))
        {
            throw new StatementImportParseException("WrongPassword", "The PDF password is invalid.", ex);
        }
        catch (Exception ex) when (ex is PdfDocumentFormatException or InvalidOperationException or IOException)
        {
            throw new StatementImportParseException("InvalidPdf", "The PDF could not be opened as a readable PDF.", ex);
        }

        if (!text.Contains("Richart", StringComparison.OrdinalIgnoreCase) || !text.Contains(CreditCardStatementLabel, StringComparison.Ordinal))
        {
            throw new StatementImportParseException("NotRichartStatement", "The PDF is not a supported Taishin/Richart credit card statement.");
        }

        var lines = NormalizeWhitespace(text).Split('\n').Select(line => line.Trim()).Where(line => line.Length > 0).ToArray();
        var warnings = new List<string>();
        var rows = ParseRowsFromCoordinates(pages, warnings);
        if (rows.Count == 0) warnings.Add("No transaction rows were recognized.");

        var installmentSummaries = ParseInstallmentSummaries(pages);
        var newCharges = ParseMoney(FindValue(lines, NewChargesLabel));
        AddSummaryWarning(rows, newCharges, warnings);

        var periodEnd = ParseMinguoDate(FindValue(lines, ClosingDateLabel));
        var dueDate = ParseMinguoDate(FindValue(lines, DueDateLabel));
        var datedRows = rows.Select(row => row.TransactionDate).Where(date => date is not null).Select(date => date!.Value).ToArray();
        DateOnly? periodStart = datedRows.Length == 0 ? null : datedRows.Min();

        return Task.FromResult(new ParsedStatement(
            Provider,
            "TWD",
            periodStart,
            periodEnd,
            dueDate,
            ParseMoney(FindValue(lines, PreviousBalanceLabel)),
            ParseMoney(FindValue(lines, PaymentAmountLabel)),
            newCharges,
            ParseMoney(FindValue(lines, StatementAmountLabel)),
            ParseMoney(FindValue(lines, MinimumPaymentLabel)),
            rows,
            installmentSummaries,
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

    private static List<ParsedStatementRow> ParseRowsFromCoordinates(IReadOnlyList<VisualPage> pages, List<string> warnings)
    {
        var rows = new List<ParsedStatementRow>();
        var sourceRow = 1;
        var inDetails = false;

        foreach (var page in pages)
        {
            var lines = page.Lines;
            if (!inDetails && !lines.Any(line => line.CompactText.Contains(DetailsHeaderLabel, StringComparison.Ordinal))) continue;
            if (lines.Any(line => line.CompactText.Contains(DetailsHeaderLabel, StringComparison.Ordinal))) inDetails = true;

            var stopY = FindStopY(page);
            var candidates = lines
                .Select((line, index) => new { line, index })
                .Where(item => item.line.Y > stopY && DatePairRegex().IsMatch(item.line.CompactText))
                .ToArray();

            for (var i = 0; i < candidates.Length; i++)
            {
                var current = candidates[i];
                var band = lines
                    .Where(line => line.Y > stopY && Math.Abs(line.Y - current.line.Y) <= 7d && !IsIgnoredTransactionLine(line))
                    .OrderByDescending(line => line.Y)
                    .ToArray();
                var row = ParseCoordinateRow(sourceRow, current.line, band, warnings);
                if (row is not null)
                {
                    rows.Add(row);
                    sourceRow++;
                }
            }

            if (stopY > 0) inDetails = false;
        }

        return rows;
    }

    private static ParsedStatementRow? ParseCoordinateRow(int sourceRow, VisualLine dateLine, IReadOnlyList<VisualLine> band, List<string> warnings)
    {
        var dateMatch = DatePairRegex().Match(dateLine.CompactText);
        if (!dateMatch.Success) return null;

        var txDate = ParseMinguoDate(dateMatch.Groups["tx"].Value);
        var postDate = ParseMinguoDate(dateMatch.Groups["post"].Value);
        var rest = dateLine.CompactText[(dateMatch.Index + dateMatch.Length)..];
        var supplemental = band
            .Where(line => !ReferenceEquals(line, dateLine) && !DatePairRegex().IsMatch(line.CompactText))
            .Select(line => line.RawText)
            .Where(text => !string.IsNullOrWhiteSpace(text))
            .ToArray();
        var rawText = string.Join(" | ", band.Select(line => line.RawText));

        if (!TryParseAmountAndDescription(rest, supplemental, out var rawDescription, out var normalizedDescription, out var amount, out var currency, out var foreignAmount, out var foreignCurrency))
        {
            warnings.Add($"UnknownRow:{sourceRow}");
            var fallback = string.Join(' ', supplemental.Append(rest)).Trim();
            return new ParsedStatementRow(sourceRow, txDate, postDate, fallback, NormalizeDescription(fallback), 0m, "TWD", null, null, StatementImportRowType.Unknown, false, null, null, rawText);
        }

        var type = Classify(rawDescription, amount);
        return new ParsedStatementRow(sourceRow, txDate, postDate, rawDescription, normalizedDescription, Math.Abs(amount), currency, foreignAmount, foreignCurrency, type, InstallmentRegex().IsMatch(normalizedDescription), ParseInstallmentNumber(normalizedDescription, 1), ParseInstallmentNumber(normalizedDescription, 2), rawText);
    }

    private static bool TryParseAmountAndDescription(string compactRest, IReadOnlyList<string> supplemental, out string rawDescription, out string normalizedDescription, out decimal amount, out string currency, out decimal? foreignAmount, out string? foreignCurrency)
    {
        rawDescription = string.Empty;
        normalizedDescription = string.Empty;
        amount = 0m;
        currency = "TWD";
        foreignAmount = null;
        foreignCurrency = null;
        var rest = compactRest.Replace('\u2212', '-').Replace('\uff0d', '-').Replace('\u2014', '-');

        var foreign = ForeignJpyRegex().Match(rest);
        if (foreign.Success)
        {
            rawDescription = JoinDescription(supplemental, foreign.Groups["description"].Value);
            if (!TryParseDecimal(foreign.Groups["amount"].Value, out amount)) return false;
            foreignCurrency = "JPY";
            foreignAmount = ParseForeignAmount(foreign.Groups["foreign"].Value);
            normalizedDescription = NormalizeDescription(rawDescription);
            return true;
        }

        var twd = TWDRegex().Match(rest);
        if (twd.Success)
        {
            rawDescription = JoinDescription(supplemental, twd.Groups["description"].Value);
            normalizedDescription = NormalizeDescription(rawDescription);
            return TryParseDecimal(twd.Groups["amount"].Value, out amount);
        }

        var fee = FeeRegex().Match(rest);
        if (rest.Contains(ServiceFeeLabel, StringComparison.Ordinal) && fee.Success)
        {
            rawDescription = JoinDescription(supplemental, fee.Groups["description"].Value + fee.Groups["base"].Value);
            normalizedDescription = NormalizeDescription(rawDescription);
            return TryParseDecimal(fee.Groups["amount"].Value, out amount);
        }

        var signed = SignedAmountRegex().Match(rest);
        if (signed.Success)
        {
            rawDescription = JoinDescription(supplemental, signed.Groups["description"].Value);
            normalizedDescription = NormalizeDescription(rawDescription);
            return TryParseDecimal(signed.Groups["amount"].Value, out amount);
        }
        return false;
    }

    private static IReadOnlyList<ParsedInstallmentSummary> ParseInstallmentSummaries(IReadOnlyList<VisualPage> pages)
    {
        var summaries = new List<ParsedInstallmentSummary>();
        foreach (var line in pages.SelectMany(page => page.Lines))
        {
            if (!InstallmentSummaryRegex().IsMatch(line.CompactText)) continue;
            var match = InstallmentSummaryRegex().Match(line.CompactText);
            var total = ParseDigits(match.Groups["total"].Value);
            var remaining = ParseDigits(match.Groups["remaining"].Value);
            if (remaining > total) remaining /= 10m;
            summaries.Add(new ParsedInstallmentSummary(
                match.Groups["card"].Value,
                ParseMinguoDate(match.Groups["date"].Value),
                NormalizeDescription(match.Groups["description"].Value),
                total,
                ParseDigits(match.Groups["next"].Value),
                remaining,
                0m,
                0m));
        }
        return summaries;
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

    private static double FindStopY(VisualPage page)
    {
        var stop = page.Lines.FirstOrDefault(line => line.CompactText.Contains(RewardLabel, StringComparison.Ordinal) || line.CompactText.Contains(InstallmentSummaryLabel, StringComparison.Ordinal) || line.CompactText.Contains(ReminderLabel, StringComparison.Ordinal));
        return stop?.Y ?? 0d;
    }

    private static bool IsIgnoredTransactionLine(VisualLine line)
    {
        var compact = line.CompactText;
        return compact.Contains(DetailsHeaderLabel, StringComparison.Ordinal)
            || compact.Contains("Richart\u5361", StringComparison.Ordinal)
            || compact.Contains(RewardLabel, StringComparison.Ordinal)
            || compact.Contains(InstallmentSummaryLabel, StringComparison.Ordinal)
            || compact.Contains(ReminderLabel, StringComparison.Ordinal);
    }

    private static bool IsPasswordFailure(Exception ex)
    {
        var message = ex.Message.ToLowerInvariant();
        return message.Contains("password") || message.Contains("encrypted") || message.Contains("decrypt");
    }

    private static StatementImportRowType Classify(string description, decimal signedAmount)
    {
        if (signedAmount < 0 || description.Contains(PaymentLabel, StringComparison.Ordinal)) return StatementImportRowType.Payment;
        if (description.Contains(RefundLabel, StringComparison.Ordinal)) return StatementImportRowType.Refund;
        if (description.Contains(ServiceFeeLabel, StringComparison.Ordinal)) return StatementImportRowType.Fee;
        if (description.Contains(InterestLabel, StringComparison.Ordinal)) return StatementImportRowType.Interest;
        if (InstallmentRegex().IsMatch(NormalizeDescription(description))) return StatementImportRowType.Installment;
        return StatementImportRowType.Purchase;
    }

    private static string JoinDescription(IReadOnlyList<string> supplemental, string inlineDescription)
    {
        var parts = supplemental.Select(text => text.Trim()).Where(IsMeaningfulDescriptionPart).ToList();
        if (!string.IsNullOrWhiteSpace(inlineDescription)) parts.Add(inlineDescription.Trim());
        return string.Join(' ', parts).Trim();
    }

    private static bool IsMeaningfulDescriptionPart(string text) => text.Any(char.IsLetterOrDigit);

    private static string? FindValue(IEnumerable<string> lines, string label)
    {
        foreach (var line in lines)
        {
            var index = line.IndexOf(label, StringComparison.Ordinal);
            if (index < 0) continue;
            return line[(index + label.Length)..].TrimStart(' ', '-', '+', '=');
        }
        return null;
    }

    private static DateOnly? ParseMinguoDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var match = Regex.Match(value, @"(?<year>\d{2,3})/(?<month>\d{1,2})/(?<day>\d{1,2})");
        if (!match.Success) return null;
        var year = int.Parse(match.Groups["year"].Value, CultureInfo.InvariantCulture) + 1911;
        var month = int.Parse(match.Groups["month"].Value, CultureInfo.InvariantCulture);
        var day = int.Parse(match.Groups["day"].Value, CultureInfo.InvariantCulture);
        return new DateOnly(year, month, day);
    }

    private static decimal? ParseMoney(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var match = MoneyRegex().Match(value);
        return match.Success && decimal.TryParse(match.Value.Replace(",", string.Empty), NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) ? amount : null;
    }

    private static decimal ParseDigits(string value) => decimal.Parse(value.Replace(",", string.Empty), NumberStyles.Number, CultureInfo.InvariantCulture);
    private static bool TryParseDecimal(string value, out decimal amount) => decimal.TryParse(value.Replace(",", string.Empty).TrimStart('0').PadLeft(1, '0'), NumberStyles.Number, CultureInfo.InvariantCulture, out amount);

    private static decimal? ParseForeignAmount(string value)
    {
        if (!TryParseDecimal(value, out var amount)) return null;
        return value.Length > 2 && !value.Contains('.') ? amount / 100m : amount;
    }

    private static int? ParseInstallmentNumber(string description, int groupIndex)
    {
        var match = InstallmentRegex().Match(description);
        return match.Success && int.TryParse(match.Groups[groupIndex].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number) ? number : null;
    }

    private static string SanitizeText(string text) => text.Replace('\uf07f', ' ').Replace('\uf0fc', ' ');
    private static string NormalizeWhitespace(string text) => Regex.Replace(SanitizeText(text).Replace("\r\n", "\n").Replace('\r', '\n'), "[ \t]+", " ");
    private static string NormalizeDescription(string description) => AuthCodeSuffixRegex().Replace(description.Normalize(NormalizationForm.FormKC).Replace('\uFF0F', '/').Replace('\u2014', '-').Replace('\uff0d', '-'), string.Empty).Trim();

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
            RawText = string.Concat(glyphs.Select(glyph => glyph.Text));
            CompactText = Regex.Replace(RawText, "\\s+", string.Empty);
        }

        public IReadOnlyList<Glyph> Glyphs { get; }
        public double Y { get; }
        public string RawText { get; }
        public string CompactText { get; }
    }

    [GeneratedRegex(@"(?<tx>\d{2,3}/\d{1,2}/\d{1,2})(?<post>\d{2,3}/\d{1,2}/\d{1,2})")]
    private static partial Regex DatePairRegex();

    [GeneratedRegex(@"(?<description>.*?)(?<amount>-?[0-9]{1,6})TW$")]
    private static partial Regex TWDRegex();

    [GeneratedRegex(@"(?<description>.*?)(?<amount>[0-9]{1,6})(?<fxdate>\d{4})JPJPY(?<foreign>[0-9]+)$", RegexOptions.IgnoreCase)]
    private static partial Regex ForeignJpyRegex();

    [GeneratedRegex(@"(?<description>.*?)(?<base>[0-9]{1,6})(?<amount>[0-9]{3})$")]
    private static partial Regex FeeRegex();

    [GeneratedRegex(@"(?<description>.*?)(?<amount>-?[0-9]{1,6})$")]
    private static partial Regex SignedAmountRegex();

    [GeneratedRegex(@"A\d{4}.*$", RegexOptions.IgnoreCase)]
    private static partial Regex AuthCodeSuffixRegex();

    [GeneratedRegex(@"[0-9]{1,3}(?:,[0-9]{3})*|[0-9]+")]
    private static partial Regex MoneyRegex();

    [GeneratedRegex(@"\u7b2c(\d{2})/(\d{2})\u671f")]
    private static partial Regex InstallmentRegex();

    [GeneratedRegex(@"^(?<card>[0-9]{4})(?<date>[0-9]{2,3}/[0-9]{1,2}/[0-9]{1,2})(?<description>.+?)(?<total>[0-9]{5})(?<next>[0-9]{4})(?<remaining>[0-9]+)0000%$")]
    private static partial Regex InstallmentSummaryRegex();
}

public sealed class StatementImportParseException : Exception
{
    public StatementImportParseException(string code, string message) : base(message) => Code = code;
    public StatementImportParseException(string code, string message, Exception innerException) : base(message, innerException) => Code = code;
    public string Code { get; }
}






