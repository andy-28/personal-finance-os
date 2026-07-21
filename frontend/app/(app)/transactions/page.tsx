"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type PagedTransactionsDto, type TransactionStatus, type TransactionType, type UpcomingDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { commonLabels, transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

const transactionTypes: Array<"" | TransactionType> = ["", "Income", "Expense", "Transfer", "OpeningBalance", "CreditCardPurchase", "CreditCardRefund", "CreditCardPayment"];
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
      <PageHeader title="交易流水" description="每筆交易都會產生 ledger entries，帳戶餘額由分錄即時計算。" actions={<Link href="/transactions/new"><Button>新增交易</Button></Link>} />
      {error && <ErrorState message={error} />}
      <div className="grid gap-3 md:grid-cols-4">
        <Card><Stat label="待入帳循環交易" value={String(upcoming.recurringOccurrences.length)} /></Card>
        <Card><Stat label="待入帳分期" value={String(upcoming.installments.length)} /></Card>
        <Card><Stat label="信用卡提醒" value={String(upcoming.creditCardReminders.length)} /></Card>
        <Link href="/upcoming" className="ui-card grid place-items-center text-sm font-medium hover:bg-surface-muted">查看待辦</Link>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-6">
          <label className="ui-label">起日<input className="ui-input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })} /></label>
          <label className="ui-label">迄日<input className="ui-input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })} /></label>
          <label className="ui-label">帳戶<select className="ui-input" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value, page: 1 })}><option value="">{commonLabels.allAccounts}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="ui-label">分類<select className="ui-input" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}><option value="">{commonLabels.allCategories}</option>{flatCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="ui-label">類型<select className="ui-input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as "" | TransactionType, page: 1 })}>{transactionTypes.map((type) => <option key={type || "all"} value={type}>{type ? transactionTypeLabels[type] : commonLabels.allTypes}</option>)}</select></label>
          <label className="ui-label">狀態<select className="ui-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as TransactionStatus, page: 1 })}>{statuses.map((status) => <option key={status} value={status}>{transactionStatusLabels[status]}</option>)}</select></label>
        </div>
      </Card>
      {isLoading ? <LoadingState /> : data.items.length === 0 ? <EmptyState title="沒有符合條件的交易" description="調整篩選條件，或新增第一筆交易。" /> : (
        <div className="overflow-x-auto rounded-ui border bg-surface shadow-panel">
          <table className="ui-table min-w-[820px]">
            <thead><tr><th>日期</th><th>類型</th><th>帳戶</th><th>分類</th><th>商家</th><th className="text-right">金額</th><th>狀態</th></tr></thead>
            <tbody>{data.items.map((transaction) => {
              const account = transaction.entries.map((entry) => entry.accountName).join(" -> ");
              const currency = accounts.find((candidate) => candidate.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD";
              const amountClass = transaction.type === "Expense" || transaction.type === "CreditCardPurchase" ? "text-expense" : transaction.type === "Income" || transaction.type === "CreditCardRefund" ? "text-income" : "text-transfer";
              return (
                <tr key={transaction.id}>
                  <td><Link className="font-medium underline" href={`/transactions/${transaction.id}`}>{formatDate(transaction.transactionDate)}</Link></td>
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
        <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>上一頁</Button>
        <span className="text-muted">第 {data.page} / {Math.max(data.totalPages, 1)} 頁</span>
        <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>下一頁</Button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
