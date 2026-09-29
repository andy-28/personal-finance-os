"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { money, type TransactionDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import type { FinancialEventDto, FinancialEventStatus, LiquidityProjectionDto, OperationalItemDto } from "@/lib/api/financial-operations";
import type { TransactionCaptureDto } from "@/lib/api/transaction-captures";
import { kindLabels, statusLabels } from "./presentation";

type Props = {
  item: OperationalItemDto | null;
  event?: FinancialEventDto;
  capture?: TransactionCaptureDto;
  captures: TransactionCaptureDto[];
  transactions: TransactionDto[];
  events: FinancialEventDto[];
  projection: LiquidityProjectionDto;
  open: boolean;
  onClose: () => void;
  onStatus: (eventId: string, status: FinancialEventStatus) => Promise<void>;
  onAddChecklist: (eventId: string, text: string) => Promise<void>;
  onToggleChecklist: (eventId: string, itemId: string, completed: boolean) => Promise<void>;
  onLinkCapture: (eventId: string, captureId: string) => Promise<void>;
  onUnlinkCapture: (eventId: string, captureId: string) => Promise<void>;
  onPromoteTransaction: (item: OperationalItemDto) => void;
  onLinkTransaction: (eventId: string, transactionId: string) => Promise<void>;
  onUnlinkTransaction: (eventId: string, transactionId: string) => Promise<void>;
  onViewFinancialEvent: (eventId: string) => void;
  onDismissCapture: (capture: TransactionCaptureDto) => Promise<void>;
};

