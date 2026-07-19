"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type PagedTransactionsDto, type TransactionStatus, type TransactionType, type UpcomingDto } from "@/lib/api-client";
import { useAuth } from "../../auth-context";

const transactionTypes: Array<"" | TransactionType> = ["", "Income", "Expense", "Transfer", "OpeningBalance"];
const statuses: TransactionStatus[] = ["Posted", "Voided"];

export default function TransactionsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [data, setData] = useState<PagedTransactionsDto>({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 });
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingDto>({ recurringOccurrences: [], installments: [], creditCardReminders: [] });
  const [filters, setFilters] = useState({ from: "", to: "", accountId: "", categoryId: "", type: "" as "" | TransactionType, status: "Posted" as TransactionStatus, page: 1 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const flatCategories = useMemo(() => categories.flatMap((category) => [category, ...category.children]), [categories]);

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
      const [nextData, nextAccounts, incomeCategories, expenseCategories, nextUpcoming] = await Promise.all([
        apiFetch<PagedTransactionsDto>(`/api/transactions?${query}`, accessToken, {}, refreshSession),
        apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Income", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Expense", accessToken, {}, refreshSession),
        apiFetch<UpcomingDto>("/api/recurring-transactions/upcoming", accessToken, {}, refreshSession)
      ]);
      setData(nextData);
      setAccounts(nextAccounts);
      setCategories([...incomeCategories, ...expenseCategories]);
      setUpcoming(nextUpcoming);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, filters]);

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold">Transactions</h1><p className="text-stone-600">Posted ledger entries drive every account balance.</p></div><Link href="/transactions/new" className="rounded bg-stone-950 px-4 py-2 text-center text-white">New transaction</Link></header>
      {error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="grid gap-3 rounded border border-stone-300 bg-white p-4 sm:grid-cols-4">
        <SummaryCell label="Recurring due" value={String(upcoming.recurringOccurrences.length)} />
        <SummaryCell label="Installments" value={String(upcoming.installments.length)} />
        <SummaryCell label="Card reminders" value={String(upcoming.creditCardReminders.length)} />
        <Link href="/upcoming" className="rounded border border-stone-300 px-3 py-2 text-center text-sm font-medium">Review upcoming</Link>
      </div>
      <div className="grid gap-3 rounded border border-stone-300 bg-white p-4 sm:grid-cols-6"><input className="rounded border px-3 py-2" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })} /><input className="rounded border px-3 py-2" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })} /><select className="rounded border px-3 py-2" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value, page: 1 })}><option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><select className="rounded border px-3 py-2" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}><option value="">All categories</option>{flatCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select className="rounded border px-3 py-2" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as "" | TransactionType, page: 1 })}>{transactionTypes.map((type) => <option key={type || "all"} value={type}>{type || "All types"}</option>)}</select><select className="rounded border px-3 py-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as TransactionStatus, page: 1 })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
      {isLoading ? <p>Loading...</p> : data.items.length === 0 ? <p className="rounded border border-stone-300 bg-white p-5 text-stone-600">No transactions match these filters.</p> : <div className="overflow-hidden rounded border border-stone-300 bg-white"><table className="w-full border-collapse text-left text-sm"><thead className="bg-stone-100 text-stone-600"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Account</th><th className="p-3">Category</th><th className="p-3">Payee</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead><tbody>{data.items.map((transaction) => { const account = transaction.entries.map((entry) => entry.accountName).join(" -> "); const currency = accounts.find((candidate) => candidate.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD"; return <tr key={transaction.id} className="border-t border-stone-200"><td className="p-3"><Link className="font-medium underline" href={`/transactions/${transaction.id}`}>{transaction.transactionDate}</Link></td><td className="p-3">{transaction.type}</td><td className="p-3">{account}</td><td className="p-3">{transaction.category?.name ?? "-"}</td><td className="p-3">{transaction.payee ?? "-"}</td><td className={`p-3 text-right font-semibold ${transaction.type === "Expense" ? "text-rose-700" : transaction.type === "Income" ? "text-emerald-700" : "text-stone-800"}`}>{money(transaction.displayAmount, currency)}</td><td className="p-3">{transaction.status}</td></tr>; })}</tbody></table></div>}
      <div className="flex items-center justify-between text-sm"><button className="rounded border px-3 py-2" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {data.page} / {Math.max(data.totalPages, 1)}</span><button className="rounded border px-3 py-2" disabled={data.page >= data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></div>
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-stone-600">{label}</p><p className="text-2xl font-semibold">{value}</p></div>;
}
