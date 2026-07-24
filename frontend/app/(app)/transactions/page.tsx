"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type PagedTransactionsDto, type TransactionDto, type TransactionStatus, type TransactionType, type UpcomingDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { commonLabels, transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

const transactionTypes: Array<"" | TransactionType> = ["", "Income", "Expense", "Transfer", "OpeningBalance", "CreditCardPurchase", "CreditCardRefund", "CreditCardPayment"];
const statuses: TransactionStatus[] = ["Posted", "Voided"];
const editableCategoryTypes: TransactionType[] = ["Income", "Expense", "CreditCardPurchase"];
const emptyEditForm = { accountId: "", categoryId: "", fromAccountId: "", toAccountId: "", amount: "", transactionDate: "", payee: "", note: "" };

export default function TransactionsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [data, setData] = useState<PagedTransactionsDto>({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 });
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDto[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryDto[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingDto>({ recurringOccurrences: [], installments: [], creditCardReminders: [] });
  const [filters, setFilters] = useState({ from: "", to: "", accountId: "", categoryId: "", type: "" as "" | TransactionType, status: "Posted" as TransactionStatus, page: 1 });
  const [selected, setSelected] = useState<TransactionDto | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  const flatIncome = useMemo(() => incomeCategories.flatMap((category) => [category, ...category.children]), [incomeCategories]);
  const flatExpense = useMemo(() => expenseCategories.flatMap((category) => [category, ...category.children]), [expenseCategories]);
  const flatCategories = useMemo(() => [...flatIncome, ...flatExpense], [flatIncome, flatExpense]);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const creditCardAccounts = activeAccounts.filter((account) => account.type === "CreditCard");
  const paymentAccounts = activeAccounts.filter((account) => account.type !== "CreditCard");
  const transferAccounts = activeAccounts.filter((account) => account.type !== "CreditCard" && account.type !== "Loan");

  async function load() {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);
      if (filters.accountId) query.set("accountId", filters.accountId);
      if (filters.categoryId) query.set("categoryId", filters.categoryId);
      if (filters.type) query.set("type", filters.type);
      query.set("status", filters.status);
      query.set("page", String(filters.page));
      query.set("pageSize", "50");
      const [nextData, nextAccounts, nextIncome, nextExpense, nextUpcoming] = await Promise.all([
        apiFetch<PagedTransactionsDto>(`/api/transactions?${query}`, accessToken, {}, refreshSession),
        apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Income", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Expense", accessToken, {}, refreshSession),
        apiFetch<UpcomingDto>("/api/recurring-transactions/upcoming", accessToken, {}, refreshSession)
      ]);
      setData(nextData);
      setAccounts(nextAccounts);
      setIncomeCategories(nextIncome);
      setExpenseCategories(nextExpense);
      setUpcoming(nextUpcoming);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, filters]);

  function accountType(accountId: string) {
    return accounts.find((account) => account.id === accountId)?.type;
  }

  function toEditForm(transaction: TransactionDto) {
    const positive = transaction.entries.find((entry) => entry.amount > 0);
    const negativeEntries = transaction.entries.filter((entry) => entry.amount < 0);
    const creditCardEntry = transaction.entries.find((entry) => accountType(entry.accountId) === "CreditCard");
    const paymentEntry = negativeEntries.find((entry) => accountType(entry.accountId) !== "CreditCard") ?? negativeEntries[0];
    return {
      accountId: transaction.type === "CreditCardPayment" ? "" : transaction.entries[0]?.accountId ?? "",
      categoryId: transaction.category?.id ?? "",
      fromAccountId: transaction.type === "CreditCardPayment" ? paymentEntry?.accountId ?? "" : negativeEntries[0]?.accountId ?? "",
      toAccountId: transaction.type === "CreditCardPayment" ? creditCardEntry?.accountId ?? "" : positive?.accountId ?? "",
      amount: String(transaction.displayAmount),
      transactionDate: transaction.transactionDate,
      payee: transaction.payee ?? "",
      note: transaction.note ?? ""
    };
  }

  function openEditor(transaction: TransactionDto) {
    setSelected(transaction);
    setEditForm(toEditForm(transaction));
    setError(null);
  }

  function closeEditor() {
    setSelected(null);
    setEditForm(emptyEditForm);
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    try {
      const body = JSON.stringify({
        accountId: editForm.accountId || null,
        categoryId: editForm.categoryId || null,
        fromAccountId: editForm.fromAccountId || null,
        toAccountId: editForm.toAccountId || null,
        amount: Number(editForm.amount),
        transactionDate: editForm.transactionDate,
        payee: editForm.payee || null,
        note: editForm.note || null
      });
      const updated = await apiFetch<TransactionDto>(`/api/transactions/${selected.id}`, accessToken, { method: "PUT", body }, refreshSession);
      setData((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }));
      await load();
      closeEditor();
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsSaving(false);
    }
  }


  async function voidSelectedTransaction() {
    if (!selected) return;
    const confirmed = window.confirm("Void this transaction? It will no longer affect account balances.");
    if (!confirmed) return;
    setIsVoiding(true);
    try {
      await apiFetch<void>(`/api/transactions/${selected.id}`, accessToken, { method: "DELETE" }, refreshSession);
      await load();
      closeEditor();
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsVoiding(false);
    }
  }

  const categoryOptions = selected?.type === "Income" ? flatIncome : flatExpense;
  const showCategory = selected ? editableCategoryTypes.includes(selected.type) : false;
  const showSingleAccount = selected ? !["Transfer", "CreditCardPayment"].includes(selected.type) : false;
  const singleAccountOptions = selected?.type === "CreditCardPurchase" || selected?.type === "CreditCardRefund" ? creditCardAccounts : activeAccounts;

  return (
    <section className="grid gap-6">
      <PageHeader title="Transaction log" description="Click a row to edit transaction details and category." actions={<Link href="/transactions/new"><Button>New transaction</Button></Link>} />
      {error && <ErrorState message={error} />}
      <div className="grid gap-3 md:grid-cols-4">
        <Card><Stat label="Recurring due" value={String(upcoming.recurringOccurrences.length)} /></Card>
        <Card><Stat label="Installments due" value={String(upcoming.installments.length)} /></Card>
        <Card><Stat label="Card reminders" value={String(upcoming.creditCardReminders.length)} /></Card>
        <Link href="/upcoming" className="ui-card grid place-items-center text-sm font-medium hover:bg-surface-muted">View upcoming</Link>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-6">
          <label className="ui-label">From<input className="ui-input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })} /></label>
          <label className="ui-label">To<input className="ui-input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })} /></label>
          <label className="ui-label">Account<select className="ui-input" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value, page: 1 })}><option value="">{commonLabels.allAccounts}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="ui-label">Category<select className="ui-input" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}><option value="">{commonLabels.allCategories}</option>{flatCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="ui-label">Type<select className="ui-input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as "" | TransactionType, page: 1 })}>{transactionTypes.map((type) => <option key={type || "all"} value={type}>{type ? transactionTypeLabels[type] : commonLabels.allTypes}</option>)}</select></label>
          <label className="ui-label">Status<select className="ui-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as TransactionStatus, page: 1 })}>{statuses.map((status) => <option key={status} value={status}>{transactionStatusLabels[status]}</option>)}</select></label>
        </div>
      </Card>
      {isLoading ? <LoadingState /> : data.items.length === 0 ? <EmptyState title="No transactions found" description="Adjust filters or create a new transaction." /> : (
        <div className="overflow-x-auto rounded-ui border bg-surface shadow-panel">
          <table className="ui-table min-w-[820px]">
            <thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Category</th><th>Merchant</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
            <tbody>{data.items.map((transaction) => {
              const account = transaction.entries.map((entry) => entry.accountName).join(" -> ");
              const currency = accounts.find((candidate) => candidate.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD";
              const amountClass = transaction.type === "Expense" || transaction.type === "CreditCardPurchase" ? "text-expense" : transaction.type === "Income" || transaction.type === "CreditCardRefund" ? "text-income" : "text-transfer";
              return (
                <tr key={transaction.id} className="cursor-pointer transition hover:bg-surface-muted/70" onClick={() => openEditor(transaction)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openEditor(transaction); }}>
                  <td><span className="font-medium underline">{formatDate(transaction.transactionDate)}</span></td>
                  <td>{transactionTypeLabels[transaction.type]}</td>
                  <td>{account}</td>
                  <td>{transaction.category?.name ?? "-"}</td>
                  <td>{transaction.payee ?? "-"}</td>
                  <td className={`text-right font-semibold ${amountClass}`}>{money(transaction.displayAmount, currency)}</td>
                  <td><Badge tone={transaction.status === "Posted" ? "success" : "neutral"}>{transactionStatusLabels[transaction.status]}</Badge></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</Button>
        <span className="text-muted">Page {data.page} / {Math.max(data.totalPages, 1)}</span>
        <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</Button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={closeEditor}>
          <GameWindow title="Edit transaction" description={`${transactionTypeLabels[selected.type]} / ${transactionStatusLabels[selected.status]}`} className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <form onSubmit={submitEdit} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="ui-label">Date<input className="ui-input" type="date" value={editForm.transactionDate} onChange={(e) => setEditForm({ ...editForm, transactionDate: e.target.value })} disabled={selected.status !== "Posted"} /></label>
                <label className="ui-label">Amount<input className="ui-input" type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} disabled={selected.status !== "Posted"} /></label>
                {showSingleAccount && <label className="ui-label">Account<select className="ui-input" value={editForm.accountId} onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })} disabled={selected.status !== "Posted"}>{singleAccountOptions.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
              </div>
              {selected.type === "Transfer" && <div className="grid gap-3 sm:grid-cols-2"><AccountSelect label="From account" accounts={transferAccounts} value={editForm.fromAccountId} onChange={(value) => setEditForm({ ...editForm, fromAccountId: value })} /><AccountSelect label="To account" accounts={transferAccounts} value={editForm.toAccountId} onChange={(value) => setEditForm({ ...editForm, toAccountId: value })} /></div>}
              {selected.type === "CreditCardPayment" && <div className="grid gap-3 sm:grid-cols-2"><AccountSelect label="Payment account" accounts={paymentAccounts} value={editForm.fromAccountId} onChange={(value) => setEditForm({ ...editForm, fromAccountId: value })} /><AccountSelect label="Credit card" accounts={creditCardAccounts} value={editForm.toAccountId} onChange={(value) => setEditForm({ ...editForm, toAccountId: value })} /></div>}
              <div className="grid gap-3 sm:grid-cols-2">
                {showCategory && <label className="ui-label">Category<select className="ui-input" value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })} disabled={selected.status !== "Posted"}><option value="">Select category</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
                {(selected.type === "Income" || selected.type === "Expense" || selected.type === "CreditCardPurchase") && <label className="ui-label">Merchant / Payee<input className="ui-input" value={editForm.payee} onChange={(e) => setEditForm({ ...editForm, payee: e.target.value })} disabled={selected.status !== "Posted"} /></label>}
              </div>
              <label className="ui-label">Note<textarea className="ui-input min-h-24" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} disabled={selected.status !== "Posted"} /></label>
              <div className="rounded-ui border border-border/60 bg-background/35 p-3 text-sm text-muted">
                {selected.entries.map((entry) => <p key={entry.accountId} className="flex justify-between gap-4"><span>{entry.accountName}</span><span>{money(entry.amount, accounts.find((account) => account.id === entry.accountId)?.currencyCode ?? "TWD")}</span></p>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="danger" onClick={voidSelectedTransaction} isLoading={isVoiding} disabled={selected.status !== "Posted"}>Void transaction</Button>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeEditor}>Cancel</Button>
                  <Button type="submit" isLoading={isSaving} disabled={selected.status !== "Posted"}>Save changes</Button>
                </div>
              </div>
            </form>
          </GameWindow>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function AccountSelect({ label, accounts, value, onChange }: { label: string; accounts: AccountDto[]; value: string; onChange: (value: string) => void }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>;
}