import { memo } from "react";
import { AetherStatusIndicator } from "@/components/ui/aether-management";
import { coinTerminology } from "@/lib/coin-engine-terminology";
import type { AetherNumberActiveTab, AetherNumberEditorState, AetherNumberEffectPreset } from "./aether-number-types";

const tabs: Array<{ key: AetherNumberActiveTab; label: string; systemLabel: string }> = [
  { key: "appearance", label: "外觀設定", systemLabel: "APPEARANCE" },
  { key: "effects", label: "特效設定", systemLabel: "EFFECTS" },
  { key: "layout", label: "排列設定", systemLabel: "LAYOUT" },
  { key: "advanced", label: "進階設定", systemLabel: "ADVANCED" }
];

const effectOptions: Array<{ key: AetherNumberEffectPreset; label: string; planned?: boolean }> = [
  { key: "none", label: "無效果" },
  { key: "impact", label: "撞擊彈出" },
  { key: "rise", label: "上升淡出" },
  { key: "elastic", label: "彈性放大", planned: true },
  { key: "stagger", label: "逐字出現", planned: true },
  { key: "critical-flash", label: "閃光爆擊", planned: true }
];

export const AetherNumberSettings = memo(function AetherNumberSettings({ state, onChange }: { state: AetherNumberEditorState; onChange: (next: AetherNumberEditorState) => void }) {
  return (
    <section className="aether-number-settings">
      <div className="aether-number-tabs" role="tablist" aria-label="數字特效設定">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={state.activeTab === tab.key}
            className={state.activeTab === tab.key ? "aether-number-tab-active" : ""}
            onClick={() => onChange({ ...state, activeTab: tab.key })}
          >
            <span>{tab.label}</span>
            <small>{tab.systemLabel}</small>
          </button>
        ))}
      </div>
      <div className="aether-number-settings-body">
        {state.activeTab === "appearance" && <AppearancePanel state={state} onChange={onChange} />}
        {state.activeTab === "effects" && <EffectsPanel state={state} onChange={onChange} />}
        {state.activeTab === "layout" && <LayoutPanel state={state} onChange={onChange} />}
        {state.activeTab === "advanced" && <AdvancedPanel state={state} onChange={onChange} />}
      </div>
    </section>
  );
});

function AppearancePanel({ state, onChange }: { state: AetherNumberEditorState; onChange: (next: AetherNumberEditorState) => void }) {
  const updateAppearance = (appearance: Partial<AetherNumberEditorState["appearance"]>) => onChange({ ...state, appearance: { ...state.appearance, ...appearance } });

  return (
    <div className="aether-number-control-grid">
      <ColorField label="主要顏色" value={state.appearance.primaryColor} onChange={(primaryColor) => updateAppearance({ primaryColor })} />
      <ColorField label="描邊顏色" value={state.appearance.outlineColor} onChange={(outlineColor) => updateAppearance({ outlineColor })} />
      <RangeField label="描邊粗細" min={0} max={8} value={state.appearance.outlineWidth} unit="px" onChange={(outlineWidth) => updateAppearance({ outlineWidth })} />
      <RangeField label="光暈強度" min={0} max={100} value={state.appearance.glowStrength} unit="%" onChange={(glowStrength) => updateAppearance({ glowStrength })} />
      <RangeField label="陰影強度" min={0} max={100} value={state.appearance.shadowStrength} unit="%" onChange={(shadowStrength) => updateAppearance({ shadowStrength })} />
      <RangeField label="透明度" min={30} max={100} value={state.appearance.opacity} unit="%" onChange={(opacity) => updateAppearance({ opacity })} />
      <RangeField label="字體大小" min={36} max={112} value={state.appearance.fontSize} unit="px" onChange={(fontSize) => updateAppearance({ fontSize })} />
      <RangeField label="字距" min={-4} max={8} value={state.appearance.letterSpacing} unit="px" onChange={(letterSpacing) => updateAppearance({ letterSpacing })} />
      <ToggleField label="漸層開關" checked={state.appearance.gradientEnabled} onChange={(gradientEnabled) => updateAppearance({ gradientEnabled })} />
    </div>
  );
}

