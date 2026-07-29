import type { ReactNode } from "react";
import { AetherPanelHeader } from "@/components/ui/aether-management";

export function DashboardPanel({
  eyebrow,
  title,
  subtitle,
  summary,
  actions,
  children,
  className = ""
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dashboard-panel ${className}`}>
      <AetherPanelHeader eyebrow={eyebrow} title={title} subtitle={subtitle} summary={summary} actions={actions} />
      <div className="dashboard-panel-body">{children}</div>
    </section>
  );
}

export function DashboardSection({ title, meta, children, className = "" }: { title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`dashboard-section ${className}`}>
      <div className="dashboard-section-title">
        <h3>{title}</h3>
        {meta && <span>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

export function DashboardDataRow({ label, value, tone = "neutral" }: { label: ReactNode; value: ReactNode; tone?: "neutral" | "success" | "danger" | "warning" | "credit" }) {
  return (
    <div className={`dashboard-data-row dashboard-data-row-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
