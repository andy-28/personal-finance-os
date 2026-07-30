import { desktopWindowRegistry } from "@/lib/desktop-lab/window-registry";
import { defaultDesktopLabPreferences, desktopWallpaperPresets, normalizeDesktopLabPreferences, type DesktopLabPreferences, type DesktopWallpaperPreset } from "@/lib/desktop-lab/presets";
import type { DesktopPoint, DesktopWindowId, DesktopWindowLayout, DesktopWindowState } from "@/components/desktop-lab/desktop-types";

const legacyWallpaperKey = "desktop-lab.wallpaper";
const layoutKey = "desktop-lab.window-layout";
const preferencesKey = "desktop-lab.preferences";

export function defaultDesktopLayout(): DesktopWindowLayout {
  return desktopWindowRegistry.reduce((layout, window, index) => {
    layout[window.id] = {
      id: window.id,
      isOpen: index < 4,
      isMinimized: false,
      position: window.defaultPosition,
      zIndex: index + 1
    };
    return layout;
  }, {} as DesktopWindowLayout);
}

export function readDesktopPreferences(): DesktopLabPreferences {
  if (typeof window === "undefined") return defaultDesktopLabPreferences;
  try {
    const raw = window.localStorage.getItem(preferencesKey);
    const legacyWallpaper = window.localStorage.getItem(legacyWallpaperKey);
    const normalized = normalizeDesktopLabPreferences(raw ? JSON.parse(raw) : null);
    if (!raw && isWallpaperId(legacyWallpaper)) return { ...normalized, wallpaper: legacyWallpaper };
    return normalized;
  } catch {
    return defaultDesktopLabPreferences;
  }
}

export function writeDesktopPreferences(preferences: DesktopLabPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(preferencesKey, JSON.stringify(normalizeDesktopLabPreferences(preferences)));
}

export function writeDesktopPreference<TKey extends keyof DesktopLabPreferences>(key: TKey, value: DesktopLabPreferences[TKey]) {
  const next = { ...readDesktopPreferences(), [key]: value };
  writeDesktopPreferences(next);
  return next;
}

export function readDesktopWallpaper(): DesktopWallpaperPreset {
  return readDesktopPreferences().wallpaper;
}

export function writeDesktopWallpaper(wallpaper: DesktopWallpaperPreset) {
  writeDesktopPreference("wallpaper", wallpaper);
}

export function readDesktopLayout(): DesktopWindowLayout {
  if (typeof window === "undefined") return defaultDesktopLayout();

  try {
    const raw = window.localStorage.getItem(layoutKey);
    if (!raw) return defaultDesktopLayout();
    return normalizeLayout(JSON.parse(raw));
  } catch {
    return defaultDesktopLayout();
  }
}

export function writeDesktopLayout(layout: DesktopWindowLayout) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(layoutKey, JSON.stringify(layout));
}

export function clearDesktopLabStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(layoutKey);
}

export function clearDesktopAppearanceStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(legacyWallpaperKey);
  window.localStorage.removeItem(preferencesKey);
}

export function normalizeLayout(candidate: unknown): DesktopWindowLayout {
  const fallback = defaultDesktopLayout();
  if (!candidate || typeof candidate !== "object") return fallback;
  const source = candidate as Partial<Record<DesktopWindowId, Partial<DesktopWindowState>>>;

  return desktopWindowRegistry.reduce((layout, definition) => {
    const next = source[definition.id];
    layout[definition.id] = {
      ...fallback[definition.id],
      ...next,
      id: definition.id,
      isOpen: typeof next?.isOpen === "boolean" ? next.isOpen : fallback[definition.id].isOpen,
      isMinimized: typeof next?.isMinimized === "boolean" ? next.isMinimized : fallback[definition.id].isMinimized,
      position: normalizePoint(next?.position, fallback[definition.id].position),
      zIndex: typeof next?.zIndex === "number" && Number.isFinite(next.zIndex) ? next.zIndex : fallback[definition.id].zIndex
    };
    return layout;
  }, {} as DesktopWindowLayout);
}

function normalizePoint(candidate: unknown, fallback: DesktopPoint): DesktopPoint {
  if (!candidate || typeof candidate !== "object") return fallback;
  const point = candidate as Partial<DesktopPoint>;
  return {
    x: typeof point.x === "number" && Number.isFinite(point.x) ? point.x : fallback.x,
    y: typeof point.y === "number" && Number.isFinite(point.y) ? point.y : fallback.y
  };
}

function isWallpaperId(value: unknown): value is DesktopWallpaperPreset {
  return desktopWallpaperPresets.some((wallpaper) => wallpaper.id === value);
}
