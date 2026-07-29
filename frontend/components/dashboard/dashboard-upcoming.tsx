import Link from "next/link";
import { AetherEmptyState, AetherPanelHeader } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money, type UpcomingDto } from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { installmentStatusLabels, transactionTypeLabels } from "@/lib/labels";

export function DashboardUpcoming({ upcoming }: { upcoming: UpcomingDto }) {
  const today = todayInputValue();
  const rows = [
    ...upcoming.recurringOccurrences.map((item) => ({ id: item.id, kind: "固定交易", date: item.scheduledDate, title: item.templateName, amount: item.amount, currency: item.currency, meta: transactionTypeLabels[item.transactionType] })),
    ...upcoming.installments.map((item) => ({ id: item.itemId, kind: "分期", date: item.dueDate, title: item.merchant, amount: item.amount, currency: "TWD", meta: installmentStatusLabels[item.status] ?? item.status })),
    ...upcoming.creditCardReminders.map((item) => ({ id: `${item.accountId}-${item.kind}-${item.date}`, kind: "信用卡", date: item.date, title: item.accountName, amount: 0, currency: "TWD", meta: item.kind === "Closing" ? "結帳日" : "繳款截止日" }))
  ].sort((a, b) => a.date.localeCompare(b.date));
  const urgent = rows.filter((row) => row.date <= today).length;

  return (
    <Card>
      <AetherPanelHeader
        eyebrow="QUEST BOARD"
        title="財務任務"
        subtitle="固定交易、分期與信用卡提醒。"
        summary={`${rows.length} 項`}
        actions={<Link href="/upcoming"><Button variant="outline" size="sm">開啟任務</Button></Link>}
      />
      {rows.length === 0 ? <AetherEmptyState title="目前沒有待辦任務" description="固定交易、分期或信用卡提醒出現時，會自動加入任務列表。" /> : (
        <div className="grid gap-2">
          {urgent > 0 && <p className="rounded-ui border border-warning/45 bg-warning/10 px-3 py-2 text-sm text-warning">{urgent} 項已到期或今天截止。</p>}
          {rows.slice(0, 5).map((row) => (
            <article key={row.id} className="grid gap-2 rounded-ui border border-border/55 bg-surface-muted/30 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold">{row.title}</p>
                <p className="text-xs text-muted">{row.kind} / {formatDate(row.date)} / {row.meta}</p>
              </div>
              <div className="text-right text-sm font-bold">{row.amount > 0 ? money(row.amount, row.currency) : row.date <= today ? "今天" : "提醒"}</div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
