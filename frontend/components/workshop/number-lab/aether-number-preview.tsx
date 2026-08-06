import { memo, type CSSProperties } from "react";
import { getAetherTypography } from "./aether-number-typography";
import type { AetherNumberEditorState } from "./aether-number-types";

const sampleValues = [
  { key: "income", label: "一般收入", value: "+12,345" },
  { key: "expense", label: "一般支出", value: "-12,345" },
  { key: "credit-card", label: "信用卡", value: "NT$20,554" },
  { key: "percentage", label: "百分比", value: "75%" },
  { key: "large-number", label: "大型數字", value: "123,456,789" }
] as const;

export const previewSampleValues = sampleValues;

export const AetherNumberPreview = memo(function AetherNumberPreview({
  state,
  onChange,
  onReplay,
  onReset
}: {
  state: AetherNumberEditorState;
  onChange: (next: AetherNumberEditorState) => void;
  onReplay: () => void;
  onReset: () => void;
}) {
  const formattedValue = formatPreviewValue(state);
  const typography = getAetherTypography(state.appearance.typographyId);
  const modeClass = state.formatting.displayMode === "compact" ? "aether-number-preview-compact" : "";
  const effectClass = state.effects.reducedMotion ? "" : `aether-number-effect-${state.effects.preset}`;
  const previewStyle = {
    "--number-font-family": typography.fontFamily,
    "--number-font-weight": state.appearance.fontWeight,
    "--number-primary": state.appearance.primaryColor,
    "--number-outline": state.appearance.outlineColor,
    "--number-outline-width": `${state.appearance.outlineWidth}px`,
    "--number-glow": `${state.appearance.glowStrength / 10}px`,
    "--number-shadow": `${state.appearance.shadowStrength / 10}px`,
    "--number-opacity": state.appearance.opacity / 100,
    "--number-font-size": `${state.appearance.fontSize}px`,
    "--number-letter-spacing": `${state.appearance.letterSpacing + state.appearance.numberSpacing}px`,
    "--number-digit-width": `${state.appearance.digitWidth}%`,
    "--number-text-transform": state.appearance.textTransform,
    "--number-duration": `${Math.round(state.effects.durationMs / state.playbackSpeed)}ms`,
    "--number-intensity": `${state.effects.intensity / 100}`,
    "--number-scale": state.previewScale
  } as CSSProperties;

  return (
    <section className={`aether-number-preview aether-number-preview-${state.previewBackground}`} style={previewStyle}>
      <div className="aether-number-preview-toolbar">
        <div>
          <span>即時預覽</span>
          <strong>LIVE PREVIEW · {typography.displayName}</strong>
        </div>
        <div className="aether-number-preview-actions">
          <label>
            播放速度
            <select value={state.playbackSpeed} onChange={(event) => onChange({ ...state, playbackSpeed: Number(event.target.value) })}>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </label>
          <button type="button" onClick={onReplay}>播放特效</button>
          <button type="button" onClick={onReset}>重設預覽</button>
        </div>
      </div>

      <div className="aether-number-preview-stage" aria-label={state.formatting.accessibilityLabel || "數字特效預覽"}>
        <span key={state.replayKey} className={`aether-number-preview-value ${modeClass} ${effectClass} ${state.appearance.gradientEnabled ? "aether-number-preview-gradient" : ""}`}>
          {formattedValue}
        </span>
      </div>

      <div className="aether-number-sample-bar" aria-label="Preview Scene">
        {sampleValues.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className={state.previewScene === sample.key ? "aether-number-scene-active" : ""}
            onClick={() => onChange({ ...state, previewScene: sample.key, previewValue: sample.value, replayKey: state.replayKey + 1 })}
          >
            <span>{sample.label}</span>
            <strong>{sample.value}</strong>
          </button>
        ))}
      </div>

      <div className="aether-number-preview-form">
        <label>
          輸入數字
          <input value={state.previewValue} onChange={(event) => onChange({ ...state, previewValue: event.target.value })} />
        </label>
        <label>
          預覽背景
          <select value={state.previewBackground} onChange={(event) => onChange({ ...state, previewBackground: event.target.value as AetherNumberEditorState["previewBackground"] })}>
            <option value="forest">冒險場景</option>
            <option value="terminal">終端面板</option>
            <option value="transparent">透明背景</option>
          </select>
        </label>
        <label>
          顯示倍率
          <input type="range" min="0.7" max="1.35" step="0.05" value={state.previewScale} onChange={(event) => onChange({ ...state, previewScale: Number(event.target.value) })} />
        </label>
      </div>
    </section>
  );
});

function formatPreviewValue(state: AetherNumberEditorState) {
  const rawValue = state.previewValue.trim();
  const numericValue = Number(rawValue.replace(/[^\d.-]/g, ""));
  const shouldFormatNumber = Number.isFinite(numericValue) && /^[-+]?[\d,]+(\.\d+)?$/.test(rawValue);
  const baseValue = shouldFormatNumber
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: state.formatting.decimals,
        minimumFractionDigits: state.formatting.decimals,
        useGrouping: state.formatting.useThousandsSeparator
      }).format(numericValue)
    : rawValue;
  const signedValue = state.formatting.showPlusSign && shouldFormatNumber && numericValue > 0 && !baseValue.startsWith("+") ? `+${baseValue}` : baseValue;
  return `${state.formatting.prefix}${signedValue}${state.formatting.suffix}`;
}
