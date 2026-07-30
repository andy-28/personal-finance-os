export type DesktopWallpaperPreset = "aether-grid" | "night-sky" | "fantasy-field";
export type DesktopWindowSkin = "aether-dark" | "crystal-blue" | "minimal";
export type DesktopDockStyle = "compact" | "hud-bar" | "floating";
export type DesktopHudStyle = "minimal" | "system" | "hidden";
export type DesktopPresetStatus = "active" | "prototype" | "experimental";

export type DesktopLabPreferences = {
  wallpaper: DesktopWallpaperPreset;
  windowSkin: DesktopWindowSkin;
  dockStyle: DesktopDockStyle;
  hudStyle: DesktopHudStyle;
};

export type DesktopPreset<TId extends string> = {
  id: TId;
  label: string;
  description: string;
  previewClass: string;
  status: DesktopPresetStatus;
};

export const defaultDesktopLabPreferences: DesktopLabPreferences = {
  wallpaper: "aether-grid",
  windowSkin: "aether-dark",
  dockStyle: "floating",
  hudStyle: "system"
};

export const desktopWallpaperPresets: Array<DesktopPreset<DesktopWallpaperPreset>> = [
  { id: "aether-grid", label: "Aether Grid", description: "深色網格與 Aether 能量光暈。", previewClass: "desktop-lab-wallpaper-aether-grid", status: "active" },
  { id: "night-sky", label: "Night Sky", description: "夜空、星點與冷色桌面層次。", previewClass: "desktop-lab-wallpaper-night-sky", status: "prototype" },
  { id: "fantasy-field", label: "Fantasy Field", description: "綠色原野與柔和冒險氣氛。", previewClass: "desktop-lab-wallpaper-fantasy-field", status: "prototype" }
];

export const desktopWindowSkinPresets: Array<DesktopPreset<DesktopWindowSkin>> = [
  { id: "aether-dark", label: "Aether Dark", description: "深色金屬視窗、青色邊框與高對比 title bar。", previewClass: "desktop-window-skin-aether-dark", status: "active" },
  { id: "crystal-blue", label: "Crystal Blue", description: "較亮的藍色玻璃感邊框與柔和陰影。", previewClass: "desktop-window-skin-crystal-blue", status: "prototype" },
  { id: "minimal", label: "Minimal", description: "低裝飾、低陰影，方便檢查資訊層級。", previewClass: "desktop-window-skin-minimal", status: "experimental" }
];

export const desktopDockStylePresets: Array<DesktopPreset<DesktopDockStyle>> = [
  { id: "compact", label: "Compact", description: "較小的 Dock 圖示與緊湊 spacing。", previewClass: "desktop-dock-style-compact", status: "prototype" },
  { id: "hud-bar", label: "HUD Bar", description: "偏操作列形式，狀態文字更明顯。", previewClass: "desktop-dock-style-hud-bar", status: "prototype" },
  { id: "floating", label: "Floating", description: "目前預設浮動 Dock，保留大型互動熱區。", previewClass: "desktop-dock-style-floating", status: "active" }
];

export const desktopHudStylePresets: Array<DesktopPreset<DesktopHudStyle>> = [
  { id: "minimal", label: "Minimal", description: "只顯示模式與 Mock 標示。", previewClass: "desktop-hud-style-minimal", status: "prototype" },
  { id: "system", label: "System", description: "顯示可用視窗、開啟視窗與 active window。", previewClass: "desktop-hud-style-system", status: "active" },
  { id: "hidden", label: "Hidden", description: "隱藏 HUD，保留桌面操作空間。", previewClass: "desktop-hud-style-hidden", status: "experimental" }
];

export function normalizeDesktopLabPreferences(candidate: unknown): DesktopLabPreferences {
  if (!candidate || typeof candidate !== "object") return defaultDesktopLabPreferences;
  const source = candidate as Partial<DesktopLabPreferences>;
  return {
    wallpaper: desktopWallpaperPresets.some((preset) => preset.id === source.wallpaper) ? source.wallpaper as DesktopWallpaperPreset : defaultDesktopLabPreferences.wallpaper,
    windowSkin: desktopWindowSkinPresets.some((preset) => preset.id === source.windowSkin) ? source.windowSkin as DesktopWindowSkin : defaultDesktopLabPreferences.windowSkin,
    dockStyle: desktopDockStylePresets.some((preset) => preset.id === source.dockStyle) ? source.dockStyle as DesktopDockStyle : defaultDesktopLabPreferences.dockStyle,
    hudStyle: desktopHudStylePresets.some((preset) => preset.id === source.hudStyle) ? source.hudStyle as DesktopHudStyle : defaultDesktopLabPreferences.hudStyle
  };
}
