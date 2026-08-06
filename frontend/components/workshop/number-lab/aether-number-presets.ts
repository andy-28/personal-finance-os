import type { AetherNumberEditorState, AetherNumberPreset } from "./aether-number-types";

const baseAppearance: AetherNumberEditorState["appearance"] = {
  primaryColor: "#ff4fa3",
  outlineColor: "#580026",
  outlineWidth: 2,
  glowStrength: 70,
  shadowStrength: 58,
  opacity: 100,
  fontSize: 78,
  letterSpacing: 0,
  gradientEnabled: true
};

export const aetherNumberPresets: AetherNumberPreset[] = [
  {
    id: "pink-critical",
    name: "粉紅爆擊",
    systemLabel: "PINK CRITICAL",
    status: "stable",
    description: "高亮爆擊感，適合大型數字與任務獎勵。",
    previewValue: "123,456",
    thumbnailVariant: "pink",
    isFavorite: true,
    appearance: { ...baseAppearance, primaryColor: "#ff4fa3", outlineColor: "#5a0630", glowStrength: 86 },
    effects: { preset: "impact", durationMs: 780, glyphDelayMs: 28, intensity: 72 }
  },
  {
    id: "coin-gold",
    name: "金幣風格",
    systemLabel: "COIN GOLD",
    status: "stable",
    description: "財務金額與收入提示用，偏溫暖明亮。",
    previewValue: "+67,899",
    thumbnailVariant: "gold",
    appearance: { ...baseAppearance, primaryColor: "#ffc247", outlineColor: "#5f3200", glowStrength: 74, shadowStrength: 64 },
    effects: { preset: "rise", durationMs: 900, glyphDelayMs: 20, intensity: 52 }
  },
  {
    id: "frost-blue",
    name: "冰霜藍",
    systemLabel: "FROST BLUE",
    status: "stable",
    description: "冷色系未來感，適合比例與進度顯示。",
    previewValue: "75%",
    thumbnailVariant: "ice",
    appearance: { ...baseAppearance, primaryColor: "#79d8ff", outlineColor: "#06324a", glowStrength: 62, shadowStrength: 44 },
    effects: { preset: "none", durationMs: 700, glyphDelayMs: 18, intensity: 40 }
  },
  {
    id: "shadow-purple",
    name: "暗影紫",
    systemLabel: "SHADOW PURPLE",
    status: "experimental",
    description: "高對比暗色效果，適合稀有狀態。",
    previewValue: "987,654",
    thumbnailVariant: "shadow",
    appearance: { ...baseAppearance, primaryColor: "#b94cff", outlineColor: "#1f0731", glowStrength: 80, shadowStrength: 82 },
    effects: { preset: "impact", durationMs: 860, glyphDelayMs: 35, intensity: 76 }
  },
  {
    id: "nature-green",
    name: "自然綠",
    systemLabel: "NATURE GREEN",
    status: "stable",
    description: "柔和自然風格，適合正向現金流。",
    previewValue: "+12,345",
    thumbnailVariant: "nature",
    appearance: { ...baseAppearance, primaryColor: "#73e56a", outlineColor: "#123b16", glowStrength: 58, shadowStrength: 40 },
    effects: { preset: "rise", durationMs: 820, glyphDelayMs: 18, intensity: 44 }
  },
  {
    id: "metal-silver",
    name: "金屬銀",
    systemLabel: "METAL SILVER",
    status: "workshop-only",
    description: "中性數值與工具型介面用。",
    previewValue: "42,000",
    thumbnailVariant: "silver",
    appearance: { ...baseAppearance, primaryColor: "#dce8f4", outlineColor: "#273445", glowStrength: 34, shadowStrength: 70 },
    effects: { preset: "none", durationMs: 700, glyphDelayMs: 16, intensity: 34 }
  },
  {
    id: "warning-red",
    name: "警示紅",
    systemLabel: "WARNING RED",
    status: "experimental",
    description: "支出、負數與風險提示。",
    previewValue: "-12,345",
    thumbnailVariant: "danger",
    appearance: { ...baseAppearance, primaryColor: "#ff5b5b", outlineColor: "#4a0808", glowStrength: 76, shadowStrength: 74 },
    effects: { preset: "impact", durationMs: 760, glyphDelayMs: 24, intensity: 70 }
  },
  {
    id: "classic-adventure",
    name: "經典冒險",
    systemLabel: "CLASSIC ADVENTURE",
    status: "stable",
    description: "8-bit 遊戲語氣，適合工坊測試。",
    previewValue: "12,345",
    thumbnailVariant: "classic",
    appearance: { ...baseAppearance, primaryColor: "#ff8c32", outlineColor: "#522000", glowStrength: 54, shadowStrength: 68, gradientEnabled: false },
    effects: { preset: "rise", durationMs: 720, glyphDelayMs: 12, intensity: 46 }
  }
];

export function createAetherNumberEditorState(preset: AetherNumberPreset = aetherNumberPresets[0]): AetherNumberEditorState {
  return {
    selectedPresetId: preset.id,
    previewValue: preset.previewValue,
    activeTab: "appearance",
    replayKey: 0,
    playbackSpeed: 1,
    previewBackground: "forest",
    previewScale: 1,
    appearance: { ...preset.appearance },
    effects: {
      ...preset.effects,
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
      maxCharacters: 14,
      shrinkLongNumbers: true,
      accessibilityLabel: "數字特效預覽"
    }
  };
}
