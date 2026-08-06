export type AetherNumberPresetStatus = "stable" | "experimental" | "workshop-only";

export type AetherNumberEffectPreset = "none" | "impact" | "rise" | "elastic" | "stagger" | "critical-flash";

export type AetherNumberActiveTab = "appearance" | "effects" | "layout" | "advanced";

export type AetherNumberDisplayMode = "hero" | "finance" | "burst" | "compact";

export type AetherNumberPreviewBackground = "forest" | "terminal" | "transparent";

export type AetherNumberPreset = {
  id: string;
  name: string;
  systemLabel: string;
  status: AetherNumberPresetStatus;
  description: string;
  previewValue: string;
  thumbnailVariant: "pink" | "gold" | "ice" | "shadow" | "nature" | "silver" | "danger" | "classic";
  isFavorite?: boolean;
  appearance: AetherNumberEditorState["appearance"];
  effects: Pick<AetherNumberEditorState["effects"], "preset" | "durationMs" | "glyphDelayMs" | "intensity">;
};

export type AetherNumberEditorState = {
  selectedPresetId: string;
  previewValue: string;
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
    maxCharacters: number;
    shrinkLongNumbers: boolean;
    accessibilityLabel: string;
  };
};
