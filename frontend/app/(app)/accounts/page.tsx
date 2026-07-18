"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, money, problemMessage, type AccountDto, type AccountSummaryDto, type AccountType } from "@/lib/api-client";
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
    const active = accounts.filter((a) => !a.isArchived);
    const target = index + delta;
    if (target < 0 || target >= active.length) return;
    [active[index], active[target]] = [active[target], active[index]];
    await apiFetch<void>("/api/accounts/reorder", accessToken, { method: "PUT", body: JSON.stringify({ accountIds: active.map((a) => a.id) }) }, refreshSession);
    await load();
  }

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Accounts</h1>
          <p className="text-stone-600">Balances are calculated from posted ledger entries.</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived</label>
      </header>

      {summary.currencies.length > 0 && <div className="grid gap-3 sm:grid-cols-3">{summary.currencies.map((row) => <article key={row.currencyCode} className="rounded border border-stone-300 bg-white p-4"><p className="text-sm font-medium text-stone-600">{row.currencyCode}</p><div className="mt-3 grid gap-2 text-sm"><p className="flex justify-between"><span>Assets</span><span className="font-semibold">{money(row.assetBalance, row.currencyCode)}</span></p><p className="flex justify-between"><span>Liabilities</span><span className="font-semibold">{money(row.liabilityBalance, row.currencyCode)}</span></p><p className="flex justify-between border-t border-stone-200 pt-2"><span>Net</span><span className="font-semibold">{money(row.netBalance, row.currencyCode)}</span></p></div></article>)}</div>}
      {error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <form onSubmit={submit} className="grid gap-3 rounded border border-stone-300 bg-white p-4 sm:grid-cols-5">
        <input className="rounded border border-stone-300 px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="rounded border border-stone-300 px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <input className="rounded border border-stone-300 px-3 py-2" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} />
        <input className="rounded border border-stone-300 px-3 py-2" placeholder="Institution" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} />
        <button className="rounded bg-stone-950 px-4 py-2 text-white">{editingId ? "Update" : "Create"}</button>
      </form>

      {isLoading ? <p>Loading...</p> : accounts.length === 0 ? <p className="rounded border border-stone-300 bg-white p-5 text-stone-600">No accounts yet.</p> : <div className="grid gap-3">{accounts.map((account, index) => <article key={account.id} className="rounded border border-stone-300 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{account.name}</h2><p className="text-sm text-stone-600">{account.type} / {account.currencyCode}{account.institutionName ? ` / ${account.institutionName}` : ""} / {account.isArchived ? "Archived" : "Active"}</p><p className="mt-2 text-sm"><span className="text-stone-600">{account.balanceLabel}</span> <span className="font-semibold">{money(account.balance, account.currencyCode)}</span>{account.hasOpeningBalance && <span className="ml-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">Opening balance set</span>}</p></div><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-1 text-sm" onClick={() => move(index, -1)} disabled={account.isArchived}>Up</button><button className="rounded border px-3 py-1 text-sm" onClick={() => move(index, 1)} disabled={account.isArchived}>Down</button><button className="rounded border px-3 py-1 text-sm" onClick={() => { setEditingId(account.id); setForm({ name: account.name, type: account.type, currencyCode: account.currencyCode, institutionName: account.institutionName ?? "" }); }}>Edit</button>{account.isArchived ? <button className="rounded border px-3 py-1 text-sm" onClick={() => restore(account.id)}>Restore</button> : <button className="rounded border px-3 py-1 text-sm" onClick={() => archive(account.id)}>Archive</button>}</div></div></article>)}</div>}
    </section>
  );
}

