import type { AetherNumberAsset, AetherNumberEditorState } from "./aether-number-types";

const baseAppearance: AetherNumberEditorState["appearance"] = {
  primaryColor: "#ff4fa3",
  outlineColor: "#580026",
  outlineWidth: 2,
  glowStrength: 70,
  shadowStrength: 58,
  opacity: 100,
  fontSize: 78,
  letterSpacing: 0,
  typographyId: "bungee",
  fontWeight: 400,
  numberSpacing: 0,
  digitWidth: 100,
  textTransform: "none",
  gradientEnabled: true
};

export const aetherNumberAssets: AetherNumberAsset[] = [
  {
    id: "pink-critical",
    name: "粉紅爆擊",
    systemLabel: "PINK CRITICAL",
    status: "stable",
    description: "高亮爆擊感，適合大型數字與任務獎勵。",
    previewValue: "123,456",
    typographyId: "bungee",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["爆擊", "獎勵", "Hero"],
    thumbnailVariant: "pink",
    isFavorite: true,
    appearance: { ...baseAppearance, typographyId: "bungee", primaryColor: "#ff4fa3", outlineColor: "#5a0630", glowStrength: 86 },
    effects: { preset: "impact", durationMs: 780, glyphDelayMs: 28, intensity: 72 }
  },
  {
    id: "coin-gold",
    name: "金幣風格",
    systemLabel: "COIN GOLD",
    status: "stable",
    description: "財務金額與收入提示用，偏溫暖明亮。",
    previewValue: "+67,899",
    typographyId: "bungee",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["收入", "金幣", "通知"],
    thumbnailVariant: "gold",
    appearance: { ...baseAppearance, typographyId: "bungee", primaryColor: "#ffc247", outlineColor: "#5f3200", glowStrength: 74, shadowStrength: 64 },
    effects: { preset: "rise", durationMs: 900, glyphDelayMs: 20, intensity: 52 }
  },
  {
    id: "frost-blue",
    name: "冰霜藍",
    systemLabel: "FROST BLUE",
    status: "stable",
    description: "冷色系未來感，適合比例與進度顯示。",
    previewValue: "75%",
    typographyId: "fredoka",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["百分比", "進度", "狀態"],
    thumbnailVariant: "ice",
    appearance: { ...baseAppearance, typographyId: "fredoka", fontWeight: 700, primaryColor: "#79d8ff", outlineColor: "#06324a", glowStrength: 62, shadowStrength: 44 },
    effects: { preset: "none", durationMs: 700, glyphDelayMs: 18, intensity: 40 }
  },
  {
    id: "shadow-purple",
    name: "暗影紫",
    systemLabel: "SHADOW PURPLE",
    status: "experimental",
    description: "高對比暗色效果，適合稀有狀態。",
    previewValue: "987,654",
    typographyId: "bungee-inline",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["稀有", "暗色", "實驗"],
    thumbnailVariant: "shadow",
    appearance: { ...baseAppearance, typographyId: "bungee-inline", primaryColor: "#b94cff", outlineColor: "#1f0731", glowStrength: 80, shadowStrength: 82 },
    effects: { preset: "impact", durationMs: 860, glyphDelayMs: 35, intensity: 76 }
  },
  {
    id: "nature-green",
    name: "自然綠",
    systemLabel: "NATURE GREEN",
    status: "stable",
    description: "柔和自然風格，適合正向現金流。",
    previewValue: "+12,345",
    typographyId: "fredoka",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["現金流", "正向", "RPG UI"],
    thumbnailVariant: "nature",
    appearance: { ...baseAppearance, typographyId: "fredoka", fontWeight: 700, primaryColor: "#73e56a", outlineColor: "#123b16", glowStrength: 58, shadowStrength: 40 },
    effects: { preset: "rise", durationMs: 820, glyphDelayMs: 18, intensity: 44 }
  },
  {
    id: "metal-silver",
    name: "金屬銀",
    systemLabel: "METAL SILVER",
    status: "workshop-only",
    description: "中性數值與工具型介面用。",
    previewValue: "42,000",
    typographyId: "default",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["工具", "中性", "Workshop"],
    thumbnailVariant: "silver",
    appearance: { ...baseAppearance, typographyId: "default", fontWeight: 950, primaryColor: "#dce8f4", outlineColor: "#273445", glowStrength: 34, shadowStrength: 70 },
    effects: { preset: "none", durationMs: 700, glyphDelayMs: 16, intensity: 34 }
  },
  {
    id: "warning-red",
    name: "警示紅",
    systemLabel: "WARNING RED",
    status: "experimental",
    description: "支出、負數與風險提示。",
    previewValue: "-12,345",
    typographyId: "bungee",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["支出", "負數", "警示"],
    thumbnailVariant: "danger",
    appearance: { ...baseAppearance, typographyId: "bungee", primaryColor: "#ff5b5b", outlineColor: "#4a0808", glowStrength: 76, shadowStrength: 74 },
    effects: { preset: "impact", durationMs: 760, glyphDelayMs: 24, intensity: 70 }
  },
  {
    id: "classic-adventure",
    name: "經典冒險",
    systemLabel: "CLASSIC ADVENTURE",
    status: "stable",
    description: "8-bit 遊戲語氣，適合工坊測試。",
    previewValue: "12,345",
    typographyId: "bungee-inline",
    renderer: "web-font",
    version: "0.1.0",
    tags: ["冒險", "Arcade", "測試"],
    thumbnailVariant: "classic",
    appearance: { ...baseAppearance, typographyId: "bungee-inline", primaryColor: "#ff8c32", outlineColor: "#522000", glowStrength: 54, shadowStrength: 68, gradientEnabled: false },
    effects: { preset: "rise", durationMs: 720, glyphDelayMs: 12, intensity: 46 }
  }
];

export const aetherNumberPresets = aetherNumberAssets;

export function createAetherNumberEditorState(asset: AetherNumberAsset = aetherNumberAssets[0]): AetherNumberEditorState {
  return {
    selectedPresetId: asset.id,
    previewValue: asset.previewValue,
    previewScene: "income",
    activeTab: "animation",
    replayKey: 0,
    playbackSpeed: 1,
    previewBackground: "forest",
    previewScale: 1,
    appearance: { ...asset.appearance },
    effects: {
      ...asset.effects,
      direction: "up",
      reducedMotion: false
    },
    formatting: {
      showPlusSign: false,
      useThousandsSeparator: true,
      decimals: 0,
      prefix: "",
      suffix: "",
      displayMode: "hero",
      playbackMode: "full",
      renderer: asset.renderer,
      maxCharacters: 14,
      shrinkLongNumbers: true,
      accessibilityLabel: "數字特效預覽"
    }
  };
}
