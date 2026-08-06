import { GameGauge, GameNumber, ResourceGuide, SoulInterface } from "@/components/game-ui";
import type { AccountDto, UserGoalBarDto } from "@/lib/api-client";
import { coinTerminology } from "@/lib/coin-engine-terminology";
import { getHudWidgetDefinition } from "./hud-widget-registry";
import type { HudWidgetDisplayMode, HudWidgetInstance } from "./hud-widget-types";
import { goalWidgetAdapter } from "./adapters/goal-widget-adapter";

export function HudWidgetRenderer({
  widget,
  goals,
  accounts,
  displayMode = "canvas"
}: {
  widget: HudWidgetInstance;
  goals: UserGoalBarDto[];
  accounts: AccountDto[];
  displayMode?: HudWidgetDisplayMode;
}) {
  const definition = getHudWidgetDefinition(widget.widgetType);
  if (!definition || definition.status === "workshop-only") return <HudWidgetUnavailable />;
  if (widget.dataSource.type !== "goal") return <HudWidgetUnavailable detail="這個資料來源目前仍在規劃中。" />;
  const goalBinding = widget.dataSource;

  const goal = goals.find((candidate) => candidate.id === goalBinding.goalId);
  if (!goal) return <HudWidgetUnavailable title={coinTerminology.emptyState.hudDataSourceLost.title} detail={coinTerminology.emptyState.hudDataSourceLost.description} />;

  const viewModel = goalWidgetAdapter(goal, accounts.find((account) => account.id === goal.accountId), widget.config);

  if (widget.widgetType === "resource-guide") {
    return (
      <div className={`hud-render hud-render-${displayMode}`}>
        <ResourceGuide
        title={viewModel.title}
        description={viewModel.description}
        resourceLabel="財務目標"
        current={viewModel.current}
        maximum={viewModel.maximum}
        statusLabel={widget.config.showPercentage === false ? "進行中" : viewModel.statusLabel}
        footerLabel={widget.config.showRemaining === false ? "財務目標" : viewModel.remainingLabel}
        currencyCode={viewModel.currencyCode}
        variant={viewModel.variant}
        compact={displayMode !== "canvas"}
        />
      </div>
    );
  }

  if (widget.widgetType === "soul-interface") {
    return (
      <div className={`hud-render hud-render-${displayMode}`}>
        <SoulInterface
          title={viewModel.title}
          current={viewModel.current}
          maximum={viewModel.maximum}
          bonusLabel={widget.config.bonusLabel || "目標進度"}
          bonusValue={viewModel.statusLabel}
          state={viewModel.state}
          numberStyle={widget.config.numberStyle ?? (viewModel.variant === "warning" ? "damage" : "aether")}
          actionLabel={widget.config.actionLabel || "HUD"}
          showSlots={widget.config.showSlots !== false}
          showStateBadge={widget.config.showStateBadge !== false}
        />
      </div>
    );
  }

  if (widget.widgetType === "game-number") {
    const remaining = Math.max(0, viewModel.maximum - viewModel.current);
    const numberValue = widget.config.valueMode === "maximum"
      ? viewModel.maximumLabel
      : widget.config.valueMode === "remaining"
        ? viewModel.remainingLabel.replace(/^剩餘\s*/, "")
        : widget.config.valueMode === "percentage"
          ? viewModel.statusLabel
          : viewModel.currentLabel;
    const numberVariant = widget.config.numberStyle === "damage" ? "damage" : widget.config.numberStyle === "aether" ? "aether" : viewModel.variant === "warning" ? "warning" : "finance";
    return (
      <div className={`hud-number-widget hud-render hud-render-${displayMode}`}>
        <span>{viewModel.title}</span>
        <GameNumber value={`${widget.config.prefix ?? ""}${numberValue}${widget.config.suffix ?? ""}`} variant={numberVariant} size="xl" glow />
        <small>{viewModel.description} · {widget.config.valueMode === "remaining" ? `剩餘 ${remaining.toLocaleString()}` : viewModel.statusLabel}</small>
      </div>
    );
  }

  if (widget.widgetType === "goal-bar") {
    return (
      <div className={`hud-goal-bar-widget hud-render hud-render-${displayMode}`}>
        <div className="hud-goal-bar-title">
          <strong>{viewModel.title}</strong>
          <span>{viewModel.statusLabel}</span>
        </div>
        <div className="hud-goal-bar-track" role="progressbar" aria-label={`${viewModel.title} 進度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(viewModel.percentage)}>
          <span style={{ width: `${viewModel.percentage}%` }} />
        </div>
        <p>{widget.config.showCurrent === false ? viewModel.remainingLabel : `${viewModel.currentLabel} / ${viewModel.maximumLabel}`}</p>
      </div>
    );
  }

  if (widget.widgetType === "game-gauge") {
    return (
      <div className={`hud-gauge-widget hud-render hud-render-${displayMode}`}>
        <strong>{viewModel.title}</strong>
        <GameGauge current={viewModel.current} maximum={viewModel.maximum} variant={widget.config.gaugeVariant ?? (viewModel.variant === "warning" ? "yellow" : viewModel.variant === "aether" ? "purple" : "cyan")} size="md" label={widget.config.showPercentage === false ? "目標進度" : viewModel.statusLabel} showValue={widget.config.showCurrent !== false} />
      </div>
    );
  }

  return <HudWidgetUnavailable />;
}

export function HudWidgetUnavailable({
  title = coinTerminology.emptyState.hudUnsupportedWidget.title,
  detail = coinTerminology.emptyState.hudUnsupportedWidget.description
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="hud-widget-unavailable" role="status">
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
}
