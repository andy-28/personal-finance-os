import { formatCurrency } from "@/lib/formatters";
import type { AccountDto, UserGoalBarDto } from "@/lib/api-client";
import type { HudWidgetConfig } from "../hud-widget-types";

export type GoalWidgetViewModel = {
  title: string;
  description: string;
  current: number;
  maximum: number;
  percentage: number;
  currentLabel: string;
  maximumLabel: string;
  remainingLabel: string;
  statusLabel: string;
  currencyCode: string;
  variant: "cyan" | "aether" | "warning";
  state: "off" | "active" | "complete";
};

export function goalWidgetAdapter(goal: UserGoalBarDto, account: AccountDto | undefined, config: HudWidgetConfig): GoalWidgetViewModel {
  const current = Math.max(0, account?.balance ?? 0);
  const maximum = Math.max(0, goal.targetAmount);
  const currencyCode = account?.currencyCode ?? "TWD";
  const percentage = maximum > 0 ? Math.max(0, Math.min(100, (current / maximum) * 100)) : 0;
  const remaining = Math.max(0, maximum - current);
  return {
    title: config.title || goal.title,
    description: config.subtitle || account?.name || "財務目標",
    current,
    maximum,
    percentage,
    currentLabel: formatCurrency(current, currencyCode),
    maximumLabel: formatCurrency(maximum, currencyCode),
    remainingLabel: `剩餘 ${formatCurrency(remaining, currencyCode)}`,
    statusLabel: `${percentage.toFixed(percentage >= 10 || percentage === 0 ? 0 : 1)}%`,
    currencyCode,
    variant: config.variant === "quest" ? "warning" : config.variant === "adventure" ? "aether" : config.variant ?? "cyan",
    state: percentage >= 100 ? "complete" : maximum > 0 ? "active" : "off"
  };
}
