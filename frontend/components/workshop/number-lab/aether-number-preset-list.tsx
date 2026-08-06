import { memo } from "react";
import { AetherStatusIndicator } from "@/components/ui/aether-management";
import { coinTerminology } from "@/lib/coin-engine-terminology";
import type { AetherNumberPreset, AetherNumberPresetStatus } from "./aether-number-types";

const { status } = coinTerminology;

export const AetherNumberPresetList = memo(function AetherNumberPresetList({
  presets,
  selectedPresetId,
  onSelect
}: {
  presets: AetherNumberPreset[];
  selectedPresetId: string;
  onSelect: (preset: AetherNumberPreset) => void;
}) {
  return (
    <aside className="aether-number-library" aria-label="數字樣式庫">
      <div className="aether-number-library-header">
        <div>
          <span>數字樣式庫</span>
          <strong>AETHER NUMBER LAB</strong>
        </div>
        <small>{presets.length} 種樣式</small>
      </div>
      <div className="aether-number-library-filter" aria-label="樣式篩選">
        <button type="button" className="aether-number-filter-active">全部</button>
        <button type="button">我的最愛</button>
        <button type="button">官方預設</button>
      </div>
      <div className="aether-number-preset-list">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`aether-number-preset-card ${selectedPresetId === preset.id ? "aether-number-preset-card-active" : ""}`}
            onClick={() => onSelect(preset)}
          >
            <span className={`aether-number-thumbnail aether-number-thumbnail-${preset.thumbnailVariant}`}>{preset.previewValue}</span>
            <span className="aether-number-preset-copy">
              <strong>{preset.name}</strong>
              <small>{preset.systemLabel}</small>
              <small>{preset.description}</small>
            </span>
            <span className="aether-number-preset-meta">
              <AetherStatusIndicator label={statusLabel(preset.status)} tone={statusTone(preset.status)} />
              <span aria-label={preset.isFavorite ? "已收藏" : "未收藏"}>{preset.isFavorite ? "★" : "☆"}</span>
              <span aria-hidden="true">⧉</span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="aether-number-create-button" disabled>
        <span>＋</span>
        <strong>建立新樣式</strong>
        <small>另存目前設定會在下一階段加入</small>
      </button>
    </aside>
  );
});

function statusLabel(presetStatus: AetherNumberPresetStatus) {
  if (presetStatus === "stable") return status.stable.label;
  if (presetStatus === "experimental") return status.experimental.label;
  return status.workshopOnly.label;
}

function statusTone(presetStatus: AetherNumberPresetStatus) {
  if (presetStatus === "stable") return "success";
  if (presetStatus === "experimental") return "warning";
  return "credit";
}
