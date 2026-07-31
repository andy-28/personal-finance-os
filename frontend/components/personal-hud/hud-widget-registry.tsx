import { HudWidgetGalleryPreview } from "./hud-widget-gallery-preview";
import type { HudWidgetDefinition, HudWidgetType } from "./hud-widget-types";

const aetherVariants = [
  { label: "Aether Cyan", value: "cyan" },
  { label: "Adventure Green", value: "adventure" },
  { label: "Quest Gold", value: "quest" }
];

function gallery(widgetType: HudWidgetType) {
  return function GalleryPreview() {
    return <HudWidgetGalleryPreview widgetType={widgetType} />;
  };
}

export const hudWidgetRegistry: HudWidgetDefinition[] = [
  {
    type: "resource-guide",
    name: "資源指引",
    description: "以 RPG 資源條呈現財務目標進度。",
    category: "goal",
    supportedDataSources: ["goal"],
    layout: { supportedSizes: ["standard", "wide"], defaultSize: "wide", fullWidth: true },
    preview: { aspectRatio: "16 / 9", minHeight: 118, preferredWidth: 320 },
    configurableFields: [
      { type: "text", key: "title", label: "標題", placeholder: "例如：日本旅遊基金", required: true, maxLength: 24 },
      { type: "text", key: "subtitle", label: "副標題", placeholder: "例如：旅遊儲備", maxLength: 32 },
      { type: "boolean", key: "showPercentage", label: "顯示百分比", defaultValue: true },
      { type: "boolean", key: "showCurrent", label: "顯示目前金額", defaultValue: true },
      { type: "boolean", key: "showMaximum", label: "顯示目標金額", defaultValue: true },
      { type: "boolean", key: "showRemaining", label: "顯示剩餘金額", defaultValue: true },
      { type: "select", key: "variant", label: "視覺樣式", options: aetherVariants, defaultValue: "cyan" }
    ],
    status: "stable",
    galleryPreviewComponent: gallery("resource-guide")
  },
  {
    type: "soul-interface",
    name: "靈魂儀表",
    description: "呈現一個核心財務狀態，適合緊急預備金或主目標。",
    category: "status",
    supportedDataSources: ["goal"],
    layout: { supportedSizes: ["standard", "wide"], defaultSize: "standard" },
    preview: { aspectRatio: "16 / 10", minHeight: 128, preferredWidth: 320 },
    configurableFields: [
      { type: "text", key: "title", label: "標題", placeholder: "例如：核心狀態", required: true, maxLength: 24 },
      { type: "text", key: "actionLabel", label: "Action Label", placeholder: "例如：HUD", maxLength: 10, defaultValue: "HUD" },
      { type: "text", key: "bonusLabel", label: "Bonus Label", placeholder: "例如：目標進度", maxLength: 12, defaultValue: "目標進度" },
      { type: "select", key: "numberStyle", label: "數字樣式", options: [
        { label: "Aether", value: "aether" },
        { label: "Default", value: "default" },
        { label: "Damage", value: "damage" }
      ], defaultValue: "aether" },
      { type: "boolean", key: "showSlots", label: "顯示 Slots", defaultValue: true },
      { type: "boolean", key: "showStateBadge", label: "顯示狀態 Badge", defaultValue: true }
    ],
    status: "experimental",
    galleryPreviewComponent: gallery("soul-interface")
  },
  {
    type: "game-number",
    name: "數值面板",
    description: "顯示單一重要財務數字。",
    category: "number",
    supportedDataSources: ["goal"],
    layout: { supportedSizes: ["compact", "standard"], defaultSize: "compact" },
    preview: { aspectRatio: "16 / 7", minHeight: 96, preferredWidth: 280 },
    configurableFields: [
      { type: "text", key: "title", label: "標題", placeholder: "例如：目前進度", required: true, maxLength: 24 },
      { type: "select", key: "valueMode", label: "數值模式", options: [
        { label: "目前金額", value: "current" },
        { label: "目標金額", value: "maximum" },
        { label: "剩餘金額", value: "remaining" },
        { label: "完成百分比", value: "percentage" }
      ], defaultValue: "current" },
      { type: "text", key: "prefix", label: "Prefix", maxLength: 6 },
      { type: "text", key: "suffix", label: "Suffix", maxLength: 6 },
      { type: "select", key: "numberStyle", label: "數字樣式", options: [
        { label: "Finance", value: "default" },
        { label: "Aether", value: "aether" },
        { label: "Damage", value: "damage" }
      ], defaultValue: "default" }
    ],
    status: "stable",
    galleryPreviewComponent: gallery("game-number")
  },
  {
    type: "goal-bar",
    name: "目標血條",
    description: "以精簡血條呈現財務目標進度。",
    category: "goal",
    supportedDataSources: ["goal"],
    layout: { supportedSizes: ["standard", "wide"], defaultSize: "wide", fullWidth: true },
    preview: { aspectRatio: "16 / 7", minHeight: 92, preferredWidth: 320 },
    configurableFields: [
      { type: "text", key: "title", label: "標題", placeholder: "例如：目標血條", required: true, maxLength: 24 },
      { type: "boolean", key: "showCurrent", label: "顯示金額", defaultValue: true },
      { type: "boolean", key: "showPercentage", label: "顯示百分比", defaultValue: true },
      { type: "boolean", key: "showRemaining", label: "顯示剩餘金額", defaultValue: true },
      { type: "select", key: "barStyle", label: "Bar Style", options: aetherVariants, defaultValue: "cyan" }
    ],
    status: "stable",
    galleryPreviewComponent: gallery("goal-bar")
  },
  {
    type: "game-gauge",
    name: "財務量表",
    description: "適合百分比型資訊，例如目標進度或使用率。",
    category: "gauge",
    supportedDataSources: ["goal"],
    layout: { supportedSizes: ["compact", "standard"], defaultSize: "standard" },
    preview: { aspectRatio: "16 / 8", minHeight: 104, preferredWidth: 300 },
    configurableFields: [
      { type: "text", key: "title", label: "標題", placeholder: "例如：財務量表", required: true, maxLength: 24 },
      { type: "boolean", key: "showCurrent", label: "顯示數值", defaultValue: true },
      { type: "boolean", key: "showPercentage", label: "顯示百分比", defaultValue: true },
      { type: "select", key: "gaugeVariant", label: "Gauge Variant", options: [
        { label: "Cyan", value: "cyan" },
        { label: "Purple", value: "purple" },
        { label: "Yellow", value: "yellow" }
      ], defaultValue: "cyan" }
    ],
    status: "experimental",
    galleryPreviewComponent: gallery("game-gauge")
  }
];

export function availableHudWidgetDefinitions() {
  return hudWidgetRegistry.filter((widget) => widget.status !== "workshop-only");
}

export function getHudWidgetDefinition(type: string) {
  return hudWidgetRegistry.find((widget) => widget.type === type);
}
