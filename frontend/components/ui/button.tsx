import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "border-primary bg-primary text-white hover:bg-primary/90",
  secondary: "border-surface-muted bg-surface-muted text-foreground hover:bg-border/50",
  outline: "border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost: "border-transparent bg-transparent text-foreground hover:bg-surface-muted",
  danger: "border-danger bg-danger text-white hover:bg-danger/90"
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-4 py-2 text-sm"
};

export function Button({ variant = "primary", size = "md", isLoading, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; isLoading?: boolean; children: ReactNode }) {
  return (
    <button
      {...props}
      disabled={props.disabled || isLoading}
      className={`ui-focus inline-flex items-center justify-center rounded-ui border font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading ? "處理中..." : children}
    </button>
  );
}
