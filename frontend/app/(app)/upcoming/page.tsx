"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, money, problemMessage, type UpcomingDto } from "@/lib/api-client";
import { useAuth } from "../../auth-context";

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
    return { today: localDate(now), in7: localDate(next7) };
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
      ...data.recurringOccurrences.map((item) => ({ id: item.id, kind: "Recurring", date: item.scheduledDate, title: item.templateName, amount: item.amount, currency: item.currency, meta: `${item.transactionType} / ${item.sourceAccountName ?? ""}${item.destinationAccountName ? ` -> ${item.destinationAccountName}` : ""}`, actions: <><button className="rounded border px-2 py-1 disabled:opacity-60" disabled={pendingActionId !== null} onClick={() => postOccurrence(item.id)}>{pendingActionId === item.id ? "Posting..." : "Post"}</button><button className="rounded border px-2 py-1 disabled:opacity-60" disabled={pendingActionId !== null} onClick={() => skipOccurrence(item.id)}>{pendingActionId === item.id ? "Skipping..." : "Skip"}</button><Link className="rounded border px-2 py-1" href="/recurring-transactions">Edit Template</Link></> })),
      ...data.installments.map((item) => ({ id: item.itemId, kind: "Installment", date: item.dueDate, title: item.merchant, amount: item.amount, currency: "TWD", meta: item.status, actions: <><button className="rounded border px-2 py-1 disabled:opacity-60" disabled={pendingActionId !== null} onClick={() => postInstallment(item.planId, item.itemId)}>{pendingActionId === item.itemId ? "Posting..." : "Post Installment"}</button><Link className="rounded border px-2 py-1" href="/credit-cards">View Plan</Link></> })),
      ...data.creditCardReminders.map((item) => ({ id: `${item.accountId}-${item.kind}-${item.date}`, kind: "Credit Card", date: item.date, title: item.accountName, amount: 0, currency: "TWD", meta: item.kind === "Closing" ? "Closing date" : "Payment due date", actions: <Link className="rounded border px-2 py-1" href="/credit-cards">View Credit Card</Link> }))
    ].sort((a, b) => a.date.localeCompare(b.date));
    return {
      overdue: rows.filter((row) => row.date < dateWindow.today),
      today: rows.filter((row) => row.date === dateWindow.today),
      next7: rows.filter((row) => row.date > dateWindow.today && row.date <= dateWindow.in7),
      later: rows.filter((row) => row.date > dateWindow.in7)
    };
  }, [data, dateWindow, pendingActionId]);

  return <section className="grid gap-6">
    <header><h1 className="text-3xl font-semibold">Upcoming</h1><p className="text-stone-600">Pending recurring items, installment postings, and credit card reminders.</p></header>
    {error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {isLoading ? <p>Loading...</p> : <div className="grid gap-4">{Object.entries({ Overdue: groups.overdue, Today: groups.today, "Next 7 Days": groups.next7, "Later This Month": groups.later }).map(([label, rows]) => <section key={label} className="rounded border border-stone-300 bg-white p-4"><h2 className="mb-3 font-semibold">{label}</h2>{rows.length === 0 ? <p className="text-sm text-stone-600">No items.</p> : <div className="grid gap-2">{rows.map((row) => <article key={row.id} className="flex flex-col gap-2 border-b border-stone-200 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{row.title}</p><p className="text-sm text-stone-600">{row.kind} / {row.date} / {row.meta}</p></div><div className="flex flex-wrap items-center gap-2 text-sm">{row.amount > 0 && <span className="font-semibold">{money(row.amount, row.currency)}</span>}{row.actions}</div></article>)}</div>}</section>)}</div>}
  </section>;
}
