type SoulInterfaceProps = {
  title?: string;
  value: number;
  max: number;
  bonusLabel?: string;
  stateLabel?: string;
};

const soulSlots = ["◇", "◆", "⌂", "⌂", "商"];

export function SoulInterface({ title = "Soul Weapon", value, max, bonusLabel = "攻擊力", stateLabel = "OFF" }: SoulInterfaceProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <article className="game-ui-soul-card">
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
            <strong>{value}</strong>
            <span>/ {max}</span>
          </div>
          <button type="button">全靈魂<br />填滿</button>
        </div>
        <div className="game-ui-soul-meter">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="game-ui-soul-stat">
          <span>{bonusLabel}</span>
          <strong>+20</strong>
        </div>
        <div className="game-ui-soul-slots">
          {soulSlots.map((slot, index) => <span key={`${slot}-${index}`}>{slot}</span>)}
        </div>
        <div className="game-ui-soul-state">
          <span>{stateLabel}</span>
        </div>
      </div>
    </article>
  );
}
