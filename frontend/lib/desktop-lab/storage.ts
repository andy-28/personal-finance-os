import { desktopWallpapers, desktopWindows } from "@/components/desktop-lab/desktop-mock-data";
import type { DesktopPoint, DesktopWallpaperId, DesktopWindowId, DesktopWindowLayout, DesktopWindowState } from "@/components/desktop-lab/desktop-types";

const wallpaperKey = "desktop-lab.wallpaper";
const layoutKey = "desktop-lab.window-layout";

export function defaultDesktopLayout(): DesktopWindowLayout {
  return desktopWindows.reduce((layout, window, index) => {
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

export function readDesktopWallpaper(): DesktopWallpaperId {
  if (typeof window === "undefined") return "aether-grid";
  const stored = window.localStorage.getItem(wallpaperKey);
  return isWallpaperId(stored) ? stored : "aether-grid";
}

export function writeDesktopWallpaper(wallpaper: DesktopWallpaperId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(wallpaperKey, wallpaper);
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
  window.localStorage.removeItem(wallpaperKey);
  window.localStorage.removeItem(layoutKey);
}

export function normalizeLayout(candidate: unknown): DesktopWindowLayout {
  const fallback = defaultDesktopLayout();
  if (!candidate || typeof candidate !== "object") return fallback;
  const source = candidate as Partial<Record<DesktopWindowId, Partial<DesktopWindowState>>>;

  return desktopWindows.reduce((layout, definition) => {
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

function isWallpaperId(value: unknown): value is DesktopWallpaperId {
  return desktopWallpapers.some((wallpaper) => wallpaper.id === value);
}