function EffectsPanel({ state, onChange }: { state: AetherNumberEditorState; onChange: (next: AetherNumberEditorState) => void }) {
  const updateEffects = (effects: Partial<AetherNumberEditorState["effects"]>) => onChange({ ...state, effects: { ...state.effects, ...effects }, replayKey: state.replayKey + 1 });

  return (
    <div className="aether-number-control-grid">
      <div className="aether-number-effect-options">
        {effectOptions.map((effect) => (
          <button
            key={effect.key}
            type="button"
            className={state.effects.preset === effect.key ? "aether-number-option-active" : ""}
            onClick={() => !effect.planned && updateEffects({ preset: effect.key })}
            disabled={effect.planned}
          >
            <span>{effect.label}</span>
            {effect.planned && <AetherStatusIndicator label={coinTerminology.status.planned.label} tone="neutral" />}
          </button>
        ))}
      </div>
      <RangeField label="動畫速度" min={0.5} max={2} step={0.1} value={state.playbackSpeed} unit="x" onChange={(playbackSpeed) => onChange({ ...state, playbackSpeed, replayKey: state.replayKey + 1 })} />
      <RangeField label="持續時間" min={200} max={1800} step={50} value={state.effects.durationMs} unit="ms" onChange={(durationMs) => updateEffects({ durationMs })} />
      <RangeField label="字元延遲" min={0} max={120} step={5} value={state.effects.glyphDelayMs} unit="ms" onChange={(glyphDelayMs) => updateEffects({ glyphDelayMs })} />
      <RangeField label="動畫強度" min={0} max={100} value={state.effects.intensity} unit="%" onChange={(intensity) => updateEffects({ intensity })} />
      <label className="aether-number-field">
        播放方向
        <select value={state.effects.direction} onChange={(event) => updateEffects({ direction: event.target.value as "up" | "down" })}>
          <option value="up">向上</option>
          <option value="down">向下</option>
        </select>
      </label>
    </div>
  );
}

function LayoutPanel({ state, onChange }: { state: AetherNumberEditorState; onChange: (next: AetherNumberEditorState) => void }) {
  const updateFormatting = (formatting: Partial<AetherNumberEditorState["formatting"]>) => onChange({ ...state, formatting: { ...state.formatting, ...formatting } });

  return (
    <div className="aether-number-control-grid">
      <ToggleField label="千分位" checked={state.formatting.useThousandsSeparator} onChange={(useThousandsSeparator) => updateFormatting({ useThousandsSeparator })} />
      <ToggleField label="顯示正號" checked={state.formatting.showPlusSign} onChange={(showPlusSign) => updateFormatting({ showPlusSign })} />
      <RangeField label="小數位" min={0} max={4} value={state.formatting.decimals} onChange={(decimals) => updateFormatting({ decimals })} />
      <label className="aether-number-field">前綴<input value={state.formatting.prefix} onChange={(event) => updateFormatting({ prefix: event.target.value })} /></label>
      <label className="aether-number-field">後綴<input value={state.formatting.suffix} onChange={(event) => updateFormatting({ suffix: event.target.value })} /></label>
      <label className="aether-number-field">
        顯示模式
        <select value={state.formatting.playbackMode} onChange={(event) => updateFormatting({ playbackMode: event.target.value as "full" | "glyph" })}>
          <option value="full">完整顯示</option>
          <option value="glyph">逐字播放</option>
        </select>
      </label>
      <div className="aether-number-planned-note">波浪排列與上下錯落：{coinTerminology.status.planned.label}</div>
    </div>
  );
}

function AdvancedPanel({ state, onChange }: { state: AetherNumberEditorState; onChange: (next: AetherNumberEditorState) => void }) {
  const updateFormatting = (formatting: Partial<AetherNumberEditorState["formatting"]>) => onChange({ ...state, formatting: { ...state.formatting, ...formatting } });

  return (
    <div className="aether-number-control-grid">
      <ReadonlyField label="Renderer" value="Web Font" />
      <ReadonlyField label="SVG Sprite" value={coinTerminology.status.planned.label} />
      <ReadonlyField label="Image Sprite" value={coinTerminology.status.planned.label} />
      <label className="aether-number-field">
        Display Mode
        <select value={state.formatting.displayMode} onChange={(event) => updateFormatting({ displayMode: event.target.value as AetherNumberEditorState["formatting"]["displayMode"] })}>
          <option value="hero">Hero</option>
          <option value="finance">Finance</option>
          <option value="burst">Burst</option>
          <option value="compact">Compact</option>
        </select>
      </label>
      <ToggleField label="Reduced Motion" checked={state.effects.reducedMotion} onChange={(reducedMotion) => onChange({ ...state, effects: { ...state.effects, reducedMotion } })} />
      <RangeField label="最大字元數" min={6} max={24} value={state.formatting.maxCharacters} onChange={(maxCharacters) => updateFormatting({ maxCharacters })} />
      <ToggleField label="長數字縮放" checked={state.formatting.shrinkLongNumbers} onChange={(shrinkLongNumbers) => updateFormatting({ shrinkLongNumbers })} />
      <label className="aether-number-field">Accessibility label<input value={state.formatting.accessibilityLabel} onChange={(event) => updateFormatting({ accessibilityLabel: event.target.value })} /></label>
      <button type="button" className="aether-number-planned-button" disabled>匯出設定 · {coinTerminology.status.planned.label}</button>
      <button type="button" className="aether-number-planned-button" disabled>匯入設定 · {coinTerminology.status.planned.label}</button>
    </div>
  );
}

function RangeField({ label, min, max, step = 1, value, unit = "", onChange }: { label: string; min: number; max: number; step?: number; value: number; unit?: string; onChange: (value: number) => void }) {
  return (
    <label className="aether-number-field">
      <span>{label}<strong>{value}{unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="aether-number-field">
      <span>{label}<strong>{value}</strong></span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="aether-number-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="aether-number-readonly-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
