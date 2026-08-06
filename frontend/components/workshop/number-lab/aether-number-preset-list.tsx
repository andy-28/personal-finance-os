import { memo } from "react";
import { AetherStatusIndicator } from "@/components/ui/aether-management";
import { coinTerminology } from "@/lib/coin-engine-terminology";
import { getAetherTypography } from "./aether-number-typography";
import type { AetherNumberAsset, AetherNumberAssetStatus } from "./aether-number-types";

const { status } = coinTerminology;

export const AetherNumberPresetList = memo(function AetherNumberPresetList({
  presets,
  selectedPresetId,
  onSelect
}: {
  presets: AetherNumberAsset[];
  selectedPresetId: string;
  onSelect: (preset: AetherNumberAsset) => void;
}) {
  return (
    <aside className="aether-number-library" aria-label="Number Asset Browser">
      <div className="aether-number-library-header">
        <div>
          <span>Number Asset Browser</span>
          <strong>數字資產庫</strong>
        </div>
        <small>{presets.length} 個資產</small>
      </div>
      <div className="aether-number-library-filter" aria-label="樣式篩選">
        <button type="button" className="aether-number-filter-active">Official</button>
        <button type="button">My Library</button>
        <button type="button">Favorites</button>
        <button type="button">Recent</button>
        <button type="button" disabled>Community · {status.planned.label}</button>
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
              <small>{preset.systemLabel} · v{preset.version}</small>
              <small>Typography：{getAetherTypography(preset.typographyId).displayName}</small>
              <small>{preset.description}</small>
              <span className="aether-number-tag-row">
                {preset.tags.slice(0, 3).map((tag) => <em key={tag}>{tag}</em>)}
              </span>
            </span>
            <span className="aether-number-preset-meta">
              <AetherStatusIndicator label={statusLabel(preset.status)} tone={statusTone(preset.status)} />
              <span aria-label={preset.isFavorite ? "已收藏" : "未收藏"}>{preset.isFavorite ? "★" : "☆"}</span>
              <span aria-label="複製資產">⧉</span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="aether-number-create-button" disabled>
        <span>＋</span>
        <strong>建立 Number Asset</strong>
        <small>另存目前設定會在下一階段加入</small>
      </button>
    </aside>
  );
});

function statusLabel(presetStatus: AetherNumberAssetStatus) {
  if (presetStatus === "stable") return status.stable.label;
  if (presetStatus === "experimental") return status.experimental.label;
  return status.workshopOnly.label;
}

function statusTone(presetStatus: AetherNumberAssetStatus) {
  if (presetStatus === "stable") return "success";
  if (presetStatus === "experimental") return "warning";
  return "credit";
}
