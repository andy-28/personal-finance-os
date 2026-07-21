"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { apiFetch, problemMessage, type AccountDto, type CategoryDto, type TransactionDto, type TransactionType } from "@/lib/api-client";
import { todayInputValue } from "@/lib/formatters";
import { accountTypeLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../../auth-context";

const transactionTypes: TransactionType[] = ["Expense", "Income", "Transfer", "OpeningBalance"];

export default function NewTransactionPage() {
  const { accessToken, refreshSession } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDto[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryDto[]>([]);
  const [type, setType] = useState<TransactionType>("Expense");
  const [form, setForm] = useState({ accountId: "", categoryId: "", fromAccountId: "", toAccountId: "", amount: "", transactionDate: todayInputValue(), payee: "", note: "" });
  const [error, setError] = useState<string | null>(null);

  const flatIncome = useMemo(() => incomeCategories.flatMap((category) => [category, ...category.children]), [incomeCategories]);
  const flatExpense = useMemo(() => expenseCategories.flatMap((category) => [category, ...category.children]), [expenseCategories]);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const transferAccounts = activeAccounts.filter((account) => account.type !== "CreditCard" && account.type !== "Loan");
  const selectedAccount = activeAccounts.find((account) => account.id === form.accountId);
  const categoryOptions = type === "Income" ? flatIncome : flatExpense;

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

  return (
    <section className="grid gap-6">
      <PageHeader title="新增交易" description="建立交易後會立即產生已入帳分錄，並更新相關帳戶餘額。" />
      {error && <ErrorState message={error} />}
      <Card>
        <CardTitle title="交易內容" description="依交易類型填寫必要欄位；轉帳會建立一正一負兩筆分錄。" />
        <form onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="ui-label">類型<select className="ui-input" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>{transactionTypes.map((candidate) => <option key={candidate} value={candidate}>{transactionTypeLabels[candidate]}</option>)}</select></label>
            <label className="ui-label">日期<input className="ui-input" type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></label>
            <label className="ui-label">金額<input className="ui-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            {type !== "Transfer" && <label className="ui-label">帳戶<select className="ui-input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}><option value="">選擇帳戶</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} / {accountTypeLabels[account.type]} / {account.currencyCode}</option>)}</select></label>}
          </div>
          {type === "Transfer" && <div className="grid gap-3 md:grid-cols-2"><AccountSelect label="轉出帳戶" accounts={transferAccounts} value={form.fromAccountId} onChange={(value) => setForm({ ...form, fromAccountId: value })} /><AccountSelect label="轉入帳戶" accounts={transferAccounts.filter((account) => !form.fromAccountId || account.currencyCode === accounts.find((candidate) => candidate.id === form.fromAccountId)?.currencyCode)} value={form.toAccountId} onChange={(value) => setForm({ ...form, toAccountId: value })} /></div>}
          {(type === "Income" || type === "Expense") && <div className="grid gap-3 md:grid-cols-2"><label className="ui-label">分類<select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">選擇分類</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="ui-label">商家 / 對象<input className="ui-input" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} /></label></div>}
          {type === "OpeningBalance" && selectedAccount?.hasOpeningBalance && <p className="rounded-ui border border-warning/30 bg-warning/10 p-3 text-sm text-warning">此帳戶已經有有效的期初餘額。若要重設，請先作廢既有期初餘額交易。</p>}
          <label className="ui-label">備註<textarea className="ui-input min-h-24" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div><Button type="submit">建立交易</Button></div>
        </form>
      </Card>
    </section>
  );
}

function AccountSelect({ label, accounts, value, onChange }: { label: string; accounts: AccountDto[]; value: string; onChange: (value: string) => void }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">選擇帳戶</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} / {account.currencyCode}</option>)}</select></label>;
}