export function WorkItemDetail(props: Props) {
  const { item, event, capture, open, onClose } = props;
  if (!item) return <aside className="financial-event-issue-detail work-item-page"><div className="financial-ops-empty"><strong>未選擇財務事項</strong><span>從 Operations Navigator 選擇一個 Work Item。</span></div></aside>;
  return <aside className={`financial-event-issue-detail work-item-page ${open ? "is-open" : ""}`} aria-label={`${item.title} 詳細資訊`}>
    <button type="button" className="financial-detail-close" onClick={onClose} aria-label="關閉詳情">×</button>
    <header>
      <div className="financial-detail-identity"><span>{item.key}</span><em>{recordLabel(item.recordType)}</em></div>
      <h3>{item.title}</h3>
      <p>{kindLabels[item.kind] ?? item.kind}</p>
      <span className={`financial-status-badge status-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span>
      {item.needsAction && <span className="financial-needs-action">NEEDS ACTION</span>}
      <strong className={`financial-detail-amount ${item.amount > 0 ? "is-income" : item.isConditional ? "is-conditional" : ""}`}>{item.isConditional ? "? " : item.amount > 0 ? "+" : "−"}{money(Math.abs(item.amount), item.currencyCode)}</strong>
    </header>
    {event ? <FinancialEventPage {...props} event={event} /> : capture ? <CapturePage {...props} capture={capture} /> : item.recordType === "LedgerActivity" ? <LedgerActivityPage {...props} item={item} /> : <DerivedPage item={item} projection={props.projection} />}
  </aside>;
}

function FinancialEventPage({ event, captures, transactions, events, onStatus, onAddChecklist, onToggleChecklist, onLinkCapture, onUnlinkCapture, onLinkTransaction, onUnlinkTransaction }: Props & { event: FinancialEventDto }) {
  const [text, setText] = useState("");
  const [captureId, setCaptureId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionQuery, setTransactionQuery] = useState("");
  const availableCaptures = useMemo(() => captures.filter((capture) => !capture.relatedFinancialEvent && !event.relatedCaptures.some((related) => related.id === capture.id)), [captures, event.relatedCaptures]);
  const linkedTransactionIds = useMemo(() => new Set(events.flatMap((candidate) => candidate.relatedTransactionId ? [candidate.relatedTransactionId] : [])), [events]);
  const availableTransactions = useMemo(() => { const query = transactionQuery.trim().toLocaleLowerCase(); return transactions.filter((transaction) => transaction.status === "Posted" && !linkedTransactionIds.has(transaction.id) && (!query || `${transaction.payee ?? ""} ${transaction.note ?? ""}`.toLocaleLowerCase().includes(query))).slice(0, 20); }, [transactions, linkedTransactionIds, transactionQuery]);
  async function addChecklist(e: React.FormEvent) { e.preventDefault(); if (!text.trim()) return; await onAddChecklist(event.id, text.trim()); setText(""); }
  async function linkCapture() { if (!captureId) return; await onLinkCapture(event.id, captureId); setCaptureId(""); }
  return <>
    <section className="financial-detail-section work-item-properties"><h4>PROPERTIES</h4><dl>
      <DetailRow label="金額" value={money(event.amount, event.currencyCode)} />
      <DetailRow label="付款方式" value={event.paymentSourceName ?? "未指定"} />
      <DetailRow label="事件日期" value={formatDate(event.eventDate)} />
      <DetailRow label="預計現金影響" value={formatDate(event.cashFlowDate)} />
      {event.resultDate && <DetailRow label="結果日期" value={formatDate(event.resultDate)} />}
      <DetailRow label="來源" value="Manual / Financial Event" />
      <DetailRow label="建立" value={dateTime(event.createdAtUtc)} />
      <DetailRow label="更新" value={dateTime(event.updatedAtUtc)} />
    </dl></section>
    <section className="work-item-content-section"><h4>DESCRIPTION</h4><p>{event.note || "尚未新增 Description。"}</p></section>
    <section className="work-item-content-section"><h4>CHECKLIST</h4>
      <div className="work-item-checklist">{event.checklist.length === 0 ? <p className="work-item-empty-copy">尚無 Checklist。</p> : event.checklist.map((entry) => <label key={entry.id}><input type="checkbox" checked={entry.isCompleted} onChange={() => void onToggleChecklist(event.id, entry.id, !entry.isCompleted)} /><span className={entry.isCompleted ? "is-complete" : ""}>{entry.text}</span></label>)}</div>
      <form className="work-item-inline-form" onSubmit={addChecklist}><input value={text} maxLength={240} onChange={(e) => setText(e.target.value)} placeholder="新增 Checklist 項目…" /><Button size="sm" type="submit" disabled={!text.trim()}>新增</Button></form>
    </section>
    <section className="work-item-content-section"><h4>RELATIONS</h4>
      <div className="work-item-relations">{event.paymentSourceName && <div><span>PAYMENT</span><strong>{event.paymentSourceName}</strong></div>}{event.relatedCaptures.map((related) => <div key={related.id}><span>CAP-{related.id.replaceAll("-", "").slice(0, 6).toUpperCase()}</span><strong>{related.description} · {money(related.amount, related.currencyCode)}</strong><button type="button" onClick={() => void onUnlinkCapture(event.id, related.id)}>移除連結</button></div>)}{event.relatedTransaction && <div><span>{event.relatedTransaction.key}</span><strong>{event.relatedTransaction.title} · {money(event.relatedTransaction.amount, event.relatedTransaction.currencyCode)} · {formatDate(event.relatedTransaction.transactionDate)} · {statusLabels[event.relatedTransaction.status] ?? event.relatedTransaction.status}</strong><small>{event.relatedTransaction.paymentSourceName ?? "未指定付款來源"}</small><button type="button" onClick={() => { if (window.confirm("解除這筆 Ledger Transaction 的關聯？原始交易不會被修改。")) void onUnlinkTransaction(event.id, event.relatedTransaction!.id); }}>解除關聯</button></div>}</div>
      {availableCaptures.length > 0 && <div className="work-item-inline-form"><select value={captureId} onChange={(e) => setCaptureId(e.target.value)}><option value="">選擇 Capture…</option>{availableCaptures.map((candidate) => <option key={candidate.id} value={candidate.id}>CAP-{candidate.id.replaceAll("-", "").slice(0, 6).toUpperCase()} · {candidate.description} · {money(candidate.amount, candidate.currency)}</option>)}</select><Button size="sm" variant="outline" disabled={!captureId} onClick={() => void linkCapture()}>建立 Relation</Button></div>}
      {!event.relatedTransaction && <div className="work-item-transaction-picker"><input value={transactionQuery} onChange={(e) => setTransactionQuery(e.target.value)} placeholder="搜尋近期 Payee / Memo…" /><div className="work-item-inline-form"><select value={transactionId} onChange={(e) => setTransactionId(e.target.value)}><option value="">選擇已入帳交易…</option>{availableTransactions.map((transaction) => <option key={transaction.id} value={transaction.id}>{formatDate(transaction.transactionDate)} · {transaction.payee ?? transaction.type} · {money(transaction.displayAmount, event.currencyCode)}</option>)}</select><Button size="sm" variant="outline" disabled={!transactionId} onClick={() => void onLinkTransaction(event.id, transactionId)}>連結已入帳交易</Button></div></div>}
      <p className="work-item-boundary">Relation 僅表示財務事項相關，不代表 reconciliation、matching 或 Ledger confirmation。</p>
    </section>
    <section className="work-item-content-section"><h4>ACTIVITY</h4><div className="work-item-activity">{event.activity.length === 0 ? <p className="work-item-empty-copy">尚無 Activity。</p> : event.activity.map((activity) => <div key={activity.id}><time>{dateTime(activity.occurredAtUtc)}</time><span>{activity.description}</span></div>)}</div></section>
    {event.status !== "Completed" && <div className="financial-event-actions work-item-status-actions"><label>STATUS<select value={event.status} onChange={(e) => void onStatus(event.id, e.target.value as FinancialEventStatus)}>{(["Planned", "Pending", "Confirmed", "Completed", "Cancelled"] as FinancialEventStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>{event.kind === "ConditionalExpense" && event.status === "Pending" && <><Button size="sm" onClick={() => void onStatus(event.id, "Confirmed")}>中選</Button><Button size="sm" variant="ghost" onClick={() => void onStatus(event.id, "Cancelled")}>未中選</Button></>}</div>}
    <div className="financial-system-derived">FINANCIAL WORK ITEM · 不會直接建立 Ledger Transaction</div>
  </>;
}

function CapturePage({ capture, events, onLinkCapture, onDismissCapture }: Props & { capture: TransactionCaptureDto }) {
  const [eventId, setEventId] = useState("");
  return <>
    <section className="financial-detail-section work-item-properties"><h4>CAPTURE PROPERTIES</h4><dl><DetailRow label="Captured" value={dateTime(capture.capturedAt)} /><DetailRow label="Occurred" value={dateTime(capture.occurredAt)} /><DetailRow label="Source" value={capture.source === "IosShortcut" ? "iPhone Shortcut" : "Manual"} /><DetailRow label="Payment" value={capture.paymentInstrumentName} /><DetailRow label="Status" value={`${capture.status} / Unverified`} tone="warning" /></dl></section>
    <section className="work-item-content-section"><h4>DESCRIPTION</h4><p>{capture.note || capture.merchantRaw || "尚無額外 Description。"}</p></section>
    <section className="work-item-content-section"><h4>RELATIONS</h4>{capture.relatedFinancialEvent ? <div className="work-item-relations"><div><span>FIN-{capture.relatedFinancialEvent.id.replaceAll("-", "").slice(0, 6).toUpperCase()}</span><strong>{capture.relatedFinancialEvent.name}</strong></div></div> : <div className="work-item-inline-form"><select value={eventId} onChange={(e) => setEventId(e.target.value)}><option value="">選擇 Financial Event…</option>{events.filter((event) => event.status !== "Cancelled").map((event) => <option key={event.id} value={event.id}>FIN-{event.id.replaceAll("-", "").slice(0, 6).toUpperCase()} · {event.name}</option>)}</select><Button size="sm" variant="outline" disabled={!eventId} onClick={() => void onLinkCapture(eventId, capture.id)}>建立 Relation</Button></div>}<p className="work-item-boundary">Capture 仍是未驗證輸入；Relation ≠ Reconciliation。</p></section>
    {capture.status === "Pending" && <div className="financial-event-actions"><Button size="sm" variant="outline" onClick={() => void onDismissCapture(capture)}>忽略</Button></div>}
    <div className="financial-system-derived">CAPTURED INPUT · Ledger / Balance / Projection 均不受影響</div>
  </>;
}

function DerivedPage({ item, projection }: { item: OperationalItemDto; projection: LiquidityProjectionDto }) { return <><section className="financial-detail-section work-item-properties"><h4>DERIVED PROPERTIES</h4><dl><DetailRow label="Financial Date" value={formatDate(item.financialDate)} /><DetailRow label="Payment" value={item.paymentSourceName ?? "系統資料"} /><DetailRow label="Source" value={item.source} /><DetailRow label="Scenario" value={item.isConditional ? "Conditional" : "Baseline"} /><DetailRow label="Baseline Lowest" value={money(projection.projectedLowestLiquidity, projection.currencyCode)} /></dl></section>{item.description && <section className="work-item-content-section"><h4>DESCRIPTION</h4><p>{item.description}</p></section>}<div className="financial-system-derived">SYSTEM DERIVED · 由既有財務資料即時計算，不可編輯</div></>; }
function LedgerActivityPage({ item, onPromoteTransaction, onViewFinancialEvent }: Props & { item: OperationalItemDto }) { const canPromote = item.kind === "Expense" || item.kind === "CreditCardPurchase"; return <><section className="financial-detail-section work-item-properties"><h4>LEDGER PROPERTIES</h4><dl><DetailRow label="Transaction ID" value={item.transactionId ?? "-"} /><DetailRow label="Transaction Date" value={formatDate(item.financialDate)} /><DetailRow label="Account" value={item.paymentSourceName ?? "未指定"} /><DetailRow label="Source" value="Posted Ledger Transaction" /><DetailRow label="Status" value={statusLabels[item.status] ?? item.status} /></dl></section>{item.description && <section className="work-item-content-section"><h4>DESCRIPTION</h4><p>{item.description}</p></section>}<section className="work-item-content-section"><h4>TRACKING</h4>{item.relatedFinancialEventId ? <div className="work-item-relations"><div><span>FIN-{item.relatedFinancialEventId.replaceAll("-", "").slice(0, 6).toUpperCase()}</span><strong>{item.relatedFinancialEventName ?? "Financial Work Item"}</strong><Button size="sm" variant="outline" onClick={() => onViewFinancialEvent(item.relatedFinancialEventId!)}>查看財務事項</Button></div></div> : canPromote ? <Button size="sm" variant="outline" onClick={() => onPromoteTransaction(item)}>追蹤為財務事項</Button> : <p className="work-item-empty-copy">目前 Financial Event 類型僅支援支出追蹤；此 Ledger Activity 保持唯讀。</p>}</section><div className="financial-system-derived">LEDGER ACTIVITY · 唯讀顯示，不建立或修改帳務資料</div></>; }
function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "warning" }) { return <div><dt>{label}</dt><dd className={tone ? `is-${tone}` : ""}>{value}</dd></div>; }
function recordLabel(type: OperationalItemDto["recordType"]) { return type === "UserWorkItem" ? "USER WORK ITEM" : type === "CapturedInput" ? "CAPTURED INPUT" : type === "LedgerActivity" ? "LEDGER ACTIVITY" : "SYSTEM DERIVED"; }
function dateTime(value: string) { return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
