import type { HTMLAttributes, ReactNode } from "react";
import { GameCard } from "./game-theme";

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <GameCard className={className} {...props}>{children}</GameCard>;
}

export function CardTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="game-card-header">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}