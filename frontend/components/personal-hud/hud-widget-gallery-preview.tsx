import { GameGauge, GameNumber, ResourceGuide, SoulInterface } from "@/components/game-ui";
import type { HudWidgetType } from "./hud-widget-types";
import { hudGalleryPreviewGoal } from "./hud-widget-preview-fixtures";

export function HudWidgetGalleryPreview({ widgetType }: { widgetType: HudWidgetType }) {
  const goal = hudGalleryPreviewGoal;

  if (widgetType === "resource-guide") {
    return (
      <ResourceGuide
        title={goal.title}
        description={goal.description}
        resourceLabel="SAVINGS"
        current={goal.current}
        maximum={goal.maximum}
        statusLabel={goal.statusLabel}
        footerLabel={goal.remainingLabel}
        currencyCode="TWD"
        variant="cyan"
        compact
      />
    );
  }

  if (widgetType === "soul-interface") {
    return (
      <SoulInterface
        title="SOUL WEAPON"
        current={42000}
        maximum={80000}
        bonusLabel="攻擊力"
        bonusValue="+20"
        state="active"
        numberStyle="aether"
        actionLabel="全量轉換滿"
      />
    );
  }

  if (widgetType === "game-number") {
    return (
      <div className="hud-gallery-number" aria-hidden="true">
        <span>目前進度</span>
        <GameNumber value={goal.currentLabel} variant="finance" size="lg" glow />
      </div>
    );
  }

  if (widgetType === "goal-bar") {
    return (
      <div className="hud-gallery-goalbar" role="progressbar" aria-label="目標血條預覽" aria-valuemin={0} aria-valuemax={100} aria-valuenow={53}>
        <span style={{ width: `${goal.percentage}%` }} />
        <strong>{goal.title}</strong>
      </div>
    );
  }

  return (
    <div className="hud-gallery-gauge" aria-hidden="true">
      <GameGauge current={goal.current} maximum={goal.maximum} variant="cyan" size="md" label="目標進度" showValue />
    </div>
  );
}
