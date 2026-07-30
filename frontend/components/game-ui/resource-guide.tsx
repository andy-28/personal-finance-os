import { formatCurrency } from "@/lib/formatters";
import { gameUiAccentStyles } from "./game-ui-colors";
import { GameGauge } from "./game-gauge";

type ResourceGuideProps = {
  title: string;
  description: string;
  resourceLabel: string;
  current: number;
  maximum: number;
  statusLabel: string;
  footerLabel: string;
  currencyCode?: string;
  variant: "cyan" | "aether" | "warning";
  compact?: boolean;
};

export function ResourceGuide({
  title,
  description,
  resourceLabel,
  current,
  maximum,
  statusLabel,
  footerLabel,
  currencyCode = "TWD",
  variant,
  compact = false
}: ResourceGuideProps) {
  const accent = variant === "aether" ? "violet" : variant === "warning" ? "amber" : "cyan";
  const color = gameUiAccentStyles[accent];
  const safeMaximum = Number.isFinite(maximum) ? Math.max(0, maximum) : 0;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  const clampedCurrent = safeMaximum > 0 ? Math.min(safeCurrent, safeMaximum) : 0;
  const percent = safeMaximum > 0 ? Math.max(0, Math.min(100, (safeCurrent / safeMaximum) * 100)) : 0;

  return (
    <article className={`game-ui-resource-guide ${compact ? "game-ui-resource-guide-compact" : ""}`} style={{ borderColor: color.border, boxShadow: `0 0 0 2px rgba(0,0,0,0.72), ${color.frameGlow}` }}>
      <div className="game-ui-resource-guide-shine" aria-hidden="true" />
      <div className="game-ui-resource-guide-inner">
        <div className="game-ui-resource-guide-icon" aria-hidden="true">▣</div>
        <div className="min-w-0">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="game-ui-resource-guide-meter">
          <p>{resourceLabel}</p>
          <GameGauge current={clampedCurrent} maximum={safeMaximum} variant={variant === "aether" ? "purple" : variant === "warning" ? "yellow" : "cyan"} size={compact ? "sm" : "md"} showValue label={statusLabel} />
          <div className="game-ui-resource-guide-submeter">
            <span>{statusLabel}</span>
            <div>
              <span style={{ width: `${percent}%`, background: color.fill, boxShadow: color.glow }} />
            </div>
          </div>
          <div className="game-ui-resource-guide-footer">
            <span>{footerLabel}</span>
            <strong>{formatCurrency(clampedCurrent, currencyCode)} / {safeMaximum > 0 ? formatCurrency(safeMaximum, currencyCode) : "0"}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
