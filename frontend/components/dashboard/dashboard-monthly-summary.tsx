import { AetherMetric, AetherPanelHeader, AetherSummaryGrid } from "@/components/ui/aether-management";
import { Card } from "@/components/ui/card";
import { money, type TransactionDto } from "@/lib/api-client";

export function DashboardMonthlySummary({ transactions, currency = "TWD" }: { transactions: TransactionDto[]; currency?: string }) {
  const income = transactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.displayAmount, 0);
  const expense = transactions.filter((item) => item.type === "Expense" || item.type === "CreditCardPurchase").reduce((sum, item) => sum + item.displayAmount, 0);
  const refunds = transactions.filter((item) => item.type === "CreditCardRefund").reduce((sum, item) => sum + item.displayAmount, 0);
  const net = income + refunds - expense;

  return (
    <Card>
      <AetherPanelHeader eyebrow="MONTHLY FLOW" title="本月現金流" subtitle="依本月已入帳交易計算收入、支出與淨流量。" summary={money(net, currency)} />
      <AetherSummaryGrid>
        <AetherMetric label="本月收入" value={money(income, currency)} tone="success" />
        <AetherMetric label="本月支出" value={money(expense, currency)} tone="danger" />
        <AetherMetric label="退款 / 折讓" value={money(refunds, currency)} tone="credit" />
        <AetherMetric label="本月淨流量" value={money(net, currency)} tone={net >= 0 ? "primary" : "warning"} />
      </AetherSummaryGrid>
    </Card>
  );
}
