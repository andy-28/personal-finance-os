import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "credit" | "transfer";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "game-button-primary",
  secondary: "game-button-secondary",
  outline: "game-button-outline",
  ghost: "game-button-ghost",
  danger: "game-button-danger"
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-4 py-2 text-sm"
};

const badgeTones: Record<BadgeTone, string> = {
  neutral: "game-badge-neutral",
  success: "game-badge-success",
  warning: "game-badge-warning",
  danger: "game-badge-danger",
  credit: "game-badge-credit",
  transfer: "game-badge-transfer"
};

export function GameTheme({ children }: { children: ReactNode }) {
  return <div className="game-theme min-h-screen">{children}</div>;
}

export function GameButton({
  variant = "primary",
  size = "md",
  isLoading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; isLoading?: boolean; children: ReactNode }) {
  return (
    <button
      {...props}
      disabled={props.disabled || isLoading}
      className={`ui-focus game-button inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}

export function GamePanel({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section {...props} className={`game-panel ${className}`}>{children}</section>;
}

export function GameWindow({ title, description, actions, children, className = "", ...props }: HTMLAttributes<HTMLElement> & { title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section {...props} className={`game-window animate-window-open ${className}`}>
      {(title || description || actions) && (
        <div className="game-window-titlebar">
          <div>
            {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.08em] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="game-window-body">{children}</div>
    </section>
  );
}

export function GameCard({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <GamePanel className={`game-card ${className}`} {...props}>{children}</GamePanel>;
}

export function GameInspectPanel({ title, subtitle, icon, children, footer, className = "" }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className={`game-inspect-panel ${className}`}>
      <div className="game-inspect-header">
        {icon && <div className="game-slot game-slot-sm">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="game-inspect-body">{children}</div>
      {footer && <div className="game-inspect-footer">{footer}</div>}
    </section>
  );
}

export function GameInspectRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="game-inspect-row">
      <span>{label}</span>
      <strong className={strong ? "text-primary" : ""}>{value}</strong>
    </div>
  );
}

export function GameTabs({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`game-tabs ${className}`}>{children}</div>;
}

export function GameTab({ isActive, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean; children: ReactNode }) {
  return (
    <button {...props} className={`ui-focus game-tab ${isActive ? "game-tab-active" : ""} ${className}`}>
      {children}
    </button>
  );
}

export function GameBadge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`game-badge ${badgeTones[tone]}`}>{children}</span>;
}

export function GameProgress({ value, label, className = "" }: { value: number; label?: string; className?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <div className={`game-progress ${className}`} aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} role="progressbar">
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

export function GameDialog({ title, children, footer, className = "" }: { title: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className="game-dialog-backdrop">
      <GameWindow title={title} className={`game-dialog ${className}`}>
        <div>{children}</div>
        {footer && <div className="game-dialog-footer">{footer}</div>}
      </GameWindow>
    </div>
  );
}

export function GameTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="game-tooltip" data-tooltip={label}>
      {children}
    </span>
  );
}