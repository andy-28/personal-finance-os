"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type UpcomingDto } from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { installmentStatusLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

export default function UpcomingPage() {
  const { accessToken, refreshSession } = useAuth();
  const [data, setData] = useState<UpcomingDto>({ recurringOccurrences: [], installments: [], creditCardReminders: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [dateWindow] = useState(() => {
    const now = new Date();
    const next7 = new Date(now);
    next7.setDate(now.getDate() + 7);
    return { today: todayInputValue(), in7: `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, "0")}-${String(next7.getDate()).padStart(2, "0")}` };
  });

  async function load() {
    setIsLoading(true);
    try {
      setData(await apiFetch<UpcomingDto>("/api/recurring-transactions/upcoming", accessToken, {}, refreshSession));
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    if (pendingActionId) return;
    setPendingActionId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

  async function postOccurrence(id: string) { await runAction(id, () => apiFetch(`/api/recurring-transactions/occurrences/${id}/post`, accessToken, { method: "POST" }, refreshSession)); }
  async function skipOccurrence(id: string) { await runAction(id, () => apiFetch<void>(`/api/recurring-transactions/occurrences/${id}/skip`, accessToken, { method: "POST" }, refreshSession)); }
  async function postInstallment(planId: string, itemId: string) { await runAction(itemId, () => apiFetch(`/api/credit-cards/installments/${planId}/schedule-items/${itemId}/post`, accessToken, { method: "POST", body: JSON.stringify({ postingDate: null, categoryId: null, note: null }) }, refreshSession)); }

  const groups = useMemo(() => {
    const rows = [
      ...data.recurringOccurrences.map((item) => ({ id: item.id, kind: "循環交易", date: item.scheduledDate, title: item.templateName, amount: item.amount, currency: item.currency, meta: `${transactionTypeLabels[item.transactionType]} / ${item.sourceAccountName ?? ""}${item.destinationAccountName ? ` -> ${item.destinationAccountName}` : ""}`, actions: <><Button variant="outline" size="sm" disabled={pendingActionId !== null} isLoading={pendingActionId === item.id} onClick={() => postOccurrence(item.id)}>入帳</Button><Button variant="ghost" size="sm" disabled={pendingActionId !== null} onClick={() => skipOccurrence(item.id)}>略過</Button><Link href="/recurring-transactions"><Button variant="outline" size="sm">編輯樣板</Button></Link></> })),
      ...data.installments.map((item) => ({ id: item.itemId, kind: "分期", date: item.dueDate, title: item.merchant, amount: item.amount, currency: "TWD", meta: installmentStatusLabels[item.status] ?? item.status, actions: <><Button variant="outline" size="sm" disabled={pendingActionId !== null} isLoading={pendingActionId === item.itemId} onClick={() => postInstallment(item.planId, item.itemId)}>分期入帳</Button><Link href="/credit-cards"><Button variant="outline" size="sm">查看分期</Button></Link></> })),
      ...data.creditCardReminders.map((item) => ({ id: `${item.accountId}-${item.kind}-${item.date}`, kind: "信用卡", date: item.date, title: item.accountName, amount: 0, currency: "TWD", meta: item.kind === "Closing" ? "結帳日" : "繳款截止日", actions: <Link href="/credit-cards"><Button variant="outline" size="sm">查看信用卡</Button></Link> }))
    ].sort((a, b) => a.date.localeCompare(b.date));
    return {
      "已逾期": rows.filter((row) => row.date < dateWindow.today),
      "今天": rows.filter((row) => row.date === dateWindow.today),
      "未來 7 天": rows.filter((row) => row.date > dateWindow.today && row.date <= dateWindow.in7),
      "本月稍後": rows.filter((row) => row.date > dateWindow.in7)
    };
  }, [data, dateWindow, pendingActionId]);

  return (
    <section className="grid gap-6">
      <PageHeader title="即將發生" description="集中處理循環交易、分期入帳與信用卡結帳/繳款提醒。" />
      {error && <ErrorState message={error} />}
      {isLoading ? <LoadingState /> : (
        <div className="grid gap-4">
          {Object.entries(groups).map(([label, rows]) => (
            <Card key={label}>
              <h2 className="mb-3 font-semibold">{label}</h2>
              {rows.length === 0 ? <EmptyState title="這個區段沒有待辦" /> : <div className="grid gap-2">{rows.map((row) => <article key={row.id} className="flex flex-col gap-2 border-b py-3 last:border-0 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{row.title}</p><p className="text-sm text-muted">{row.kind} / {formatDate(row.date)} / {row.meta}</p></div><div className="flex flex-wrap items-center gap-2 text-sm">{row.amount > 0 && <span className="font-semibold">{money(row.amount, row.currency)}</span>}{row.actions}</div></article>)}</div>}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
