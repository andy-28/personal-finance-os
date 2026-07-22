import type { HTMLAttributes, ReactNode } from "react";
import { GameCard } from "./game-theme";

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <GameCard className={className} {...props}>{children}</GameCard>;
}

export function CardTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  );
}
