import Link from "next/link";
import { AetherEmptyState } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { DashboardPanel } from "./dashboard-panel";
import { money, type AccountDto, type TransactionDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";

export function DashboardRecentTransactions({ transactions, accounts }: { transactions: TransactionDto[]; accounts: AccountDto[] }) {
  return (
    <DashboardPanel eyebrow="ACTIVITY LOG" title="活動紀錄" subtitle="最近 8 筆已入帳交易，作為 Dashboard 的流水紀錄層。" summary={`${transactions.length} 筆`} actions={<Link href="/transactions"><Button variant="outline" size="sm">查看全部</Button></Link>}>
      {transactions.length === 0 ? <AetherEmptyState title="尚無交易紀錄" description="新增交易後會出現在這裡。" /> : (
        <div className="dashboard-activity-list">
          {transactions.slice(0, 8).map((transaction) => {
            const currency = accounts.find((account) => account.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD";
            const amountTone = transaction.type === "Income" || transaction.type === "CreditCardRefund" ? "text-income" : transaction.type === "Expense" || transaction.type === "CreditCardPurchase" ? "text-expense" : "text-transfer";
            return (
              <Link key={transaction.id} href={`/transactions/${transaction.id}`} className="dashboard-activity-row">
                <span className="text-sm font-semibold text-muted">{formatDate(transaction.transactionDate)}</span>
                <span className="min-w-0">
                  <strong className="block truncate">{transaction.payee ?? transactionTypeLabels[transaction.type]}</strong>
                  <small className="text-muted">{transactionTypeLabels[transaction.type]} / {transaction.category?.name ?? "-"} / {transactionStatusLabels[transaction.status]}</small>
                </span>
                <strong className={`text-right ${amountTone}`}>{money(transaction.displayAmount, currency)}</strong>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}
