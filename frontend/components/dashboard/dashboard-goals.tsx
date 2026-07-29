import Link from "next/link";
import { AetherEmptyState, AetherPanelHeader } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money, type AccountDto, type GoalBarColor, type UserGoalBarDto } from "@/lib/api-client";

type GoalColor = { fill: string; glow: string; border: string; track: string; frameGlow: string };

const colors: Record<GoalBarColor, GoalColor> = {
  violet: { fill: "linear-gradient(90deg, #6d28d9 0%, #a855f7 55%, #f0abfc 100%)", glow: "0 0 10px rgba(168, 85, 247, 0.75)", border: "#a78bfa", track: "#2b1743", frameGlow: "0 0 16px rgba(124, 58, 237, 0.35)" },
  cyan: { fill: "linear-gradient(90deg, #0891b2 0%, #22d3ee 55%, #a5f3fc 100%)", glow: "0 0 10px rgba(34, 211, 238, 0.75)", border: "#67e8f9", track: "#0f2f3a", frameGlow: "0 0 16px rgba(34, 211, 238, 0.32)" },
  emerald: { fill: "linear-gradient(90deg, #047857 0%, #34d399 55%, #bbf7d0 100%)", glow: "0 0 10px rgba(52, 211, 153, 0.7)", border: "#86efac", track: "#0f3328", frameGlow: "0 0 16px rgba(52, 211, 153, 0.32)" },
  amber: { fill: "linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fde68a 100%)", glow: "0 0 10px rgba(245, 158, 11, 0.72)", border: "#fcd34d", track: "#3b270b", frameGlow: "0 0 16px rgba(245, 158, 11, 0.32)" },
  rose: { fill: "linear-gradient(90deg, #be123c 0%, #fb7185 55%, #fecdd3 100%)", glow: "0 0 10px rgba(251, 113, 133, 0.72)", border: "#fda4af", track: "#3b1220", frameGlow: "0 0 16px rgba(251, 113, 133, 0.32)" }
};

export function DashboardGoals({ goals, accounts }: { goals: UserGoalBarDto[]; accounts: AccountDto[] }) {
  return (
    <Card>
      <AetherPanelHeader
        eyebrow="RESOURCE BARS"
        title="目標血條"
        subtitle="已同步到 User Settings"
        summary={`${goals.length} 個目標`}
        actions={<Link href="/accounts"><Button variant="outline" size="sm">管理目標</Button></Link>}
      />
      {goals.length === 0 ? <AetherEmptyState title="尚未建立目標血條" description="到帳戶頁建立目標血條後，Dashboard 會顯示主要資金進度。" /> : (
        <div className="grid gap-3">
          {goals.slice(0, 3).map((goal) => <DashboardGoalBar key={goal.id} goal={goal} account={accounts.find((account) => account.id === goal.accountId)} />)}
        </div>
      )}
    </Card>
  );
}

function DashboardGoalBar({ goal, account }: { goal: UserGoalBarDto; account?: AccountDto }) {
  const current = Math.max(0, account?.balance ?? 0);
  const currency = account?.currencyCode ?? "TWD";
  const percent = Math.max(0, Math.min(100, (current / goal.targetAmount) * 100));
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
