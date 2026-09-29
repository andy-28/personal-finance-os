import { money } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import type { OperationalItemDto } from "@/lib/api/financial-operations";
import { kindLabels } from "./presentation";

export function FinancialTimeline({ items, selectedId, onSelect }: { items: OperationalItemDto[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <div className="financial-timeline-navigator">
    <div className="financial-event-navigator-head"><span>FINANCIAL TIMELINE</span><small>{items.length} NODES · FIN / CAP / TXN / SYSTEM</small></div>
    {items.length === 0 ? <div className="financial-ops-empty"><strong>沒有符合條件的時間軸事件</strong><span>調整搜尋或篩選條件。</span></div> : <div className="financial-timeline-track" role="listbox" aria-label="財務事件時間軸">{items.map((item) => <button role="option" aria-selected={item.id === selectedId} type="button" key={item.id} onClick={() => onSelect(item.id)}><span className="financial-timeline-date">{formatDate(item.financialDate)}</span><i aria-hidden="true" /><span className="financial-timeline-key">{item.key}</span><strong>{item.title}</strong><small>{recordLabel(item.recordType)} · {kindLabels[item.kind] ?? item.kind}</small><b className={item.amount > 0 ? "is-income" : item.isConditional ? "is-conditional" : ""}>{item.isConditional ? "? " : item.amount > 0 ? "+" : "−"}{money(Math.abs(item.amount), item.currencyCode)}</b></button>)}</div>}
  </div>;
}

function recordLabel(type: OperationalItemDto["recordType"]) { return type === "UserWorkItem" ? "FIN · WORK ITEM" : type === "CapturedInput" ? "CAP · CAPTURED INPUT" : type === "LedgerActivity" ? "TXN · LEDGER ACTIVITY" : "SYSTEM · DERIVED"; }
