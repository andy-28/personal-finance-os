"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type TransactionDto } from "@/lib/api-client";
import { useAuth } from "../../../auth-context";

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, refreshSession } = useAuth();
  const [transaction, setTransaction] = useState<TransactionDto | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDto[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryDto[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ accountId: "", categoryId: "", fromAccountId: "", toAccountId: "", amount: "", transactionDate: "", payee: "", note: "" });
  const [error, setError] = useState<string | null>(null);

  const flatIncome = useMemo(() => incomeCategories.flatMap((category) => [category, ...category.children]), [incomeCategories]);
  const flatExpense = useMemo(() => expenseCategories.flatMap((category) => [category, ...category.children]), [expenseCategories]);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const transferAccounts = activeAccounts.filter((account) => account.type !== "CreditCard" && account.type !== "Loan");

  async function load() {
    try {
      const [nextTransaction, nextAccounts, nextIncome, nextExpense] = await Promise.all([
        apiFetch<TransactionDto>(`/api/transactions/${params.id}`, accessToken, {}, refreshSession),
        apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Income", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Expense", accessToken, {}, refreshSession)
      ]);
      setTransaction(nextTransaction);
      setAccounts(nextAccounts);
      setIncomeCategories(nextIncome);
      setExpenseCategories(nextExpense);
      setForm(toForm(nextTransaction));
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, params.id]);

  function toForm(item: TransactionDto) {
    const negative = item.entries.find((entry) => entry.amount < 0);
    const positive = item.entries.find((entry) => entry.amount > 0);
    return {
      accountId: item.entries[0]?.accountId ?? "",
      categoryId: item.category?.id ?? "",
      fromAccountId: negative?.accountId ?? "",
      toAccountId: positive?.accountId ?? "",
      amount: String(item.displayAmount),
      transactionDate: item.transactionDate,
      payee: item.payee ?? "",
      note: item.note ?? ""
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!transaction) return;
    try {
      const body = JSON.stringify({ accountId: form.accountId || null, categoryId: form.categoryId || null, fromAccountId: form.fromAccountId || null, toAccountId: form.toAccountId || null, amount: Number(form.amount), transactionDate: form.transactionDate, payee: form.payee || null, note: form.note || null });
      const updated = await apiFetch<TransactionDto>(`/api/transactions/${transaction.id}`, accessToken, { method: "PUT", body }, refreshSession);
      setTransaction(updated);
      setForm(toForm(updated));
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function voidTransaction() {
    if (!transaction) return;
    if (!confirm("Void this transaction?")) return;
    try {
      await apiFetch<void>(`/api/transactions/${transaction.id}`, accessToken, { method: "DELETE" }, refreshSession);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  if (!transaction) return <section className="grid gap-4">{error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<p>Loading...</p></section>;

  const currency = accounts.find((account) => account.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD";
  const categoryOptions = transaction.type === "Income" ? flatIncome : flatExpense;

  return (
    <section className="grid gap-6"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Link className="text-sm underline" href="/transactions">Back to transactions</Link><h1 className="mt-2 text-3xl font-semibold">{transaction.type} transaction</h1><p className="text-stone-600">{transaction.status} / {transaction.transactionDate}</p></div><div className="flex gap-2">{transaction.status === "Posted" && <button className="rounded border px-4 py-2" onClick={() => setIsEditing(!isEditing)}>{isEditing ? "Cancel" : "Edit"}</button>}{transaction.status === "Posted" && <button className="rounded border border-rose-300 px-4 py-2 text-rose-700" onClick={voidTransaction}>Void</button>}</div></header>{error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<article className="rounded border border-stone-300 bg-white p-4"><div className="grid gap-3 sm:grid-cols-3"><p><span className="block text-sm text-stone-600">Amount</span><span className="text-xl font-semibold">{money(transaction.displayAmount, currency)}</span></p><p><span className="block text-sm text-stone-600">Category</span>{transaction.category?.name ?? "-"}</p><p><span className="block text-sm text-stone-600">Payee</span>{transaction.payee ?? "-"}</p></div><div className="mt-4 grid gap-2">{transaction.entries.map((entry) => <p key={entry.accountId} className="flex justify-between rounded bg-stone-100 px-3 py-2 text-sm"><span className="font-medium">{entry.accountName}</span><span>{money(entry.amount, currency)}</span></p>)}</div>{transaction.note && <p className="mt-4 whitespace-pre-wrap text-sm text-stone-700">{transaction.note}</p>}</article>{isEditing && <form onSubmit={submit} className="grid gap-4 rounded border border-stone-300 bg-white p-4"><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm">Date<input className="rounded border px-3 py-2" type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></label><label className="grid gap-1 text-sm">Amount<input className="rounded border px-3 py-2" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>{transaction.type !== "Transfer" && <label className="grid gap-1 text-sm">Account<select className="rounded border px-3 py-2" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}</div>{transaction.type === "Transfer" && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">From account<select className="rounded border px-3 py-2" value={form.fromAccountId} onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}>{transferAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="grid gap-1 text-sm">To account<select className="rounded border px-3 py-2" value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}>{transferAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div>}{(transaction.type === "Income" || transaction.type === "Expense") && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Category<select className="rounded border px-3 py-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm">Payee<input className="rounded border px-3 py-2" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} /></label></div>}<label className="grid gap-1 text-sm">Note<textarea className="min-h-24 rounded border px-3 py-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><div><button className="rounded bg-stone-950 px-4 py-2 text-white">Save changes</button></div></form>}</section>
  );
}


