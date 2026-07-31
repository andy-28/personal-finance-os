import type { HudWidgetInstance } from "./hud-widget-types";

export const hudStorageKey = "coin-engine:personal-hud:v1";

type StoredHud = {
  schemaVersion: 1;
  widgets: HudWidgetInstance[];
};

function isWidget(value: unknown): value is HudWidgetInstance {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HudWidgetInstance>;
  return item.schemaVersion === 1 && typeof item.id === "string" && typeof item.widgetType === "string" && typeof item.title === "string" && typeof item.position === "number";
}

export function readHudWidgets(): { widgets: HudWidgetInstance[]; error?: string } {
  if (typeof window === "undefined") return { widgets: [] };
  const raw = window.localStorage.getItem(hudStorageKey);
  if (!raw) return { widgets: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredHud>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.widgets)) return { widgets: [], error: "Personal HUD storage schema is not supported." };
    const ids = new Set<string>();
    const widgets = parsed.widgets.filter(isWidget).filter((widget) => {
      if (ids.has(widget.id)) return false;
      ids.add(widget.id);
      return true;
    }).sort((a, b) => a.position - b.position);
    return { widgets };
  } catch {
    return { widgets: [], error: "Personal HUD storage is corrupted." };
  }
}

export function writeHudWidgets(widgets: HudWidgetInstance[]) {
  if (typeof window === "undefined") return;
  const normalized = widgets.map((widget, index) => ({ ...widget, position: index }));
  window.localStorage.setItem(hudStorageKey, JSON.stringify({ schemaVersion: 1, widgets: normalized }));
}

export function createHudWidgetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `hud-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
