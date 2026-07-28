import type { HTMLAttributes, ReactNode } from "react";
import { Badge } from "./badge";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "credit";
type MetricTone = "neutral" | "primary" | "success" | "warning" | "danger" | "credit";

export function AetherPanelHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  status,
  summary,
  className = ""
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
  summary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`aether-panel-header ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="aether-panel-eyebrow">{eyebrow}</p>}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="aether-panel-title">{title}</h2>
          {status}
        </div>
        {subtitle && <p className="aether-panel-subtitle">{subtitle}</p>}
      </div>
      {(summary || actions) && (
        <div className="aether-panel-header-side">
          {summary && <div className="aether-panel-summary">{summary}</div>}
          {actions && <div className="aether-panel-actions">{actions}</div>}
        </div>
      )}
    </div>
  );
}

export function AetherListRow({
  title,
  subtitle,
  meta,
  isActive,
  children,
  onClick
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  isActive?: boolean;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      className={`aether-list-row ${isActive ? "aether-list-row-active" : ""}`}
      aria-selected={isActive}
      onClick={onClick}
    >
      <span className="min-w-0">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
        {children}
      </span>
      {meta && <span className="text-right">{meta}</span>}
    </button>
  );
}

export function AetherDefinitionList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`aether-definition-list ${className}`}>{children}</div>;
}

export function AetherDefinitionRow({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`aether-definition ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AetherActionBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`aether-action-bar ${className}`}>{children}</div>;
}

export function AetherToolbar({ children, className = "", role, ariaLabel }: { children: ReactNode; className?: string; role?: HTMLAttributes<HTMLDivElement>["role"]; ariaLabel?: string }) {
  return <div className={`aether-toolbar ${className}`} role={role} aria-label={ariaLabel}>{children}</div>;
}

export function AetherSectionHeader({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="aether-section-header">
      <div className="min-w-0">
        <h2>{title}</h2>
        {meta && <span>{meta}</span>}
      </div>
      {actions && <div className="aether-section-actions">{actions}</div>}
    </div>
  );
}

export function AetherStatusIndicator({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return <Badge tone={tone}>{label}</Badge>;
}

export function AetherSummaryGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`aether-summary-grid ${className}`}>{children}</div>;
}

export function AetherMetric({ label, value, hint, tone = "neutral" }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: MetricTone }) {
  return (
    <div className={`aether-metric aether-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function AetherEmptyState({ title = "目前沒有資料", description, action }: { title?: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="aether-empty-state">
      <div className="aether-empty-icon" aria-hidden="true">◇</div>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
