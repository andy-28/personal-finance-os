/* eslint-disable @next/next/no-img-element */

import { money, type AccountDto, type AccountSummaryDto, type CreditCardDto, type TransactionDto } from "@/lib/api-client";
import { resolveDashboardProfileImage, type DashboardProfileImageSettings } from "@/lib/aether/dashboard-profile-settings";

function monthlyFlow(transactions: TransactionDto[]) {
  const income = transactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.displayAmount, 0);
  const expense = transactions.filter((item) => item.type === "Expense" || item.type === "CreditCardPurchase").reduce((sum, item) => sum + item.displayAmount, 0);
  const refunds = transactions.filter((item) => item.type === "CreditCardRefund").reduce((sum, item) => sum + item.displayAmount, 0);
  return { income, expense, refunds, net: income + refunds - expense };
}

function creditUtilization(cards: CreditCardDto[]) {
  const limit = cards.reduce((sum, card) => sum + (card.creditLimit ?? 0), 0);
  const outstanding = cards.reduce((sum, card) => sum + card.outstandingAmount, 0);
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(100, (outstanding / limit) * 100));
}

export function DashboardFinanceProfile({
  accounts,
  summary,
  creditCards,
  monthlyTransactions,
  profileImageSettings
}: {
  accounts: AccountDto[];
  summary: AccountSummaryDto;
  creditCards: CreditCardDto[];
  monthlyTransactions: TransactionDto[];
  profileImageSettings: DashboardProfileImageSettings;
}) {
  const primary = summary.currencies[0];
  const currency = primary?.currencyCode ?? "TWD";
  const flow = monthlyFlow(monthlyTransactions);
  const image = resolveDashboardProfileImage(profileImageSettings);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const nonCardAccounts = activeAccounts.filter((account) => account.type !== "CreditCard");
  const totalCreditOutstanding = creditCards.reduce((sum, card) => sum + card.outstandingAmount, 0);
  const totalBilled = creditCards.reduce((sum, card) => sum + card.billedOutstandingAmount, 0);
  const utilization = creditUtilization(creditCards);

  return (
    <section className="finance-profile-panel" aria-label="財務角色面板">
      <div className="finance-profile-header">
        <div>
          <p className="finance-profile-eyebrow">FINANCE PROFILE</p>
          <h2>財務角色面板</h2>
          <p>用一個首頁視覺總覽你的資產、負債、現金流與信用卡狀態。</p>
        </div>
        <div className="finance-profile-net">
          <span>目前淨值</span>
          <strong>{primary ? money(primary.netBalance, currency) : "-"}</strong>
        </div>
      </div>

      <div className="finance-profile-grid">
        <div className="finance-profile-column">
          <ProfileStat label="總資產" value={primary ? money(primary.assetBalance, currency) : "-"} tone="success" />
          <ProfileStat label="現金與帳戶" value={`${nonCardAccounts.length} 個帳戶`} />
          <ProfileStat label="本月收入" value={money(flow.income, currency)} tone="success" />
        </div>

        <div className="finance-profile-core">
          <div className="finance-profile-image-frame">
            <img src={image.src} alt="" aria-hidden="true" />
          </div>
          <div className="finance-profile-caption">
            <strong>{image.name}</strong>
            <span>{flow.net >= 0 ? "本月現金流保持正向。" : "本月支出高於收入，適合檢查大型消費。"}</span>
          </div>
        </div>

        <div className="finance-profile-column">
          <ProfileStat label="總負債" value={primary ? money(primary.liabilityBalance, currency) : "-"} tone="danger" />
          <ProfileStat label="信用卡未繳" value={money(totalCreditOutstanding, currency)} tone="warning" />
          <ProfileStat label="信用卡使用率" value={`${utilization.toFixed(1)}%`} tone={utilization >= 50 ? "warning" : "credit"} />
        </div>
      </div>

      <div className="finance-profile-bottom">
        <ProfileStat label="本月支出" value={money(flow.expense, currency)} tone="danger" />
        <ProfileStat label="退款 / 折讓" value={money(flow.refunds, currency)} tone="credit" />
        <ProfileStat label="本月淨流量" value={money(flow.net, currency)} tone={flow.net >= 0 ? "success" : "warning"} />
        <ProfileStat label="已結帳應繳" value={money(totalBilled, currency)} tone="warning" />
      </div>
    </section>
  );
}

function ProfileStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" | "warning" | "credit" }) {
  return (
    <div className={`finance-profile-stat finance-profile-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
