"use client";

import { useState } from "react";
import { HudEmptyState } from "./hud-empty-state";
import { HudWidgetCard } from "./hud-widget-card";
import { HudWidgetConfigSheet } from "./hud-widget-config-sheet";
import { readHudWidgets, writeHudWidgets } from "./hud-storage";
import type { HudWidgetInstance } from "./hud-widget-types";
import type { AccountDto, UserGoalBarDto } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { coinTerminology } from "@/lib/coin-engine-terminology";

export function PersonalHud({ goals, accounts }: { goals: UserGoalBarDto[]; accounts: AccountDto[] }) {
  const { actions, emptyState, hud } = coinTerminology;
  const [widgets, setWidgets] = useState<HudWidgetInstance[]>(() => readHudWidgets().widgets);
  const [storageError] = useState<string | null>(() => readHudWidgets().error ?? null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<HudWidgetInstance | null>(null);

  function persist(next: HudWidgetInstance[]) {
    const normalized = next.map((widget, index) => ({ ...widget, position: index }));
    setWidgets(normalized);
    writeHudWidgets(normalized);
  }

  function openAdd() {
    setEditingWidget(null);
    setIsSheetOpen(true);
  }

  function saveWidget(widget: HudWidgetInstance) {
    const next = editingWidget ? widgets.map((item) => item.id === widget.id ? widget : item) : [...widgets, widget];
    persist(next);
    setIsSheetOpen(false);
    setEditingWidget(null);
    setIsEditing(true);
    setFeedbackMessage(editingWidget ? hud.feedback.saved : hud.feedback.added);
  }

  function removeWidget(widget: HudWidgetInstance) {
    const confirmed = window.confirm(`移除「${widget.title}」？`);
    if (!confirmed) return;
    persist(widgets.filter((item) => item.id !== widget.id));
    setFeedbackMessage(hud.feedback.removed);
  }

  function moveWidget(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    persist(next);
    setFeedbackMessage(hud.feedback.reordered);
  }

  return (
    <div className="personal-hud-shell">
      <div className="personal-hud-hero">
        <div>
          <p className="mobile-section-eyebrow">{hud.systemLabel}</p>
          <h1>{hud.title}</h1>
          <p>{hud.heroDescription}</p>
        </div>
        <div className="personal-hud-hero-actions">
          {widgets.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing((current) => !current)}>{isEditing ? "完成" : actions.editHudWidget}</Button>}
          {isEditing && <Button type="button" size="sm" onClick={openAdd}>{actions.addHudWidget}</Button>}
        </div>
      </div>

      {feedbackMessage && <p className="sr-only" role="status" aria-live="polite">{feedbackMessage}</p>}

      {storageError && (
        <div className="hud-storage-warning" role="status">
          <strong>{emptyState.hudStorageCorrupted.title}</strong>
          <small>{storageError}</small>
        </div>
      )}

      {widgets.length === 0 ? (
        <HudEmptyState onAdd={openAdd} />
      ) : (
        <div className="personal-hud-grid">
          {widgets.map((widget, index) => (
            <HudWidgetCard
              key={widget.id}
              widget={widget}
              goals={goals}
              accounts={accounts}
              isEditing={isEditing}
              isFirst={index === 0}
              isLast={index === widgets.length - 1}
              onEdit={() => { setEditingWidget(widget); setIsSheetOpen(true); }}
              onRemove={() => removeWidget(widget)}
              onMoveUp={() => moveWidget(index, -1)}
              onMoveDown={() => moveWidget(index, 1)}
            />
          ))}
        </div>
      )}

      {isSheetOpen && (
        <HudWidgetConfigSheet
          goals={goals}
          accounts={accounts}
          existing={editingWidget}
          nextPosition={widgets.length}
          onClose={() => { setIsSheetOpen(false); setEditingWidget(null); }}
          onSave={saveWidget}
        />
      )}
    </div>
  );
}
