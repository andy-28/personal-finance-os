import { DashboardDataRow, DashboardPanel, DashboardSection } from "./dashboard-panel";
import { money, type AccountDto, type AccountSummaryDto, type TransactionDto } from "@/lib/api-client";

export function DashboardFinancialSummary({ summary, accounts, transactions }: { summary: AccountSummaryDto; accounts: AccountDto[]; transactions: TransactionDto[] }) {
  const primary = summary.currencies[0];
  const currency = primary?.currencyCode ?? "TWD";
  const activeAssets = accounts.filter((account) => !account.isArchived && account.type !== "CreditCard" && account.balance > 0).length;
  const activeLiabilities = accounts.filter((account) => !account.isArchived && (account.type === "CreditCard" || account.balance < 0)).length;
  const activeAccounts = accounts.filter((account) => !account.isArchived).length;
  const income = transactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.displayAmount, 0);
  const expense = transactions.filter((item) => item.type === "Expense" || item.type === "CreditCardPurchase").reduce((sum, item) => sum + item.displayAmount, 0);
  const refunds = transactions.filter((item) => item.type === "CreditCardRefund").reduce((sum, item) => sum + item.displayAmount, 0);
  const netFlow = income + refunds - expense;

  return (
    <DashboardPanel
        eyebrow="RESOURCE OVERVIEW"
        title="財務狀態"
        subtitle="資產、負債、淨值與本月現金流共用同一個狀態面板。"
        summary={primary ? money(primary.netBalance, currency) : "-"}
      >
      <div className="dashboard-status-grid">
        <DashboardSection title="資產 → 淨值" meta={`${activeAssets} 個資產帳戶`}>
          <DashboardDataRow label="資產餘額" value={primary ? money(primary.assetBalance, currency) : "-"} tone="success" />
          <DashboardDataRow label="負債餘額" value={primary ? money(primary.liabilityBalance, currency) : "-"} tone="danger" />
          <DashboardDataRow label="目前淨值" value={primary ? money(primary.netBalance, currency) : "-"} tone={primary && primary.netBalance >= 0 ? "credit" : "warning"} />
        </DashboardSection>
        <DashboardSection title="本月現金流" meta={`${activeAccounts} 個啟用帳戶`}>
          <DashboardDataRow label="本月收入" value={money(income, currency)} tone="success" />
          <DashboardDataRow label="本月支出" value={money(expense, currency)} tone="danger" />
          <DashboardDataRow label="退款 / 折讓" value={money(refunds, currency)} tone="credit" />
          <DashboardDataRow label="本月淨流量" value={money(netFlow, currency)} tone={netFlow >= 0 ? "success" : "warning"} />
        </DashboardSection>
        <DashboardSection title="帳戶概況" meta={`${activeLiabilities} 個負債來源`}>
          <DashboardDataRow label="啟用帳戶" value={`${activeAccounts} 個`} />
          <DashboardDataRow label="資產帳戶" value={`${activeAssets} 個`} tone="success" />
          <DashboardDataRow label="負債來源" value={`${activeLiabilities} 個`} tone="danger" />
        </DashboardSection>
      </div>
    </DashboardPanel>
  );
}
