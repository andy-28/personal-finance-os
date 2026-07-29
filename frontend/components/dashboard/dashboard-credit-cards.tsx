import Link from "next/link";
import { AetherEmptyState } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { DashboardDataRow, DashboardPanel, DashboardSection } from "./dashboard-panel";
import { GameProgress } from "@/components/ui/game-theme";
import { money, type CreditCardDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";

function utilization(card: CreditCardDto) {
  if (!card.creditLimit || card.creditLimit <= 0) return 0;
  return Math.max(0, Math.min(100, (card.outstandingAmount / card.creditLimit) * 100));
}

export function DashboardCreditCards({ cards }: { cards: CreditCardDto[] }) {
  const totalOutstanding = cards.reduce((sum, card) => sum + card.outstandingAmount, 0);
  const totalBilled = cards.reduce((sum, card) => sum + card.billedOutstandingAmount, 0);
  const totalUnbilled = cards.reduce((sum, card) => sum + card.unbilledAmount, 0);
  const currency = cards[0]?.currencyCode ?? "TWD";

  return (
    <DashboardPanel
        eyebrow="CREDIT TERMINAL"
        title="信用卡終端"
        subtitle="所有信用卡視為同一個終端，先看總量，再看單卡狀態。"
        summary={money(totalOutstanding, currency)}
        actions={<Link href="/credit-cards"><Button variant="outline" size="sm">查看信用卡</Button></Link>}
      >
      {cards.length === 0 ? <AetherEmptyState title="尚未建立信用卡" description="建立信用卡後，Dashboard 會顯示使用率與應繳狀態。" /> : (
        <div className="dashboard-terminal-grid">
          <DashboardSection title="信用總量" meta={`${cards.length} 張卡`}>
            <DashboardDataRow label="總未繳" value={money(totalOutstanding, currency)} tone="danger" />
            <DashboardDataRow label="已結帳應繳" value={money(totalBilled, currency)} tone="warning" />
            <DashboardDataRow label="未出帳" value={money(totalUnbilled, currency)} tone="credit" />
          </DashboardSection>
          <DashboardSection title="卡片狀態" meta="最多顯示 3 張">
          <div className="dashboard-row-list">
            {cards.slice(0, 3).map((card) => {
              const percent = utilization(card);
              return (
                <article key={card.accountId} className="dashboard-card-row">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{card.accountName}</p>
                      <p className="text-xs text-muted">{card.issuerName} / {card.cardName}{card.lastFourDigits ? ` / ${card.lastFourDigits}` : ""}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2"><GameProgress value={percent} label="信用額度使用率" /></div>
                  <div className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                    <Row label="已結帳" value={money(card.billedOutstandingAmount, card.currencyCode)} />
                    <Row label="未出帳" value={money(card.unbilledAmount, card.currencyCode)} />
                    <Row label="下次結帳日" value={formatDate(card.nextClosingDate)} />
                    <Row label="下次繳款日" value={formatDate(card.nextPaymentDueDate)} />
                  </div>
                </article>
              );
            })}
          </div>
          </DashboardSection>
        </div>
      )}
    </DashboardPanel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <p className="flex justify-between gap-3"><span>{label}</span><strong className="text-foreground">{value}</strong></p>;
}
