import { GameGauge } from "./game-gauge";
import { GameNumber, type GameNumberVariant } from "./game-number";

type SoulInterfaceProps = {
  title: string;
  current: number;
  maximum: number;
  bonusLabel: string;
  bonusValue: string;
  state: "off" | "active" | "complete";
  numberStyle: "default" | "aether" | "damage";
  actionLabel: string;
};

const soulSlots = ["◇", "◆", "⌂", "⌂", "商"];

export function SoulInterface({ title, current, maximum, bonusLabel, bonusValue, state, numberStyle, actionLabel }: SoulInterfaceProps) {
  const safeMaximum = Number.isFinite(maximum) ? Math.max(0, maximum) : 0;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  const clampedCurrent = safeMaximum > 0 ? Math.min(safeCurrent, safeMaximum) : 0;
  const numberVariant: GameNumberVariant = numberStyle === "damage" ? "damage" : numberStyle === "aether" ? "aether" : "finance";

  return (
    <article className={`game-ui-soul-card game-ui-soul-${state}`}>
      <div className="game-ui-soul-titlebar">
        <span>{title}</span>
        <span className="game-ui-soul-controls" aria-hidden="true">
          <span>-</span>
          <span>x</span>
        </span>
      </div>
      <div className="game-ui-soul-body">
        <div className="game-ui-soul-score">
          <div>
            <GameNumber value={clampedCurrent} variant={numberVariant} size="xl" glow outline />
            <span>/ {new Intl.NumberFormat("en-US").format(safeMaximum)}</span>
          </div>
          <button type="button">{actionLabel}</button>
        </div>
        <GameGauge current={clampedCurrent} maximum={safeMaximum} variant="purple" size="sm" showPercentage={false} />
        <div className="game-ui-soul-stat">
          <span>{bonusLabel}</span>
          <strong>{bonusValue}</strong>
        </div>
        <div className="game-ui-soul-slots">
          {soulSlots.map((slot, index) => <span key={`${slot}-${index}`}>{slot}</span>)}
        </div>
        <div className="game-ui-soul-state">
          <span>{state}</span>
        </div>
      </div>
    </article>
  );
}
