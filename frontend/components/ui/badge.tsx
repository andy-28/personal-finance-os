import type { ReactNode } from "react";

const tones = {
  neutral: "border-border bg-surface-muted text-muted",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  credit: "border-credit/30 bg-credit/10 text-credit",
  transfer: "border-transfer/30 bg-transfer/10 text-transfer"
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
