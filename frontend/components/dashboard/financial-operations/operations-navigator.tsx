import { money } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import type { OperationalItemDto } from "@/lib/api/financial-operations";
import { kindLabels } from "./presentation";

export function OperationsNavigator({ items, selectedId, rangeLabel, onSelect }: { items: OperationalItemDto[]; selectedId: string | null; rangeLabel: string; onSelect: (id: string) => void }) {
  return <div className="financial-event-navigator operations-navigator">
    <div className="financial-event-navigator-head"><span>OPERATIONS NAVIGATOR</span><small>{items.length} ITEMS · {rangeLabel}</small></div>
    <div className="financial-event-column-head" aria-hidden="true"><span>KEY / OPERATIONAL ITEM</span><span>DATE</span><span>AMOUNT</span></div>
    <div className="financial-event-navigator-list" role="listbox" aria-label="財務事項">
      {items.length === 0 ? <div className="financial-ops-empty"><strong>沒有符合條件的財務事項</strong><span>調整搜尋、篩選或 View。</span></div> : items.map((item) => <button role="option" aria-selected={item.id === selectedId} type="button" key={item.id} className="financial-event-issue-row" onClick={() => onSelect(item.id)}>
        <span className="financial-event-status-dot" data-status={item.needsAction ? "pending" : item.status.toLowerCase()} aria-hidden="true" />
        <span className="financial-event-key">{item.key}</span>
        <span className="financial-event-issue-copy"><strong>{item.title}</strong><small>{recordLabel(item.recordType)} · {kindLabels[item.kind] ?? item.kind}</small><em>{item.paymentSourceName ?? sourceLabel(item.source)}{item.needsAction ? " · NEEDS ACTION" : ""}{item.recordType === "LedgerActivity" && item.relatedFinancialEventId ? ` · Tracked by FIN-${shortKey(item.relatedFinancialEventId)}` : item.recordType === "UserWorkItem" && item.transactionId ? ` · Related TXN-${shortKey(item.transactionId)}` : ""}</em></span>
        <time>{formatDate(item.financialDate)}</time>
        <b className={item.amount > 0 ? "is-income" : item.isConditional ? "is-conditional" : ""}>{item.isConditional ? "? " : item.amount > 0 ? "+" : "−"}{money(Math.abs(item.amount), item.currencyCode)}</b>
      </button>)}
    </div>
  </div>;
}

function recordLabel(type: OperationalItemDto["recordType"]) { return type === "UserWorkItem" ? "USER WORK ITEM" : type === "CapturedInput" ? "CAPTURED INPUT" : type === "LedgerActivity" ? "LEDGER ACTIVITY" : "SYSTEM DERIVED"; }
function sourceLabel(source: string) { return source === "IosShortcut" ? "iPhone Shortcut" : source === "CreditCard" ? "Credit Card" : source === "Recurring" ? "Recurring" : source; }
function shortKey(id: string) { return id.replaceAll("-", "").slice(0, 6).toUpperCase(); }
