import { formatDate } from "@/lib/formatters";
import type { CashFlowItemDto } from "@/lib/api/financial-operations";
import { amountText, displayKey, kindLabels, statusLabels } from "./presentation";

export function FinancialEventNavigator({ items, selectedId, rangeLabel, onSelect }: { items: CashFlowItemDto[]; selectedId: string | null; rangeLabel: string; onSelect: (id: string) => void }) {
  return <div className="financial-event-navigator">
    <div className="financial-event-navigator-head"><span>EVENT NAVIGATOR</span><small>{items.length} ITEMS · {rangeLabel}</small></div>
    <div className="financial-event-column-head" aria-hidden="true"><span>KEY / EVENT</span><span>DATE</span><span>AMOUNT</span></div>
    <div className="financial-event-navigator-list" role="listbox" aria-label="財務事件">
      {items.length === 0 ? <div className="financial-ops-empty"><strong>沒有符合條件的事件</strong><span>調整搜尋或篩選條件。</span></div> : items.map((item) => <button role="option" aria-selected={item.id === selectedId} type="button" key={item.id} className="financial-event-issue-row" onClick={() => onSelect(item.id)}>
        <span className="financial-event-status-dot" data-status={item.status.toLowerCase()} aria-hidden="true" />
        <span className="financial-event-key">{displayKey(item)}</span>
        <span className="financial-event-issue-copy"><strong>{item.title}</strong><small>{kindLabels[item.kind] ?? item.kind} · {statusLabels[item.status] ?? item.status}</small><em>{item.paymentSourceName ?? (item.source === "CreditCard" ? "信用卡" : item.source === "Recurring" ? "固定交易" : "未指定來源")}</em></span>
        <time>{formatDate(item.cashFlowDate)}</time>
        <b className={item.amount > 0 ? "is-income" : item.isConditional ? "is-conditional" : ""}>{amountText(item)}</b>
      </button>)}
    </div>
  </div>;
}
