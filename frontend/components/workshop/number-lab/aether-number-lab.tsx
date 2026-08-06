"use client";

import { useState } from "react";
import { AetherSectionHeader, AetherStatusIndicator } from "@/components/ui/aether-management";
import { coinTerminology } from "@/lib/coin-engine-terminology";
import { AetherNumberPresetList } from "./aether-number-preset-list";
import { aetherNumberAssets, createAetherNumberEditorState } from "./aether-number-presets";
import { AetherNumberPreview } from "./aether-number-preview";
import { AetherNumberSettings } from "./aether-number-settings";
import type { AetherNumberAsset, AetherNumberEditorState } from "./aether-number-types";

export function AetherNumberLab() {
  const [editorState, setEditorState] = useState<AetherNumberEditorState>(() => createAetherNumberEditorState());
  const selectedAsset = aetherNumberAssets.find((asset) => asset.id === editorState.selectedPresetId) ?? aetherNumberAssets[0];

  const selectPreset = (asset: AetherNumberAsset) => {
    setEditorState({
      ...createAetherNumberEditorState(asset),
      activeTab: editorState.activeTab,
      replayKey: editorState.replayKey + 1
    });
  };

  const replayPreview = () => setEditorState((current) => ({ ...current, replayKey: current.replayKey + 1 }));
  const resetPreview = () => setEditorState((current) => ({ ...createAetherNumberEditorState(selectedAsset), activeTab: current.activeTab, replayKey: current.replayKey + 1 }));

  return (
    <section className="aether-number-lab">
      <div className="aether-number-lab-heading">
        <AetherSectionHeader
          title="數字特效工坊"
          meta="AETHER NUMBER LAB"
          actions={<AetherStatusIndicator label={coinTerminology.workshop.prototype.notice} tone="credit" />}
        />
        <p>建立 Number Asset Editor：目前使用 Typography Registry 與 Web Font Renderer，不建立 Sprite、不接正式財務資料。</p>
      </div>
      <div className="aether-number-editor-shell">
        <AetherNumberPresetList presets={aetherNumberAssets} selectedPresetId={editorState.selectedPresetId} onSelect={selectPreset} />
        <div className="aether-number-editor-main">
          <AetherNumberPreview state={editorState} onChange={setEditorState} onReplay={replayPreview} onReset={resetPreview} />
          <AetherNumberSettings state={editorState} onChange={setEditorState} />
        </div>
      </div>
    </section>
  );
}
