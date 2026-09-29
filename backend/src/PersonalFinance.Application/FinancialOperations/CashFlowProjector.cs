using PersonalFinance.Application.FinancialOperations.Models;

namespace PersonalFinance.Application.FinancialOperations;

public static class CashFlowProjector
{
    public static LiquidityProjectionDto Project(DateOnly today, int horizonDays, string currencyCode, decimal currentLiquidity,
        IReadOnlyList<CashFlowItemDto> items, int pendingCount)
    {
        var relevant = items.Where(item => item.CurrencyCode == currencyCode).OrderBy(item => item.CashFlowDate).ThenBy(item => item.Id).ToArray();
        var baseline = currentLiquidity;
        var conditional = currentLiquidity;
        var baselineLowest = currentLiquidity;
        var conditionalLowest = currentLiquidity;
        var baselineLowestDate = today;
        var conditionalLowestDate = today;
        var points = new List<LiquidityPointDto> { new(today, baseline, conditional) };

        foreach (var dateGroup in relevant.GroupBy(item => item.CashFlowDate).OrderBy(group => group.Key))
        {
            baseline += dateGroup.Where(item => !item.IsConditional).Sum(item => item.Amount);
            conditional = baseline + relevant.Where(item => item.IsConditional && item.CashFlowDate <= dateGroup.Key).Sum(item => item.Amount);
            if (baseline < baselineLowest) { baselineLowest = baseline; baselineLowestDate = dateGroup.Key; }
            if (conditional < conditionalLowest) { conditionalLowest = conditional; conditionalLowestDate = dateGroup.Key; }
            points.Add(new LiquidityPointDto(dateGroup.Key, baseline, conditional));
        }

        var gaps = BuildGaps(points, relevant);
        var nextIncome = relevant.FirstOrDefault(item => !item.IsConditional && item.Amount > 0);
        return new LiquidityProjectionDto(
            currencyCode,
            horizonDays,
            currentLiquidity,
            baselineLowest,
            baselineLowestDate,
            conditionalLowest,
            conditionalLowestDate,
            -relevant.Where(item => !item.IsConditional && item.Amount < 0).Sum(item => item.Amount),
            -relevant.Where(item => item.IsConditional && item.Amount < 0).Sum(item => item.Amount),
            nextIncome?.Amount,
            nextIncome?.CashFlowDate,
            relevant.Length,
            pendingCount,
            points,
            gaps);
    }

    private static IReadOnlyList<LiquidityGapDto> BuildGaps(IReadOnlyList<LiquidityPointDto> points, IReadOnlyList<CashFlowItemDto> items)
    {
        var gaps = new List<LiquidityGapDto>();
        DateOnly? start = null;
        decimal lowest = 0;
        foreach (var point in points)
        {
            if (point.BaselineLiquidity < 0)
            {
                start ??= point.Date;
                lowest = Math.Min(lowest, point.BaselineLiquidity);
            }
            else if (start is { } startDate)
            {
                gaps.Add(new LiquidityGapDto(startDate, point.Date, lowest, items.FirstOrDefault(item => item.Amount > 0 && item.CashFlowDate >= startDate)?.CashFlowDate));
                start = null;
                lowest = 0;
            }
        }
        if (start is { } openStart) gaps.Add(new LiquidityGapDto(openStart, null, lowest, items.FirstOrDefault(item => item.Amount > 0 && item.CashFlowDate >= openStart)?.CashFlowDate));
        return gaps;
    }
}
