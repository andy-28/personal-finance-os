import { formatCurrency } from "@/lib/formatters";
import { gameUiAccentStyles } from "./game-ui-colors";
import type { GameUiAccent } from "./game-ui-types";

type ResourceGuideProps = {
  title: string;
  description: string;
  sourceLabel: string;
  current: number;
  target: number;
  currencyCode?: string;
  accent?: GameUiAccent;
  actionLabel?: string;
};

export function ResourceGuide({
  title,
  description,
  sourceLabel,
  current,
  target,
  currencyCode = "TWD",
  accent = "cyan",
  actionLabel = "NPC / 確認"
}: ResourceGuideProps) {
  const color = gameUiAccentStyles[accent];
  const safeTarget = Math.max(0, target);
  const safeCurrent = Math.max(0, current);
  const percent = safeTarget > 0 ? Math.max(0, Math.min(100, (safeCurrent / safeTarget) * 100)) : 100;

  return (
    <article className="game-ui-resource-guide" style={{ borderColor: color.border, boxShadow: `0 0 0 2px rgba(0,0,0,0.72), ${color.frameGlow}` }}>
      <div className="game-ui-resource-guide-shine" aria-hidden="true" />
      <div className="game-ui-resource-guide-inner">
        <div className="game-ui-resource-guide-icon" aria-hidden="true">▣</div>
        <div className="min-w-0">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="game-ui-resource-guide-meter">
          <p>{sourceLabel}</p>
          <div className="game-ui-meter-track">
            <div className="game-ui-meter-fill" style={{ width: `${percent}%` }} />
            <span>{formatCurrency(safeCurrent, currencyCode)} / {safeTarget > 0 ? formatCurrency(safeTarget, currencyCode) : "自由值"}</span>
          </div>
          <div className="game-ui-resource-guide-submeter">
            <span>{actionLabel}</span>
            <div>
              <span style={{ width: `${percent}%`, background: color.fill, boxShadow: color.glow }} />
            </div>
          </div>
          <div className="game-ui-resource-guide-footer">
            <span>{color.label}</span>
            <strong>{percent.toFixed(1)}%</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
