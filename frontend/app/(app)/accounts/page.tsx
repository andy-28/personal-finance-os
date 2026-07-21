"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type AccountSummaryDto, type AccountType } from "@/lib/api-client";
import { accountTypeLabels, commonLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

const accountTypes: AccountType[] = ["Cash", "Checking", "Savings", "CreditCard", "Investment", "Loan", "Other"];
const emptyForm = { name: "", type: "Cash" as AccountType, currencyCode: "TWD", institutionName: "" };

export default function AccountsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [summary, setSummary] = useState<AccountSummaryDto>({ currencies: [] });
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const [nextAccounts, nextSummary] = await Promise.all([
        apiFetch<AccountDto[]>(`/api/accounts?includeArchived=${includeArchived}`, accessToken, {}, refreshSession),
        apiFetch<AccountSummaryDto>("/api/accounts/summary", accessToken, {}, refreshSession)
      ]);
      setAccounts(nextAccounts);
      setSummary(nextSummary);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, includeArchived]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ ...form, institutionName: form.institutionName || null });
      if (editingId) await apiFetch<AccountDto>(`/api/accounts/${editingId}`, accessToken, { method: "PUT", body }, refreshSession);
      else await apiFetch<AccountDto>("/api/accounts", accessToken, { method: "POST", body }, refreshSession);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function archive(id: string) { await apiFetch<void>(`/api/accounts/${id}`, accessToken, { method: "DELETE" }, refreshSession); await load(); }
  async function restore(id: string) { await apiFetch<AccountDto>(`/api/accounts/${id}/restore`, accessToken, { method: "POST" }, refreshSession); await load(); }
  async function move(index: number, delta: number) {
    const active = accounts.filter((account) => !account.isArchived);
    const target = index + delta;
    if (target < 0 || target >= active.length) return;
    [active[index], active[target]] = [active[target], active[index]];
    await apiFetch<void>("/api/accounts/reorder", accessToken, { method: "PUT", body: JSON.stringify({ accountIds: active.map((account) => account.id) }) }, refreshSession);
    await load();
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        title="帳戶"
        description="所有餘額都由已入帳的 ledger entries 即時計算，不在帳戶資料表另存 balance。"
        actions={<label className="flex min-h-10 items-center gap-2 rounded-ui border bg-surface px-3 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> {commonLabels.showArchived}</label>}
      />
      {error && <ErrorState message={error} />}

      {summary.currencies.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {summary.currencies.map((row) => (
            <Card key={row.currencyCode}>
              <CardTitle title={row.currencyCode} description="資產、負債與淨值" />
              <div className="mt-4 grid gap-2 text-sm">
                <SummaryRow label={commonLabels.assetBalance} value={money(row.assetBalance, row.currencyCode)} />
                <SummaryRow label="負債餘額" value={money(row.liabilityBalance, row.currencyCode)} />
                <SummaryRow label={commonLabels.netWorth} value={money(row.netBalance, row.currencyCode)} strong />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardTitle title={editingId ? "編輯帳戶" : "新增帳戶"} description="名稱、類型與幣別會影響後續交易選項。" />
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="ui-label">名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="ui-label">類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
          <label className="ui-label">幣別<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
          <label className="ui-label">金融機構<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
          <div className="flex items-end"><Button type="submit" className="w-full">{editingId ? commonLabels.update : commonLabels.create}</Button></div>
        </form>
      </Card>

      {isLoading ? <LoadingState /> : accounts.length === 0 ? <EmptyState title="尚未建立帳戶" description="先新增現金、銀行或信用卡帳戶，再開始記錄交易。" /> : (
        <div className="grid gap-3">
          {accounts.map((account, index) => (
            <Card key={account.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{account.name}</h2>
                    <Badge tone={account.isArchived ? "neutral" : "success"}>{account.isArchived ? commonLabels.archived : commonLabels.active}</Badge>
                    {account.hasOpeningBalance && <Badge tone="success">已設定期初餘額</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{accountTypeLabels[account.type]} / {account.currencyCode}{account.institutionName ? ` / ${account.institutionName}` : ""}</p>
                  <p className="mt-3 text-sm"><span className="text-muted">{account.balanceLabel}</span> <span className="text-lg font-semibold">{money(account.balance, account.currencyCode)}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => move(index, -1)} disabled={account.isArchived}>上移</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => move(index, 1)} disabled={account.isArchived}>下移</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(account.id); setForm({ name: account.name, type: account.type, currencyCode: account.currencyCode, institutionName: account.institutionName ?? "" }); }}>{commonLabels.edit}</Button>
                  {account.isArchived ? <Button type="button" variant="outline" size="sm" onClick={() => restore(account.id)}>{commonLabels.restore}</Button> : <Button type="button" variant="outline" size="sm" onClick={() => archive(account.id)}>{commonLabels.archive}</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <p className={`flex justify-between border-t pt-2 first:border-t-0 first:pt-0 ${strong ? "font-semibold" : ""}`}><span className="text-muted">{label}</span><span>{value}</span></p>;
}
