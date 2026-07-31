import { Button } from "@/components/ui/button";
import type { AccountDto, UserGoalBarDto } from "@/lib/api-client";
import type { HudWidgetInstance } from "./hud-widget-types";
import { HudWidgetRenderer } from "./hud-widget-renderer";

export function HudWidgetCard({
  widget,
  goals,
  accounts,
  isEditing,
  isFirst,
  isLast,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  widget: HudWidgetInstance;
  goals: UserGoalBarDto[];
  accounts: AccountDto[];
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <article className="hud-widget-card">
      <HudWidgetRenderer widget={widget} goals={goals} accounts={accounts} />
      {isEditing && (
        <div className="hud-widget-actions" aria-label={`${widget.title} 管理操作`}>
          <Button type="button" variant="outline" size="sm" onClick={onEdit} aria-label={`編輯 ${widget.title}`}>編輯</Button>
          <Button type="button" variant="outline" size="sm" onClick={onMoveUp} disabled={isFirst} aria-label={`上移 ${widget.title}`}>上移</Button>
          <Button type="button" variant="outline" size="sm" onClick={onMoveDown} disabled={isLast} aria-label={`下移 ${widget.title}`}>下移</Button>
          <Button type="button" variant="danger" size="sm" onClick={onRemove} aria-label={`移除 ${widget.title}`}>移除</Button>
        </div>
      )}
    </article>
  );
}
