"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { DashboardGoals } from "@/components/dashboard/dashboard-goals";
import { MobileQuickActions } from "@/components/mobile/mobile-quick-actions";
import { MobileHudEmptyState } from "@/components/mobile/mobile-skeletons";
import { money, type AccountDto, type AccountSummaryDto, type CreditCardDto, type TransactionDto, type UserGoalBarDto } from "@/lib/api-client";
import { formatShortDate, todayInputValue } from "@/lib/formatters";
import { transactionTypeLabels } from "@/lib/labels";

function amountTone(transaction: TransactionDto) {
  if (transaction.type === "Income" || transaction.type === "CreditCardRefund") return "text-income";
  if (transaction.type === "Expense" || transaction.type === "CreditCardPurchase") return "text-expense";
  return "text-transfer";
}

function transactionIcon(transaction: TransactionDto) {
  if (transaction.type === "Income") return "＋";
  if (transaction.type === "Transfer") return "↔";
  if (transaction.type === "CreditCardPurchase" || transaction.type === "CreditCardPayment" || transaction.type === "CreditCardRefund") return "◇";
  return "−";
}

export function MobileDashboard({
  accounts,
  summary,
  creditCards,
  monthlyTransactions,
  recentTransactions,
  goals,
  displayName
}: {
  accounts: AccountDto[];
  summary: AccountSummaryDto;
  creditCards: CreditCardDto[];
  monthlyTransactions: TransactionDto[];
  recentTransactions: TransactionDto[];
  goals: UserGoalBarDto[];
  displayName: string;
}) {
  const primary = summary.currencies[0];
  const currency = primary?.currencyCode ?? "TWD";
  const income = monthlyTransactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.displayAmount, 0);
  const expense = monthlyTransactions.filter((item) => item.type === "Expense" || item.type === "CreditCardPurchase").reduce((sum, item) => sum + item.displayAmount, 0);
  const refunds = monthlyTransactions.filter((item) => item.type === "CreditCardRefund").reduce((sum, item) => sum + item.displayAmount, 0);
  const cashFlow = income + refunds - expense;
  const totalOutstanding = creditCards.reduce((sum, card) => sum + card.outstandingAmount, 0);
  const today = todayInputValue().replace(/-/g, " / ");

  return (
    <div className="mobile-dashboard md:hidden">
      <section className="mobile-status-panel mobile-reveal">
        <div className="mobile-dashboard-greeting">
          <span>早安，{displayName}</span>
          <small>{today}</small>
        </div>
        <p className="mobile-section-eyebrow">財務狀態</p>
        <div className="mobile-net-worth">
          <span>淨值</span>
          <strong className={primary && primary.netBalance >= 0 ? "text-income" : "text-warning"}>
            {primary ? money(primary.netBalance, currency) : "-"}
          </strong>
        </div>
        <div className="mobile-balance-pair">
          <MobileMetric label="總資產" value={primary ? money(primary.assetBalance, currency) : "-"} tone="success" />
          <MobileMetric label="總負債" value={primary ? money(primary.liabilityBalance, currency) : "-"} tone="danger" />
        </div>
        <p className="mobile-brand-line">Gold Engine · {currency}</p>
      </section>

      <MobileCard title="本月現金流" meta="本月">
        <div className="mobile-metric-grid">
          <MobileMetric label="本月收入" value={money(income, currency)} tone="success" />
          <MobileMetric label="本月支出" value={money(expense, currency)} tone="danger" />
          <MobileMetric label="淨現金流" value={money(cashFlow, currency)} tone={cashFlow >= 0 ? "success" : "warning"} wide />
        </div>
      </MobileCard>

      <MobileQuickActions />

      <MobileCard title="信用卡摘要" meta={money(totalOutstanding, currency)}>
        {creditCards.length === 0 ? (
          <MobileHudEmptyState title="尚未建立信用卡" description="建立卡片後，這裡會顯示卡片餘額與付款節奏。" />
        ) : (
          <div className="grid gap-2">
            {creditCards.slice(0, 3).map((card) => (
              <Link key={card.accountId} href="/credit-cards" className="mobile-card-row">
                <span className="mobile-row-icon text-expense" aria-hidden="true">◇</span>
                <span>
                  <strong>{card.accountName}</strong>
                  <small>卡片餘額 · {card.issuerName} / {card.cardName}</small>
                </span>
                <strong className="text-expense">{money(card.outstandingAmount, card.currencyCode)}</strong>
              </Link>
            ))}
          </div>
        )}
      </MobileCard>

      <div className="mobile-goals-compact mobile-reveal">
        <DashboardGoals goals={goals} accounts={accounts} />
      </div>

      <MobileCard title="最近三筆交易" meta="最近">
        {recentTransactions.length === 0 ? (
          <MobileHudEmptyState title="尚無最近交易" description="按下底部 +，用快速新增建立第一筆行動紀錄。" />
        ) : (
          <div className="grid gap-2">
            {recentTransactions.slice(0, 3).map((transaction) => {
              const txCurrency = accounts.find((account) => account.id === transaction.entries[0]?.accountId)?.currencyCode ?? currency;
              return (
                <Link key={transaction.id} href="/transactions" className="mobile-card-row">
                  <span className={`mobile-row-icon ${amountTone(transaction)}`} aria-hidden="true">{transactionIcon(transaction)}</span>
                  <span>
                    <strong>{transaction.payee ?? transactionTypeLabels[transaction.type]}</strong>
                    <small>{transaction.category?.name ?? transactionTypeLabels[transaction.type]} / {formatShortDate(transaction.transactionDate)}</small>
                  </span>
                  <strong className={amountTone(transaction)}>{money(transaction.displayAmount, txCurrency)}</strong>
                </Link>
              );
            })}
          </div>
        )}
      </MobileCard>
    </div>
  );
}

function MobileCard({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <Card className="mobile-aether-card mobile-reveal">
      <div className="mobile-card-title">
        <h2>{title}</h2>
        {meta && <span>{meta}</span>}
      </div>
      {children}
    </Card>
  );
}

function MobileMetric({ label, value, tone, wide = false }: { label: string; value: string; tone: "success" | "danger" | "warning" | "credit"; wide?: boolean }) {
  return (
    <div className={`mobile-metric mobile-metric-${tone} ${wide ? "mobile-metric-wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
