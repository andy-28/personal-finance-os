"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, problemMessage, type AccountDto, type CategoryDto, type TransactionDto, type TransactionType } from "@/lib/api-client";
import { useAuth } from "../../../auth-context";

const today = new Date().toISOString().slice(0, 10);
const transactionTypes: TransactionType[] = ["Expense", "Income", "Transfer", "OpeningBalance"];

export default function NewTransactionPage() {
  const { accessToken, refreshSession } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDto[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryDto[]>([]);
  const [type, setType] = useState<TransactionType>("Expense");
  const [form, setForm] = useState({ accountId: "", categoryId: "", fromAccountId: "", toAccountId: "", amount: "", transactionDate: today, payee: "", note: "" });
  const [error, setError] = useState<string | null>(null);

  const flatIncome = useMemo(() => incomeCategories.flatMap((category) => [category, ...category.children]), [incomeCategories]);
  const flatExpense = useMemo(() => expenseCategories.flatMap((category) => [category, ...category.children]), [expenseCategories]);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const transferAccounts = activeAccounts.filter((account) => account.type !== "CreditCard" && account.type !== "Loan");
  const selectedAccount = activeAccounts.find((account) => account.id === form.accountId);

  async function load() {
    try {
      const [nextAccounts, nextIncome, nextExpense] = await Promise.all([
        apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Income", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Expense", accessToken, {}, refreshSession)
      ]);
      setAccounts(nextAccounts);
      setIncomeCategories(nextIncome);
      setExpenseCategories(nextExpense);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const amount = Number(form.amount);
      const common = { amount, transactionDate: form.transactionDate, note: form.note || null };
      let result: TransactionDto;
      if (type === "Income") {
        result = await apiFetch<TransactionDto>("/api/transactions/income", accessToken, { method: "POST", body: JSON.stringify({ accountId: form.accountId, categoryId: form.categoryId, payee: form.payee || null, ...common }) }, refreshSession);
      } else if (type === "Expense") {
        result = await apiFetch<TransactionDto>("/api/transactions/expense", accessToken, { method: "POST", body: JSON.stringify({ accountId: form.accountId, categoryId: form.categoryId, payee: form.payee || null, ...common }) }, refreshSession);
      } else if (type === "Transfer") {
        result = await apiFetch<TransactionDto>("/api/transactions/transfer", accessToken, { method: "POST", body: JSON.stringify({ fromAccountId: form.fromAccountId, toAccountId: form.toAccountId, ...common }) }, refreshSession);
      } else {
        result = await apiFetch<TransactionDto>(`/api/accounts/${form.accountId}/opening-balance`, accessToken, { method: "POST", body: JSON.stringify(common) }, refreshSession);
      }
      router.replace(`/transactions/${result.id}`);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  const categoryOptions = type === "Income" ? flatIncome : flatExpense;

  return (
    <section className="grid gap-6"><header><h1 className="text-3xl font-semibold">New transaction</h1><p className="text-stone-600">Create posted ledger entries for Sprint 2 transaction types.</p></header>{error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<form onSubmit={submit} className="grid gap-4 rounded border border-stone-300 bg-white p-4"><div className="grid gap-3 sm:grid-cols-4"><label className="grid gap-1 text-sm">Type<select className="rounded border px-3 py-2" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>{transactionTypes.map((candidate) => <option key={candidate}>{candidate}</option>)}</select></label><label className="grid gap-1 text-sm">Date<input className="rounded border px-3 py-2" type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></label><label className="grid gap-1 text-sm">Amount<input className="rounded border px-3 py-2" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>{type !== "Transfer" && <label className="grid gap-1 text-sm">Account<select className="rounded border px-3 py-2" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}><option value="">Choose account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} / {account.currencyCode}</option>)}</select></label>}</div>{type === "Transfer" && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">From account<select className="rounded border px-3 py-2" value={form.fromAccountId} onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}><option value="">Choose source</option>{transferAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} / {account.currencyCode}</option>)}</select></label><label className="grid gap-1 text-sm">To account<select className="rounded border px-3 py-2" value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}><option value="">Choose destination</option>{transferAccounts.filter((account) => !form.fromAccountId || account.currencyCode === accounts.find((a) => a.id === form.fromAccountId)?.currencyCode).map((account) => <option key={account.id} value={account.id}>{account.name} / {account.currencyCode}</option>)}</select></label></div>}{(type === "Income" || type === "Expense") && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Category<select className="rounded border px-3 py-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Choose category</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm">Payee<input className="rounded border px-3 py-2" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} /></label></div>}{type === "OpeningBalance" && selectedAccount?.hasOpeningBalance && <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">This account already has an active opening balance. Void the existing opening balance before creating another one.</p>}<label className="grid gap-1 text-sm">Note<textarea className="min-h-24 rounded border px-3 py-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><div><button className="rounded bg-stone-950 px-4 py-2 text-white">Create transaction</button></div></form></section>
  );
}
