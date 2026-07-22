"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GameWindow } from "@/components/ui/game-theme";
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

  async function submit(event: FormEvent, targetId: string | null = editingId) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ ...form, institutionName: form.institutionName || null });
      if (targetId) await apiFetch<AccountDto>(`/api/accounts/${targetId}`, accessToken, { method: "PUT", body }, refreshSession);
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

  function edit(account: AccountDto) {
    setEditingId(account.id);
    setForm({ name: account.name, type: account.type, currencyCode: account.currencyCode, institutionName: account.institutionName ?? "" });
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
      .map((element) => ({
        id: element.dataset.accountId ?? "",
        rect: element.getBoundingClientRect()
      }))
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
        <CardTitle title="新增帳戶" description="名稱、類型與幣別會影響後續交易選項。" />
        <form onSubmit={(event) => submit(event, null)} className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="ui-label">名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="ui-label">類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
          <label className="ui-label">幣別<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
          <label className="ui-label">金融機構<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
          <div className="flex items-end"><Button type="submit" className="w-full">{commonLabels.create}</Button></div>
        </form>
      </Card>

      {editingId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-fantasy-brown/45 p-4" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
          <GameWindow title="編輯帳戶" description="調整名稱、類型、幣別與金融機構。" className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <form onSubmit={(event) => submit(event, editingId)} className="grid gap-3 sm:grid-cols-2">
              <label className="ui-label sm:col-span-2">名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
              <label className="ui-label">類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
              <label className="ui-label">幣別<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
              <label className="ui-label sm:col-span-2">金融機構<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消</Button>
                <Button type="submit">{commonLabels.update}</Button>
              </div>
            </form>
          </GameWindow>
        </div>
      )}

      {isLoading ? <LoadingState /> : accounts.length === 0 ? <EmptyState title="尚未建立帳戶" description="先新增現金、銀行或信用卡帳戶，再開始記錄交易。" /> : (
        <div className="grid gap-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              role="button"
              tabIndex={0}
              data-account-id={account.id}
              aria-label={`編輯 ${account.name}`}
              onClick={() => {
                if (suppressNextClickRef.current || pointerMovedRef.current) {
                  suppressNextClickRef.current = false;
                  pointerMovedRef.current = false;
                  return;
                }
                edit(account);
              }}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); edit(account); } }}
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
              className={`cursor-pointer touch-none select-none transition-[transform,filter,opacity,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-[1.02] active:translate-y-0 ${draggedId === account.id ? "relative z-10 cursor-grabbing opacity-90 shadow-2xl duration-75" : ""} ${dragOverId === account.id ? "ring-2 ring-warning/70" : ""}`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-1 grid gap-1 rounded-ui border border-border/55 bg-fantasy-beige/65 p-2 shadow-inner" aria-hidden="true">
                    <span className="h-0.5 w-4 rounded bg-fantasy-brown/70" />
                    <span className="h-0.5 w-4 rounded bg-fantasy-brown/70" />
                    <span className="h-0.5 w-4 rounded bg-fantasy-brown/70" />
                  </span>
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{account.name}</h2>
                    <Badge tone={account.isArchived ? "neutral" : "success"}>{account.isArchived ? commonLabels.archived : commonLabels.active}</Badge>
                    {account.hasOpeningBalance && <Badge tone="success">已設定期初餘額</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{accountTypeLabels[account.type]} / {account.currencyCode}{account.institutionName ? ` / ${account.institutionName}` : ""}</p>
                  <p className="mt-3 text-sm"><span className="text-muted">{account.balanceLabel}</span> <span className="text-lg font-semibold">{money(account.balance, account.currencyCode)}</span></p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {account.isArchived
                    ? <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); restore(account.id); }}>{commonLabels.restore}</Button>
                    : <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); archive(account.id); }}>{commonLabels.archive}</Button>}
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
