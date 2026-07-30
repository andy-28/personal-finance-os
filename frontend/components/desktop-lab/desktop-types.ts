export type DesktopWindowId = "finance-overview" | "credit-terminal" | "recent-activity" | "mission-board";

export type DesktopWallpaperId = "aether-grid" | "night-sky" | "fantasy-field";

export type DesktopPoint = {
  x: number;
  y: number;
};

export type DesktopSize = {
  width: number;
  height: number;
};

export type DesktopWindowDefinition = {
  id: DesktopWindowId;
  title: string;
  icon: string;
  defaultPosition: DesktopPoint;
  size: DesktopSize;
  minSize?: DesktopSize;
};

export type DesktopWindowState = {
  id: DesktopWindowId;
  isOpen: boolean;
  isMinimized: boolean;
  position: DesktopPoint;
  zIndex: number;
};

export type DesktopWindowLayout = Record<DesktopWindowId, DesktopWindowState>;
