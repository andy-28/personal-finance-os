export type GameNumberVariant = "finance" | "aether" | "damage" | "success" | "warning";
export type GameNumberSize = "sm" | "md" | "lg" | "xl";

export type GameNumberProps = {
  value: number | string;
  variant: GameNumberVariant;
  size: GameNumberSize;
  prefix?: string;
  suffix?: string;
  glow?: boolean;
  outline?: boolean;
};

export function GameNumber({ value, variant, size, prefix = "", suffix = "", glow = false, outline = false }: GameNumberProps) {
  return (
    <span className={`game-number game-number-${variant} game-number-${size} ${glow ? "game-number-glow" : ""} ${outline ? "game-number-outline" : ""}`}>
      {prefix}{formatGameValue(value)}{suffix}
    </span>
  );
}

function formatGameValue(value: number | string) {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
