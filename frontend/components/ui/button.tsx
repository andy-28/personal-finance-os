import type { ButtonHTMLAttributes, ReactNode } from "react";
import { GameButton } from "./game-theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({ variant = "primary", size = "md", isLoading, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; isLoading?: boolean; children: ReactNode }) {
  return <GameButton {...props} variant={variant} size={size} isLoading={isLoading} className={className}>{children}</GameButton>;
}
