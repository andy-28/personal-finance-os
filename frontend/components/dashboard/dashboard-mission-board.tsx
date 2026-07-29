import Link from "next/link";
import { AetherEmptyState } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { DashboardDataRow, DashboardPanel, DashboardSection } from "./dashboard-panel";
import { money, type AccountDto, type GoalBarColor, type UpcomingDto, type UserGoalBarDto } from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { installmentStatusLabels, transactionTypeLabels } from "@/lib/labels";

type GoalColor = { fill: string; glow: string; border: string; track: string; frameGlow: string };

const colors: Record<GoalBarColor, GoalColor> = {
  violet: { fill: "linear-gradient(90deg, #6d28d9 0%, #a855f7 55%, #f0abfc 100%)", glow: "0 0 10px rgba(168, 85, 247, 0.75)", border: "#a78bfa", track: "#2b1743", frameGlow: "0 0 16px rgba(124, 58, 237, 0.35)" },
  cyan: { fill: "linear-gradient(90deg, #0891b2 0%, #22d3ee 55%, #a5f3fc 100%)", glow: "0 0 10px rgba(34, 211, 238, 0.75)", border: "#67e8f9", track: "#0f2f3a", frameGlow: "0 0 16px rgba(34, 211, 238, 0.32)" },
  emerald: { fill: "linear-gradient(90deg, #047857 0%, #34d399 55%, #bbf7d0 100%)", glow: "0 0 10px rgba(52, 211, 153, 0.7)", border: "#86efac", track: "#0f3328", frameGlow: "0 0 16px rgba(52, 211, 153, 0.32)" },
  amber: { fill: "linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fde68a 100%)", glow: "0 0 10px rgba(245, 158, 11, 0.72)", border: "#fcd34d", track: "#3b270b", frameGlow: "0 0 16px rgba(245, 158, 11, 0.32)" },
  rose: { fill: "linear-gradient(90deg, #be123c 0%, #fb7185 55%, #fecdd3 100%)", glow: "0 0 10px rgba(251, 113, 133, 0.72)", border: "#fda4af", track: "#3b1220", frameGlow: "0 0 16px rgba(251, 113, 133, 0.32)" }
};

export function DashboardMissionBoard({ upcoming, goals, accounts }: { upcoming: UpcomingDto; goals: UserGoalBarDto[]; accounts: AccountDto[] }) {
  const today = todayInputValue();
  const rows = [
    ...upcoming.recurringOccurrences.map((item) => ({ id: item.id, kind: "固定交易", date: item.scheduledDate, title: item.templateName, amount: item.amount, currency: item.currency, meta: transactionTypeLabels[item.transactionType] })),
    ...upcoming.installments.map((item) => ({ id: item.itemId, kind: "分期", date: item.dueDate, title: item.merchant, amount: item.amount, currency: "TWD", meta: installmentStatusLabels[item.status] ?? item.status })),
    ...upcoming.creditCardReminders.map((item) => ({ id: `${item.accountId}-${item.kind}-${item.date}`, kind: "信用卡", date: item.date, title: item.accountName, amount: 0, currency: "TWD", meta: item.kind === "Closing" ? "結帳日" : "繳款截止日" }))
  ].sort((a, b) => a.date.localeCompare(b.date));
  const urgent = rows.filter((row) => row.date <= today).length;
  const totalMissions = rows.length + goals.length;

  return (
    <DashboardPanel
      eyebrow="MISSION BOARD"
      title="任務面板"
      subtitle="固定交易、信用卡提醒、分期與資金目標集中在同一個任務層。"
      summary={`${totalMissions} 項`}
      actions={<Link href="/upcoming"><Button variant="outline" size="sm">開啟任務</Button></Link>}
    >
      <div className="dashboard-mission-grid">
        <DashboardSection title="即將發生" meta={urgent > 0 ? `${urgent} 項已到期` : "排程任務"}>
          {rows.length === 0 ? <AetherEmptyState title="目前沒有待辦任務" description="固定交易、分期或信用卡提醒出現時，會自動加入任務列表。" /> : (
            <div className="dashboard-row-list">
              {rows.slice(0, 5).map((row) => (
                <article key={row.id} className="dashboard-card-row dashboard-card-row-compact">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.title}</p>
                    <p className="text-xs text-muted">{row.kind} / {formatDate(row.date)} / {row.meta}</p>
                  </div>
                  <strong className="text-right text-sm">{row.amount > 0 ? money(row.amount, row.currency) : row.date <= today ? "今天" : "提醒"}</strong>
                </article>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="資金目標" meta="Resource Bars">
          {goals.length === 0 ? <AetherEmptyState title="尚未建立目標血條" description="到帳戶頁建立目標血條後，Dashboard 會顯示主要資金進度。" /> : (
            <div className="dashboard-row-list">
              {goals.slice(0, 3).map((goal) => <DashboardGoalBar key={goal.id} goal={goal} account={accounts.find((account) => account.id === goal.accountId)} />)}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="任務摘要" meta="Status">
          <DashboardDataRow label="提醒 / 排程" value={`${rows.length} 項`} />
          <DashboardDataRow label="資金目標" value={`${goals.length} 個`} tone="credit" />
          <DashboardDataRow label="今日或逾期" value={`${urgent} 項`} tone={urgent > 0 ? "warning" : "success"} />
        </DashboardSection>
      </div>
    </DashboardPanel>
  );
}

function DashboardGoalBar({ goal, account }: { goal: UserGoalBarDto; account?: AccountDto }) {
  const current = Math.max(0, account?.balance ?? 0);
  const currency = account?.currencyCode ?? "TWD";
  const percent = goal.targetAmount > 0 ? Math.max(0, Math.min(100, (current / goal.targetAmount) * 100)) : 100;
  const color = colors[goal.color];

  return (
    <article className="relative rounded-[7px] border-2 bg-[#12131b] p-2 shadow-[0_0_0_2px_rgba(0,0,0,0.7)]" style={{ borderColor: color.border, boxShadow: `0 0 0 2px rgba(0,0,0,0.7), ${color.frameGlow}` }}>
      <span className="absolute right-3 top-[5px] z-10 h-3 w-3 rounded-full border border-[#c8ffb8] bg-[#74d957] shadow-[0_0_8px_rgba(116,217,87,0.7)]" aria-hidden="true" />
      <div className="mb-1 flex items-center pr-8 pl-2 text-[11px] font-black tracking-[0.08em] text-[#f7d24b]"><span className="truncate">{goal.title}</span></div>
      <div className="relative h-6 overflow-hidden rounded-[5px] border p-[3px] shadow-[inset_0_0_8px_rgba(0,0,0,0.85)]" style={{ borderColor: color.border, backgroundColor: color.track }}>
        <div className="h-full rounded-[3px] transition-[width] duration-300" style={{ width: `${percent}%`, background: color.fill, boxShadow: color.glow }} />
        <div className="absolute inset-0 grid place-items-center text-[11px] font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{money(current, currency)} / {money(goal.targetAmount, currency)}</div>
      </div>
      <div className="mt-1 flex items-center justify-between px-1 text-[10px] font-semibold text-muted"><span className="truncate">{account ? account.name : "找不到資料來源"}</span><span>{percent.toFixed(1)}%</span></div>
    </article>
  );
}
