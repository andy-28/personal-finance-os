import { Button } from "@/components/ui/button";
import { money } from "@/lib/api-client";
import type { TransactionCaptureDto } from "@/lib/api/transaction-captures";

export function CaptureInbox({ captures, selectedId, open, onSelect, onClose, onDismiss }: { captures: TransactionCaptureDto[]; selectedId: string | null; open: boolean; onSelect: (id: string) => void; onClose: () => void; onDismiss: (capture: TransactionCaptureDto) => void }) {
  const selected = captures.find((capture) => capture.id === selectedId) ?? captures[0] ?? null;
  return <div className="financial-ops-work-area">
    <div className="financial-event-navigator capture-inbox-navigator">
      <div className="financial-event-navigator-head"><span>CAPTURE INBOX</span><small>{captures.length} PENDING · UNVERIFIED</small></div>
      <div className="financial-event-column-head" aria-hidden="true"><span>KEY / CAPTURE</span><span>CAPTURED</span><span>AMOUNT</span></div>
      <div className="financial-event-navigator-list" role="listbox" aria-label="待處理 Capture">
        {captures.length === 0 ? <div className="financial-ops-empty"><strong>Inbox 已清空</strong><span>新的 Shortcut Capture 會顯示在這裡；不會自動進入 Ledger。</span></div> : captures.map((capture) => <button role="option" aria-selected={capture.id === selected?.id} type="button" key={capture.id} className="financial-event-issue-row" onClick={() => onSelect(capture.id)}>
          <span className="financial-event-status-dot" data-status="pending" aria-hidden="true" />
          <span className="financial-event-key">CAP-{capture.id.slice(0, 6).toUpperCase()}</span>
          <span className="financial-event-issue-copy"><strong>{capture.description}</strong><small>CAPTURE · {sourceLabel(capture.source)}</small><em>{capture.paymentInstrumentName}</em></span>
          <time>{timeLabel(capture.capturedAt)}</time>
          <b className="is-conditional">{money(capture.amount, capture.currency)}</b>
        </button>)}
      </div>
    </div>
    <CaptureDetail capture={selected} open={open} onClose={onClose} onDismiss={onDismiss} />
  </div>;
}

function CaptureDetail({ capture, open, onClose, onDismiss }: { capture: TransactionCaptureDto | null; open: boolean; onClose: () => void; onDismiss: (capture: TransactionCaptureDto) => void }) {
  if (!capture) return <aside className="financial-event-issue-detail"><div className="financial-ops-empty"><strong>沒有待處理 Capture</strong><span>Capture 是未驗證輸入，不會影響帳務與預測。</span></div></aside>;
  return <aside className={`financial-event-issue-detail ${open ? "is-open" : ""}`} aria-label={`${capture.description} Capture 詳細資訊`}>
    <button type="button" className="financial-detail-close" onClick={onClose} aria-label="關閉 Capture 詳情">×</button>
    <header>
      <div className="financial-detail-identity"><span>CAP-{capture.id.slice(0, 6).toUpperCase()}</span><em>UNVERIFIED INPUT</em></div>
      <h3>{capture.description}</h3>
      <p>TRANSACTION CAPTURE</p>
      <span className="financial-status-badge status-pending">PENDING</span>
      <strong className="financial-detail-amount is-conditional">{money(capture.amount, capture.currency)}</strong>
    </header>
    <section className="financial-detail-section"><h4>CAPTURE DETAILS</h4><dl>
      <DetailRow label="Captured" value={dateTimeLabel(capture.capturedAt)} />
      <DetailRow label="Occurred" value={dateTimeLabel(capture.occurredAt)} />
      <DetailRow label="Source" value={sourceLabel(capture.source)} />
      <DetailRow label="Payment" value={capture.paymentInstrumentName} />
      <DetailRow label="Instrument" value={capture.paymentInstrumentType === "CreditCard" ? "Credit Card" : "Account"} />
      <DetailRow label="Status" value="Pending / Unverified" tone="warning" />
    </dl></section>
    <section className="financial-detail-section"><h4>FINANCIAL SAFETY</h4><dl><DetailRow label="Ledger Impact" value="None" /><DetailRow label="Balance Impact" value="None" /><DetailRow label="Projection Impact" value="None" /></dl></section>
    {capture.merchantRaw && <p className="financial-event-note">Merchant raw: {capture.merchantRaw}</p>}
    {capture.note && <p className="financial-event-note">{capture.note}</p>}
    <div className="financial-event-actions"><Button size="sm" variant="outline" onClick={() => onDismiss(capture)}>忽略</Button></div>
    <div className="financial-system-derived">CAPTURE ≠ TRANSACTION · 尚未寫入 Ledger</div>
  </aside>;
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "warning" }) { return <div><dt>{label}</dt><dd className={tone ? `is-${tone}` : ""}>{value}</dd></div>; }
function sourceLabel(source: TransactionCaptureDto["source"]) { return source === "IosShortcut" ? "iPhone Shortcut" : "Manual"; }
function dateTimeLabel(value: string) { return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function timeLabel(value: string) { const date = new Date(value); const today = new Date(); return date.toDateString() === today.toDateString() ? new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit" }).format(date) : new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit" }).format(date); }
