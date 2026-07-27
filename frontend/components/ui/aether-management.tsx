import type { ReactNode } from "react";
import { Badge } from "./badge";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "credit";

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
  return <div className={`mt-4 grid gap-3 md:grid-cols-2 ${className}`}>{children}</div>;
}

export function AetherDefinitionRow({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`aether-definition ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AetherActionBar({ children }: { children: ReactNode }) {
  return <div className="aether-action-bar">{children}</div>;
}

export function AetherSectionHeader({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="aether-section-header">
      <h2>{title}</h2>
      {meta && <span>{meta}</span>}
    </div>
  );
}

export function AetherStatusIndicator({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return <Badge tone={tone}>{label}</Badge>;
}
