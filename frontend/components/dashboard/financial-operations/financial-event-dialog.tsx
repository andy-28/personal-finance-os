"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { problemMessage, type AccountDto } from "@/lib/api-client";
import { todayInputValue } from "@/lib/formatters";
import { financialOperationsApi, type FinancialEventKind, type FinancialEventRequest } from "@/lib/api/financial-operations";

export function FinancialEventDialog({ accounts, accessToken, refreshSession, onClose, onSaved }: { accounts: AccountDto[]; accessToken: string | null; refreshSession: () => Promise<string | null>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FinancialEventRequest>({ name: "", kind: "ConfirmedExpense", amount: 0, currencyCode: "TWD", eventDate: todayInputValue(), resultDate: null, paymentSourceAccountId: null, relatedTransactionId: null, note: null });
  const sources = useMemo(() => accounts.filter((account) => !account.isArchived), [accounts]);
  const selectedAccount = sources.find((account) => account.id === form.paymentSourceAccountId);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try { await financialOperationsApi.createEvent(accessToken, refreshSession, { ...form, amount: Number(form.amount), resultDate: form.kind === "ConditionalExpense" ? form.resultDate : null }); await onSaved(); }
    catch (reason) { setError(problemMessage(reason)); } finally { setSaving(false); }
  }
  return <div className="game-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="financial-event-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="game-panel financial-event-dialog" onSubmit={submit}>
      <div className="financial-event-dialog-head"><div><span>FINANCIAL EVENT</span><h2 id="financial-event-dialog-title">新增財務事件</h2></div><button type="button" onClick={onClose} aria-label="關閉">×</button></div>
      {error && <div className="financial-ops-alert">{error}</div>}
      <label className="ui-label">名稱<input className="ui-input" value={form.name} maxLength={120} required onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <div className="financial-event-form-grid"><label className="ui-label">類型<select className="ui-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as FinancialEventKind })}><option value="ConfirmedExpense">已確認支出</option><option value="ConditionalExpense">條件式支出</option><option value="PlannedExpense">規劃支出</option></select></label><label className="ui-label">金額<input className="ui-input" type="number" min="0.01" step="0.01" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label></div>
      <div className="financial-event-form-grid"><label className="ui-label">事件日期<input className="ui-input" type="date" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></label>{form.kind === "ConditionalExpense" && <label className="ui-label">結果日期<input className="ui-input" type="date" required value={form.resultDate ?? ""} onChange={(e) => setForm({ ...form, resultDate: e.target.value })} /></label>}</div>
      <label className="ui-label">付款來源<select className="ui-input" value={form.paymentSourceAccountId ?? ""} onChange={(e) => setForm({ ...form, paymentSourceAccountId: e.target.value || null })}><option value="">未指定</option>{sources.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type}</option>)}</select>{selectedAccount?.type === "CreditCard" && <small>現金流日期將依信用卡結帳／繳款日推估；不會改變卡片 outstanding。</small>}</label>
      <label className="ui-label">備註<textarea className="ui-input min-h-24" maxLength={1000} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value || null })} /></label>
      <div className="financial-event-dialog-foot"><span>此操作不會建立 Ledger transaction。</span><div><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button type="submit" isLoading={saving}>建立事件</Button></div></div>
    </form>
  </div>;
}
