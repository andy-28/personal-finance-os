"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type TransactionDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";
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
    return { accountId: item.entries[0]?.accountId ?? "", categoryId: item.category?.id ?? "", fromAccountId: negative?.accountId ?? "", toAccountId: positive?.accountId ?? "", amount: String(item.displayAmount), transactionDate: item.transactionDate, payee: item.payee ?? "", note: item.note ?? "" };
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
    if (!transaction || !confirm("確定要作廢這筆交易？")) return;
    try {
      await apiFetch<void>(`/api/transactions/${transaction.id}`, accessToken, { method: "DELETE" }, refreshSession);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  if (!transaction) return <section className="grid gap-4">{error && <ErrorState message={error} />}<LoadingState /></section>;

  const currency = accounts.find((account) => account.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD";
  const categoryOptions = transaction.type === "Income" ? flatIncome : flatExpense;

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-medium underline" href="/transactions">返回交易流水</Link>
          <h1 className="mt-2 text-3xl font-semibold">{transactionTypeLabels[transaction.type]}交易</h1>
          <p className="text-sm text-muted">{formatDate(transaction.transactionDate)} / {transactionStatusLabels[transaction.status]}</p>
        </div>
        <div className="flex gap-2">{transaction.status === "Posted" && <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>{isEditing ? "取消" : "編輯"}</Button>}{transaction.status === "Posted" && <Button variant="danger" onClick={voidTransaction}>作廢</Button>}</div>
      </header>
      {error && <ErrorState message={error} />}
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="金額" value={money(transaction.displayAmount, currency)} emphasize />
          <Field label="分類" value={transaction.category?.name ?? "-"} />
          <Field label="商家 / 對象" value={transaction.payee ?? "-"} />
        </div>
        <div className="mt-4 grid gap-2">{transaction.entries.map((entry) => <p key={entry.accountId} className="flex justify-between rounded-ui bg-surface-muted px-3 py-2 text-sm"><span className="font-medium">{entry.accountName}</span><span className={entry.amount < 0 ? "text-expense" : "text-income"}>{money(entry.amount, currency)}</span></p>)}</div>
        {transaction.note && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{transaction.note}</p>}
        <div className="mt-4"><Badge tone={transaction.status === "Posted" ? "success" : "neutral"}>{transactionStatusLabels[transaction.status]}</Badge></div>
      </Card>
      {isEditing && <Card><CardTitle title="編輯交易" description="修改交易會重新建立分錄，但不改變交易類型。" /><form onSubmit={submit} className="mt-4 grid gap-4"><div className="grid gap-3 md:grid-cols-3"><label className="ui-label">日期<input className="ui-input" type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></label><label className="ui-label">金額<input className="ui-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>{transaction.type !== "Transfer" && <label className="ui-label">帳戶<select className="ui-input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}</div>{transaction.type === "Transfer" && <div className="grid gap-3 md:grid-cols-2"><AccountSelect label="轉出帳戶" accounts={transferAccounts} value={form.fromAccountId} onChange={(value) => setForm({ ...form, fromAccountId: value })} /><AccountSelect label="轉入帳戶" accounts={transferAccounts} value={form.toAccountId} onChange={(value) => setForm({ ...form, toAccountId: value })} /></div>}{(transaction.type === "Income" || transaction.type === "Expense") && <div className="grid gap-3 md:grid-cols-2"><label className="ui-label">分類<select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="ui-label">商家 / 對象<input className="ui-input" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} /></label></div>}<label className="ui-label">備註<textarea className="ui-input min-h-24" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><div><Button type="submit">儲存變更</Button></div></form></Card>}
    </section>
  );
}

function Field({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return <p><span className="block text-sm text-muted">{label}</span><span className={emphasize ? "text-xl font-semibold" : ""}>{value}</span></p>;
}

function AccountSelect({ label, accounts, value, onChange }: { label: string; accounts: AccountDto[]; value: string; onChange: (value: string) => void }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>;
}
