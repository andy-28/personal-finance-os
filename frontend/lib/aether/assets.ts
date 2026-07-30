import { dashboardProfileImageOptions } from "./dashboard-profile-settings";
import { builtInVisualAssets, visualSlots } from "./visual-slots";
import { desktopWallpaperPresets } from "@/lib/desktop-lab/presets";

export type AetherAssetCategory = "app-icon" | "dashboard-image" | "wallpaper" | "window-skin" | "dock-icon" | "hud";

export type AetherAsset = {
  id: string;
  name: string;
  category: AetherAssetCategory;
  path: string;
  description: string;
  builtIn: boolean;
  tags: string[];
  usage: string;
};

export function getAetherAssetRegistry(currentIds: string[] = []): Array<AetherAsset & { isCurrent: boolean }> {
  const appIcons: AetherAsset[] = builtInVisualAssets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    category: "app-icon",
    path: asset.src,
    description: "Browser tab and app icon.",
    builtIn: true,
    tags: ["appearance", "favicon", ...asset.slotKeys],
    usage: asset.slotKeys.includes(visualSlots.favicon.key) ? "Favicon" : "Visual slot"
  }));

  const dashboardImages: AetherAsset[] = dashboardProfileImageOptions.map((asset) => ({
    id: asset.id,
    name: asset.name,
    category: "dashboard-image",
    path: asset.src,
    description: asset.description,
    builtIn: true,
    tags: ["dashboard", "profile", "appearance"],
    usage: "Dashboard Profile Image"
  }));

  const wallpapers: AetherAsset[] = desktopWallpaperPresets.map((preset) => ({
    id: preset.id,
    name: preset.label,
    category: "wallpaper",
    path: preset.previewClass,
    description: preset.description,
    builtIn: true,
    tags: ["desktop-lab", "wallpaper", preset.status],
    usage: "Desktop Lab wallpaper"
  }));

  return [...appIcons, ...dashboardImages, ...wallpapers].map((asset) => ({
    ...asset,
    isCurrent: currentIds.includes(asset.id)
  }));
}
