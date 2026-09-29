import { Button } from "@/components/ui/button";
import { money } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import type { CashFlowItemDto, FinancialEventStatus, LiquidityProjectionDto } from "@/lib/api/financial-operations";
import { amountText, displayKey, kindLabels, statusLabels } from "./presentation";

export function FinancialEventDetail({ item, projection, open, onClose, onStatus }: { item: CashFlowItemDto | null; projection: LiquidityProjectionDto; open: boolean; onClose: () => void; onStatus: (item: CashFlowItemDto, status: FinancialEventStatus) => void }) {
  if (!item) return <aside className="financial-event-issue-detail"><div className="financial-ops-empty"><strong>未選擇事件</strong><span>從 Navigator 選擇一個 Financial Work Item。</span></div></aside>;
  const impact = cashFlowImpact(item, projection);
  return <aside className={`financial-event-issue-detail ${open ? "is-open" : ""}`} aria-label={`${item.title} 詳細資訊`}>
    <button type="button" className="financial-detail-close" onClick={onClose} aria-label="關閉事件詳情">×</button>
    <header>
      <div className="financial-detail-identity"><span>{displayKey(item)}</span><em>{item.financialEventId ? "USER EVENT" : "SYSTEM DERIVED"}</em></div>
      <h3>{item.title}</h3>
      <p>{kindLabels[item.kind] ?? item.kind}</p>
      <span className={`financial-status-badge status-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span>
      <strong className={`financial-detail-amount ${item.amount > 0 ? "is-income" : item.isConditional ? "is-conditional" : ""}`}>{amountText(item)}</strong>
    </header>

    <DetailSection title="FINANCIAL TIMING">
      <DetailRow label={item.kind === "CardPayment" ? "結帳日期" : "事件日期"} value={formatDate(item.date)} />
      <DetailRow label={item.kind === "ConditionalExpense" ? "結果日期" : item.kind === "ExpectedIncome" ? "預期日期" : "財務日期"} value={formatDate(item.cashFlowDate)} />
      <DetailRow label={item.kind === "ExpectedIncome" ? "入帳帳戶" : item.kind === "CardPayment" ? "扣款帳戶" : "付款來源"} value={item.paymentSourceName ?? "未指定"} />
    </DetailSection>

    <DetailSection title="CASH FLOW IMPACT">
      {item.isConditional ? <><DetailRow label="Baseline" value="Not included" /><DetailRow label="Conditional" value="Included" tone="warning" /></> : <><DetailRow label="Before" value={money(impact.before, item.currencyCode)} /><DetailRow label="After" value={money(impact.after, item.currencyCode)} tone={impact.after < 0 ? "danger" : undefined} /></>}
      <DetailRow label="Impact" value={amountText(item)} tone={item.amount > 0 ? "success" : item.isConditional ? "warning" : "danger"} />
      <DetailRow label="Baseline Lowest" value={money(projection.projectedLowestLiquidity, projection.currencyCode)} />
    </DetailSection>

    <DetailSection title="STATUS / METADATA">
      <DetailRow label="Source" value={item.source === "CreditCard" ? "Credit Card" : item.source === "Recurring" ? "Recurring Template" : "Financial Event"} />
      <DetailRow label="Derived" value={item.financialEventId ? "No" : "Yes"} />
      <DetailRow label="Ledger Impact" value="None until actual posting" />
      <DetailRow label="Scenario" value={item.isConditional ? "Conditional" : "Baseline"} />
    </DetailSection>

    {item.note && <p className="financial-event-note">{item.note}</p>}
    {item.financialEventId ? item.status !== "Completed" && item.status !== "Cancelled" && <div className="financial-event-actions">{item.status !== "Confirmed" && <Button size="sm" onClick={() => onStatus(item, "Confirmed")}>標記確認</Button>}<Button size="sm" variant="outline" onClick={() => onStatus(item, "Completed")}>完成</Button><Button size="sm" variant="ghost" onClick={() => onStatus(item, "Cancelled")}>取消</Button></div> : <div className="financial-system-derived">SYSTEM DERIVED · 由既有財務資料產生，不可直接編輯</div>}
  </aside>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="financial-detail-section"><h4>{title}</h4><dl>{children}</dl></section>; }
function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "warning" }) { return <div><dt>{label}</dt><dd className={tone ? `is-${tone}` : ""}>{value}</dd></div>; }

function cashFlowImpact(item: CashFlowItemDto, projection: LiquidityProjectionDto) {
  const points = [...projection.points].sort((a, b) => a.date.localeCompare(b.date));
  const index = points.findIndex((point) => point.date === item.cashFlowDate);
  const previous = index > 0 ? points[index - 1] : points[0];
  const before = item.isConditional ? previous?.conditionalLiquidity ?? projection.currentLiquidity : previous?.baselineLiquidity ?? projection.currentLiquidity;
  return { before, after: before + item.amount };
}
