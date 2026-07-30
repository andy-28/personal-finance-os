export type GameGaugeVariant = "cyan" | "purple" | "green" | "yellow" | "red";
export type GameGaugeSize = "sm" | "md" | "lg";

export type GameGaugeProps = {
  current: number;
  maximum: number;
  variant: GameGaugeVariant;
  size: GameGaugeSize;
  showValue?: boolean;
  showPercentage?: boolean;
  label?: string;
  animated?: boolean;
};

export function GameGauge({ current, maximum, variant, size, showValue = false, showPercentage = true, label, animated = true }: GameGaugeProps) {
  const safeMaximum = Number.isFinite(maximum) ? Math.max(0, maximum) : 0;
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const clampedCurrent = safeMaximum > 0 ? Math.max(0, Math.min(safeCurrent, safeMaximum)) : 0;
  const percent = safeMaximum > 0 ? Math.max(0, Math.min(100, (clampedCurrent / safeMaximum) * 100)) : 0;
  const readablePercent = `${percent.toFixed(percent >= 10 || percent === 0 ? 0 : 1)}%`;

  return (
    <div className={`game-gauge game-gauge-${variant} game-gauge-${size} ${animated ? "game-gauge-animated" : ""}`}>
      {(label || showValue || showPercentage) && (
        <div className="game-gauge-header">
          {label && <span>{label}</span>}
          <strong>{showValue ? `${formatGameNumber(clampedCurrent)} / ${formatGameNumber(safeMaximum)}` : showPercentage ? readablePercent : ""}</strong>
        </div>
      )}
      <div className="game-gauge-track" role="progressbar" aria-label={label ?? "Game gauge"} aria-valuemin={0} aria-valuemax={safeMaximum} aria-valuenow={clampedCurrent}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function formatGameNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
