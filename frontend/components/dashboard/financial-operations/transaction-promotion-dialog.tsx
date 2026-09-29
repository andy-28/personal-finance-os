"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { money, problemMessage, type AccountDto } from "@/lib/api-client";
import { financialOperationsApi, type FinancialEventDto, type FinancialEventKind, type OperationalItemDto, type PromoteTransactionRequest } from "@/lib/api/financial-operations";

type Props = {
  item: OperationalItemDto;
  accounts: AccountDto[];
  accessToken: string | null;
  refreshSession: () => Promise<string | null>;
  onClose: () => void;
  onPromoted: (event: FinancialEventDto) => Promise<void>;
};

export function TransactionPromotionDialog({ item, accounts, accessToken, refreshSession, onClose, onPromoted }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PromoteTransactionRequest>({
    name: item.title || "未命名財務事項",
    kind: "ConfirmedExpense",
    amount: Math.abs(item.amount),
    currencyCode: item.currencyCode,
    eventDate: item.financialDate,
    paymentSourceAccountId: item.paymentSourceAccountId ?? null,
    note: null
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!item.transactionId) return;
    setSaving(true);
    setError(null);
    try {
      const created = await financialOperationsApi.promoteTransaction(accessToken, refreshSession, item.transactionId, form);
      await onPromoted(created);
    } catch (reason) {
      setError(problemMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return <div className="game-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="transaction-promotion-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="game-panel financial-event-dialog" onSubmit={submit}>
      <div className="financial-event-dialog-head"><div><span>TRACK AS FINANCIAL WORK ITEM</span><h2 id="transaction-promotion-title">追蹤為財務事項</h2></div><button type="button" onClick={onClose} aria-label="關閉">×</button></div>
      {error && <div className="financial-ops-alert">{error}</div>}
      <div className="financial-system-derived">來源 {item.key} · 已入帳交易保持不變</div>
      <label className="ui-label">標題<input className="ui-input" value={form.name} maxLength={120} required onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <div className="financial-event-form-grid">
        <label className="ui-label">類型<select className="ui-input" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as FinancialEventKind })}><option value="ConfirmedExpense">已確認支出</option><option value="PlannedExpense">規劃支出</option></select></label>
        <label className="ui-label">金額<input className="ui-input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /><small>{money(form.amount, form.currencyCode)}</small></label>
      </div>
      <label className="ui-label">財務日期<input className="ui-input" type="date" required value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></label>
      <label className="ui-label">付款來源<select className="ui-input" value={form.paymentSourceAccountId ?? ""} onChange={(event) => setForm({ ...form, paymentSourceAccountId: event.target.value || null })}><option value="">未指定</option>{accounts.filter((account) => !account.isArchived).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type}</option>)}</select></label>
      <label className="ui-label">Description<textarea className="ui-input min-h-24" maxLength={1000} value={form.note ?? ""} onChange={(event) => setForm({ ...form, note: event.target.value || null })} /></label>
      <div className="financial-event-dialog-foot"><span>只建立 FIN operational context；不新增或修改 Ledger。</span><div><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button type="submit" isLoading={saving}>開始追蹤</Button></div></div>
    </form>
  </div>;
}
