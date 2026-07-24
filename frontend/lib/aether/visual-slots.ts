export type VisualSlotKey = "app.favicon";

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
