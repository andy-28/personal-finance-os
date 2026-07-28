export type VisualSlotKey = "app.favicon" | "page.header-divider";

export type BuiltInVisualAsset = {
  id: string;
  name: string;
  format: "PNG";
  source: "builtin";
  slotKeys: VisualSlotKey[];
  src: string;
};

export const visualSlots = {
  favicon: {
    key: "app.favicon" as const,
    label: "Favicon",
    category: "branding",
    defaultAssetId: "default-favicon"
  },
  headerDivider: {
    key: "page.header-divider" as const,
    label: "頁首能量分隔線",
    category: "effects",
    categoryLabel: "視覺特效",
    description: "控制頁面標題區下方的 Aether WebP 能量分隔線。",
    defaultEnabled: true,
    assetPath: "/aether/effects/purple-energy-divider.webp"
  }
};

export const builtInVisualAssets: BuiltInVisualAsset[] = [
  {
    id: "default-favicon",
    name: "預設圖示",
    format: "PNG",
    source: "builtin",
    slotKeys: ["app.favicon"],
    src: "/icon.png"
  },
  {
    id: "aether-favicon",
    name: "Aether 圖示",
    format: "PNG",
    source: "builtin",
    slotKeys: ["app.favicon"],
    src: "/aether/branding/aether-favicon.png"
  }
];

export function getBuiltInVisualAsset(assetId: string, slotKey: VisualSlotKey = visualSlots.favicon.key) {
  return builtInVisualAssets.find((asset) => asset.id === assetId && asset.slotKeys.includes(slotKey));
}

export function getDefaultVisualAsset(slotKey: VisualSlotKey = visualSlots.favicon.key) {
  return getBuiltInVisualAsset(visualSlots.favicon.defaultAssetId, slotKey) ?? builtInVisualAssets[0];
}
