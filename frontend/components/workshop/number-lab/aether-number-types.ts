export type AetherNumberAssetStatus = "stable" | "experimental" | "workshop-only";

export type AetherNumberEffectPreset = "none" | "impact" | "rise" | "fade" | "bounce" | "critical";

export type AetherNumberActiveTab = "animation" | "appearance" | "layout" | "advanced";

export type AetherNumberDisplayMode = "hero" | "finance" | "burst" | "compact";

export type AetherNumberPreviewBackground = "forest" | "terminal" | "transparent";

export type AetherNumberRenderer = "web-font" | "svg-font" | "sprite-atlas" | "bitmap-font" | "image-sprite";

export type AetherNumberTypographyId = "default" | "bungee" | "bungee-inline" | "fredoka";

export type AetherNumberPreviewScene = "income" | "expense" | "credit-card" | "large-number" | "percentage";

export type AetherNumberAsset = {
  id: string;
  name: string;
  systemLabel: string;
  status: AetherNumberAssetStatus;
  description: string;
  previewValue: string;
  typographyId: AetherNumberTypographyId;
  renderer: AetherNumberRenderer;
  version: string;
  tags: string[];
  thumbnailVariant: "pink" | "gold" | "ice" | "shadow" | "nature" | "silver" | "danger" | "classic";
  isFavorite?: boolean;
  appearance: AetherNumberEditorState["appearance"];
  effects: Pick<AetherNumberEditorState["effects"], "preset" | "durationMs" | "glyphDelayMs" | "intensity">;
};

export type AetherNumberPreset = AetherNumberAsset;
export type AetherNumberPresetStatus = AetherNumberAssetStatus;

export type AetherNumberEditorState = {
  selectedPresetId: string;
  previewValue: string;
  previewScene: AetherNumberPreviewScene;
  activeTab: AetherNumberActiveTab;
  replayKey: number;
  playbackSpeed: number;
  previewBackground: AetherNumberPreviewBackground;
  previewScale: number;
  appearance: {
    primaryColor: string;
    outlineColor: string;
    outlineWidth: number;
    glowStrength: number;
    shadowStrength: number;
    opacity: number;
    fontSize: number;
    letterSpacing: number;
    typographyId: AetherNumberTypographyId;
    fontWeight: number;
    numberSpacing: number;
    digitWidth: number;
    textTransform: "none" | "uppercase";
    gradientEnabled: boolean;
  };
  effects: {
    preset: AetherNumberEffectPreset;
    durationMs: number;
    glyphDelayMs: number;
    intensity: number;
    direction: "up" | "down";
    reducedMotion: boolean;
  };
  formatting: {
    showPlusSign: boolean;
    useThousandsSeparator: boolean;
    decimals: number;
    prefix: string;
    suffix: string;
    displayMode: AetherNumberDisplayMode;
    playbackMode: "full" | "glyph";
    renderer: AetherNumberRenderer;
    maxCharacters: number;
    shrinkLongNumbers: boolean;
    accessibilityLabel: string;
  };
};
