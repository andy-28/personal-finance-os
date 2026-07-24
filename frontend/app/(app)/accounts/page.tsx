"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GameInspectPanel, GameInspectRow, GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type AccountSummaryDto, type AccountType, type PagedTransactionsDto, type TransactionDto } from "@/lib/api-client";
import { todayInputValue } from "@/lib/formatters";
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
  const [balanceForm, setBalanceForm] = useState({ targetBalance: "", openingAmount: 0, date: todayInputValue() });
  const [openingTransaction, setOpeningTransaction] = useState<TransactionDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pointerStartYRef = useRef(0);
  const pointerDraggingRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const dragTargetIdRef = useRef<string | null>(null);
  const suppressNextClickRef = useRef(false);

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

  useEffect(() => {
    if (!editingId && !isCreateOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setEditingId(null);
      setIsCreateOpen(false);
      setForm(emptyForm);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingId, isCreateOpen]);

  async function submit(event: FormEvent, targetId: string | null = editingId) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ ...form, institutionName: form.institutionName || null });
      if (targetId) {
        await apiFetch<AccountDto>(`/api/accounts/${targetId}`, accessToken, { method: "PUT", body }, refreshSession);
        await saveBalanceTarget(targetId);
      } else {
        const createdAccount = await apiFetch<AccountDto>("/api/accounts", accessToken, { method: "POST", body }, refreshSession);
        const openingAmount = Number(balanceForm.targetBalance);
        if (Number.isFinite(openingAmount) && Math.abs(openingAmount) >= 0.005) {
          await apiFetch<TransactionDto>("/api/transactions/opening-balance", accessToken, {
            method: "POST",
            body: JSON.stringify({
              accountId: createdAccount.id,
              amount: openingAmount,
              transactionDate: balanceForm.date || todayInputValue(),
              note: "Opening balance"
            })
          }, refreshSession);
        }
      }
      setForm(emptyForm);
      setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() });
      setOpeningTransaction(null);
      setEditingId(null);
      setIsCreateOpen(false);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function archive(id: string) { await apiFetch<void>(`/api/accounts/${id}`, accessToken, { method: "DELETE" }, refreshSession); await load(); }
  async function restore(id: string) { await apiFetch<AccountDto>(`/api/accounts/${id}/restore`, accessToken, { method: "POST" }, refreshSession); await load(); }

  async function saveBalanceTarget(accountId: string) {
    const targetBalance = Number(balanceForm.targetBalance);
    if (!Number.isFinite(targetBalance)) return;
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account) return;
    const existingOpeningAmount = openingTransaction?.entries.find((entry) => entry.accountId === accountId)?.amount ?? balanceForm.openingAmount;
    const nonOpeningBalance = account.balance - existingOpeningAmount;
    const nextOpeningAmount = targetBalance - nonOpeningBalance;
    if (Math.abs(nextOpeningAmount - existingOpeningAmount) < 0.005) return;
    const body = JSON.stringify({ accountId, amount: nextOpeningAmount, transactionDate: balanceForm.date || todayInputValue(), note: "Opening balance adjustment" });
    if (openingTransaction) await apiFetch<TransactionDto>(`/api/transactions/${openingTransaction.id}`, accessToken, { method: "PUT", body }, refreshSession);
    else if (nextOpeningAmount !== 0) await apiFetch<TransactionDto>("/api/transactions/opening-balance", accessToken, { method: "POST", body }, refreshSession);
  }

  async function edit(account: AccountDto) {
    setEditingId(account.id);
    setForm({ name: account.name, type: account.type, currencyCode: account.currencyCode, institutionName: account.institutionName ?? "" });
    setBalanceForm({ targetBalance: String(account.balance), openingAmount: 0, date: todayInputValue() });
    setOpeningTransaction(null);
    try {
      const query = new URLSearchParams({ accountId: account.id, type: "OpeningBalance", status: "Posted", page: "1", pageSize: "1" });
      const result = await apiFetch<PagedTransactionsDto>(`/api/transactions?${query}`, accessToken, {}, refreshSession);
      const opening = result.items[0] ?? null;
      setOpeningTransaction(opening);
      const openingAmount = opening?.entries.find((entry) => entry.accountId === account.id)?.amount ?? 0;
      setBalanceForm({ targetBalance: String(account.balance), openingAmount, date: opening?.transactionDate ?? todayInputValue() });
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  function resetDragState() {
    pointerDraggingRef.current = false;
    dragTargetIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
    setDragOffsetY(0);
  }

  function dragTargetFromY(y: number, sourceId: string) {
    const candidates = [...document.querySelectorAll<HTMLElement>("[data-account-id]")]
      .map((element) => ({ id: element.dataset.accountId ?? "", rect: element.getBoundingClientRect() }))
      .filter((candidate) => candidate.id && candidate.id !== sourceId && accounts.some((account) => account.id === candidate.id && !account.isArchived));
    if (candidates.length === 0) return null;
    const containing = candidates.find((candidate) => y >= candidate.rect.top && y <= candidate.rect.bottom);
    if (containing) return containing.id;
    return candidates
      .map((candidate) => ({ ...candidate, distance: Math.abs(y - (candidate.rect.top + candidate.rect.height / 2)) }))
      .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
  }

  async function reorder(sourceId: string, targetId: string) {
    const active = accounts.filter((account) => !account.isArchived);
    const sourceIndex = active.findIndex((account) => account.id === sourceId);
    const targetIndex = active.findIndex((account) => account.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const [source] = active.splice(sourceIndex, 1);
    active.splice(targetIndex, 0, source);
    setAccounts((current) => {
      const nextActive = [...active];
      return current.map((account) => account.isArchived ? account : nextActive.shift() ?? account);
    });
    await apiFetch<void>("/api/accounts/reorder", accessToken, { method: "PUT", body: JSON.stringify({ accountIds: active.map((account) => account.id) }) }, refreshSession);
    await load();
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        title="Accounts"
        description="Ledger entries calculate every balance in real time. No duplicated balance state is stored on accounts."
        actions={<label className="flex min-h-10 items-center gap-2 rounded-ui border border-border/70 bg-surface/80 px-3 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> {commonLabels.showArchived}</label>}
      />
      {error && <ErrorState message={error} />}

      {summary.currencies.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {summary.currencies.map((row) => (
            <Card key={row.currencyCode}>
              <CardTitle title={row.currencyCode} description="Assets / Liabilities" />
              <div className="grid gap-2 text-sm">
                <SummaryRow label={commonLabels.assetBalance} value={money(row.assetBalance, row.currencyCode)} />
                <SummaryRow label="Liability balance" value={money(row.liabilityBalance, row.currencyCode)} />
                <SummaryRow label={commonLabels.netWorth} value={money(row.netBalance, row.currencyCode)} strong />
              </div>
            </Card>
          ))}
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={() => { setIsCreateOpen(false); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); }}>
          <GameWindow title="新增帳戶" description="Account setup" className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <GameInspectPanel title={form.name || "新帳戶"} subtitle={accountTypeLabels[form.type]} icon={<AccountGlyph type={form.type} />}>
              <form onSubmit={(event) => submit(event, null)} className="grid gap-4 sm:grid-cols-2">
                <label className="ui-label sm:col-span-2">帳戶名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
                <label className="ui-label">帳戶類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
                <label className="ui-label">幣別<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
                <label className="ui-label sm:col-span-2">金融機構<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
                <label className="ui-label">初始金額<input className="ui-input" type="number" step="0.01" placeholder="0" value={balanceForm.targetBalance} onChange={(e) => setBalanceForm({ ...balanceForm, targetBalance: e.target.value })} /></label>
                <label className="ui-label">期初日期<input className="ui-input" type="date" value={balanceForm.date} onChange={(e) => setBalanceForm({ ...balanceForm, date: e.target.value })} /></label>
                <p className="text-xs text-muted sm:col-span-2">輸入初始金額會建立一筆期初餘額交易，帳戶餘額仍由 Ledger 自動計算。</p>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); }}>{commonLabels.cancel}</Button>
                  <Button type="submit">{commonLabels.create}</Button>
                </div>
              </form>
            </GameInspectPanel>
          </GameWindow>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={() => { setEditingId(null); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setOpeningTransaction(null); }}>
          <GameWindow title="Inspect Account" description="Account information" className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <GameInspectPanel title={form.name || "New account"} subtitle={form.type} icon={<AccountGlyph type={form.type} />}>
              <form onSubmit={(event) => submit(event, editingId)} className="grid gap-4 sm:grid-cols-2">
                <label className="ui-label sm:col-span-2">Name<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
                <label className="ui-label">Type<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
                <label className="ui-label">Currency<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
                <label className="ui-label sm:col-span-2">Institution<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
                <label className="ui-label">目標餘額<input className="ui-input" type="number" step="0.01" value={balanceForm.targetBalance} onChange={(e) => setBalanceForm({ ...balanceForm, targetBalance: e.target.value })} /></label>
                <label className="ui-label">調整日期<input className="ui-input" type="date" value={balanceForm.date} onChange={(e) => setBalanceForm({ ...balanceForm, date: e.target.value })} /></label>
                <p className="text-xs text-muted sm:col-span-2">更新目標餘額會透過期初餘額調整交易修正，不會直接覆寫帳戶餘額。</p>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setOpeningTransaction(null); }}>{commonLabels.cancel}</Button>
                  <Button type="submit">{commonLabels.update}</Button>
                </div>
              </form>
            </GameInspectPanel>
          </GameWindow>
        </div>
      )}

      <div className="game-section-divider">
        <div className="game-section-title">
          <strong>帳戶槽位</strong>
          <span>{accounts.length} slots loaded</span>
        </div>
      </div>

      {isLoading ? <LoadingState /> : accounts.length === 0 ? <EmptyState title="No accounts yet" description="Create a cash, bank, or credit card account before posting transactions." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              role="button"
              tabIndex={0}
              data-account-id={account.id}
              aria-label={`Edit ${account.name}`}
              onClick={() => {
                if (suppressNextClickRef.current || pointerMovedRef.current) {
                  suppressNextClickRef.current = false;
                  pointerMovedRef.current = false;
                  return;
                }
                void edit(account);
              }}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void edit(account); } }}
              onPointerDown={(event) => {
                if (account.isArchived) return;
                if (event.button !== 0) return;
                if ((event.target as HTMLElement).closest("button,input,select,textarea,a")) return;
                pointerStartYRef.current = event.clientY;
                pointerDraggingRef.current = false;
                pointerMovedRef.current = false;
                setDraggedId(account.id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!draggedId) return;
                const offsetY = event.clientY - pointerStartYRef.current;
                if (Math.abs(offsetY) < 10) return;
                pointerDraggingRef.current = true;
                pointerMovedRef.current = true;
                suppressNextClickRef.current = true;
                setDragOffsetY(offsetY);
                const targetId = dragTargetFromY(event.clientY, draggedId);
                dragTargetIdRef.current = targetId;
                setDragOverId(targetId);
              }}
              onPointerUp={(event) => {
                const sourceId = draggedId;
                const targetId = sourceId ? dragTargetFromY(event.clientY, sourceId) ?? dragTargetIdRef.current : null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                const shouldReorder = Boolean(pointerDraggingRef.current && sourceId && targetId);
                if (pointerDraggingRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  suppressNextClickRef.current = true;
                }
                resetDragState();
                if (sourceId && targetId && shouldReorder) void reorder(sourceId, targetId);
              }}
              onPointerCancel={resetDragState}
              style={draggedId === account.id ? { transform: `translateY(${dragOffsetY}px) scale(1.01)` } : undefined}
              className={`game-item-card game-account-slot cursor-pointer touch-none select-none transition-[transform,filter,opacity,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0 ${draggedId === account.id ? "relative z-10 cursor-grabbing opacity-90 shadow-2xl duration-75" : ""} ${dragOverId === account.id ? "ring-2 ring-primary/70" : ""}`}
            >
              <div className="game-item-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="game-slot game-slot-md" aria-hidden="true"><AccountGlyph type={account.type} /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold">{account.name}</h2>
                      <Badge tone={account.isArchived ? "neutral" : "success"}>{account.isArchived ? commonLabels.archived : commonLabels.active}</Badge>
                      {account.hasOpeningBalance && <Badge tone="success">Opening balance</Badge>}
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{accountTypeLabels[account.type]} / {account.currencyCode}{account.institutionName ? ` / ${account.institutionName}` : ""}</p>
                  </div>
                </div>
              </div>
              <div className="game-item-body grid gap-3 sm:grid-cols-2">
                <GameInspectRow label="目前餘額" value={money(account.balance, account.currencyCode)} strong />
                <GameInspectRow label="餘額來源" value={account.balanceLabel} />
                <GameInspectRow label="幣別" value={account.currencyCode} />
              </div>
              <div className="game-item-footer flex flex-wrap justify-end gap-2">
                {account.isArchived
                  ? <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); restore(account.id); }}>{commonLabels.restore}</Button>
                  : <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); archive(account.id); }}>{commonLabels.archive}</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <button
        type="button"
        className="game-floating-add ui-focus"
        aria-label="新增帳戶"
        title="新增帳戶"
        onClick={() => { setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setIsCreateOpen(true); }}
      >
        +
      </button>
    </section>
  );
}

function AccountGlyph({ type }: { type: AccountType }) {
  const labels: Record<AccountType, string> = {
    Cash: "CA",
    Checking: "BK",
    Savings: "SV",
    CreditCard: "CR",
    Investment: "IV",
    Loan: "LN",
    Other: "OS"
  };
  return <span className="text-sm font-black tracking-[0.08em]">{labels[type]}</span>;
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <p className={`flex justify-between border-t border-border/55 pt-2 first:border-t-0 first:pt-0 ${strong ? "font-semibold" : ""}`}><span className="text-muted">{label}</span><span>{value}</span></p>;
}
