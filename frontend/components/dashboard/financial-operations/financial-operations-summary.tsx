import { money } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import type { LiquidityProjectionDto } from "@/lib/api/financial-operations";

export function FinancialOperationsSummary({ projection, needsActionCount }: { projection: LiquidityProjectionDto; needsActionCount: number }) {
  const cells = [
    { label: "WINDOW", value: `${projection.horizonDays} DAYS`, meta: `${projection.eventCount} EVENTS` },
    { label: "CURRENT", value: money(projection.currentLiquidity, projection.currencyCode) },
    { label: "BASELINE LOW", value: money(projection.projectedLowestLiquidity, projection.currencyCode), meta: formatDate(projection.projectedLowestLiquidityDate), danger: projection.projectedLowestLiquidity < 0 },
    { label: "CONDITIONAL LOW", value: money(projection.conditionalLowestLiquidity, projection.currencyCode), meta: formatDate(projection.conditionalLowestLiquidityDate), danger: projection.conditionalLowestLiquidity < 0 },
    { label: "EXPOSURE", value: money(projection.conditionalExposure, projection.currencyCode), meta: `${projection.pendingCount} EVENT PENDING` },
    { label: "NEEDS ACTION", value: `${needsActionCount}`, meta: "CAPTURE / RESULT" }
  ];
  return <div className="financial-ops-summary-strip">{cells.map((cell) => <div key={cell.label} className={cell.danger ? "is-danger" : ""}><span>{cell.label}</span><strong>{cell.value}</strong>{cell.meta && <small>{cell.meta}</small>}</div>)}</div>;
}
