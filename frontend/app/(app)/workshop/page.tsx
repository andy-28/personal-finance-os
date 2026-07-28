"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { AetherEnergyDivider } from "@/components/ui/aether-effect";
import { Button } from "@/components/ui/button";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import {
  AetherActionBar,
  AetherDefinitionList,
  AetherDefinitionRow,
  AetherListRow,
  AetherPanelHeader,
  AetherSectionHeader,
  AetherStatusIndicator,
  AetherToolbar
} from "@/components/ui/aether-management";
import { builtInVisualAssets, getBuiltInVisualAsset, getDefaultVisualAsset, visualSlots, type VisualSlotKey } from "@/lib/aether/visual-slots";
import { defaultAetherWorkshopSettings, loadAetherWorkshopSettings, resetAetherWorkshopSettings, saveAetherWorkshopSettings, type AetherWorkshopSettings } from "@/lib/aether/workshop-settings";

type WorkshopFilter = "All" | "Branding" | "Effects" | "Materials";

const slotSections = [
  {
    title: "系統品牌",
    slots: [visualSlots.favicon]
  },
  {
    title: "視窗特效",
    slots: [visualSlots.headerDivider]
  }
];

export default function WorkshopPage() {
  const defaultAsset = getDefaultVisualAsset();
  const [filter, setFilter] = useState<WorkshopFilter>("All");
  const [selectedSlotKey, setSelectedSlotKey] = useState<VisualSlotKey>(visualSlots.favicon.key);
  const [appliedSettings, setAppliedSettings] = useState<AetherWorkshopSettings>(defaultAetherWorkshopSettings);
  const [draftSettings, setDraftSettings] = useState<AetherWorkshopSettings>(defaultAetherWorkshopSettings);
  const [message, setMessage] = useState("");
  const [hasStorageError, setHasStorageError] = useState(false);
  const [failedPreviewIds, setFailedPreviewIds] = useState<string[]>([]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const settings = loadAetherWorkshopSettings();
      setAppliedSettings(settings);
      setDraftSettings(settings);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const selectedAsset = useMemo(() => getBuiltInVisualAsset(draftSettings.faviconAssetId) ?? defaultAsset, [draftSettings.faviconAssetId, defaultAsset]);
  const savedAsset = useMemo(() => getBuiltInVisualAsset(appliedSettings.faviconAssetId) ?? defaultAsset, [appliedSettings.faviconAssetId, defaultAsset]);
  const hasChanges = draftSettings.faviconAssetId !== appliedSettings.faviconAssetId || draftSettings.headerDividerEnabled !== appliedSettings.headerDividerEnabled;
  const availableAssets = builtInVisualAssets.filter((asset) => asset.slotKeys.includes(visualSlots.favicon.key));

  const onApply = () => {
    const result = saveAetherWorkshopSettings(draftSettings);
    setAppliedSettings(result.settings);
    setDraftSettings(result.settings);
    setHasStorageError(!result.ok);
    setMessage(result.ok ? "介面設定已套用到目前瀏覽器。" : "無法儲存本機設定，已先套用本次預覽。");
  };

  const onResetAll = () => {
    const result = resetAetherWorkshopSettings();
    setAppliedSettings(result.settings);
    setDraftSettings(result.settings);
    setHasStorageError(!result.ok);
    setMessage(result.ok ? "已恢復全部預設設定。" : "無法儲存本機設定，已先恢復本次預覽。");
  };

  const onResetSelected = () => {
    if (selectedSlotKey === visualSlots.favicon.key) {
      setDraftSettings((current) => ({ ...current, faviconAssetId: defaultAsset.id }));
      setMessage("Favicon 草稿已恢復預設，按套用後生效。");
      return;
    }

    setDraftSettings((current) => ({ ...current, headerDividerEnabled: visualSlots.headerDivider.defaultEnabled }));
    setMessage("頁面標題分隔特效草稿已恢復預設，按套用後生效。");
  };

  const onImageError = (assetId: string) => {
    setFailedPreviewIds((current) => current.includes(assetId) ? current : [...current, assetId]);
  };

  return (
    <section className="grid gap-6">
      <PageHeader
        title="介面工坊"
        description="管理 PersonalFinanceOS 的本機視覺設定。"
        actions={<Button type="button" variant="outline" onClick={onResetAll} disabled={!hasChanges && isDefaultSettings(appliedSettings, defaultAsset.id)}>恢復全部預設</Button>}
      />
      <GameWindow title="Visual Configuration" description="Aether Workshop">
        <div className="aether-management-window" aria-live="polite">
          <AetherPanelHeader
            eyebrow="THEME EDITOR"
            title="Aether 介面工坊"
            subtitle="Favicon、視覺插槽與本機特效設定"
            status={<AetherStatusIndicator label={hasChanges ? "待套用" : "已同步"} tone={hasChanges ? "warning" : "success"} />}
            summary={hasStorageError ? "localStorage unavailable" : "localStorage"}
          />
          <AetherToolbar role="tablist" ariaLabel="介面工坊分類">
            {(["All", "Branding", "Effects", "Materials"] as WorkshopFilter[]).map((nextFilter) => (
              <button
                key={nextFilter}
                type="button"
                role="tab"
                aria-selected={filter === nextFilter}
                className={`aether-filter-tab ${filter === nextFilter ? "aether-filter-tab-active" : ""}`}
                onClick={() => setFilter(nextFilter)}
                disabled={nextFilter === "Materials"}
              >
                {workshopFilterLabel(nextFilter)}
              </button>
            ))}
            <div className="aether-toolbar-check">
              <span>本機設定</span>
              <AetherStatusIndicator label={hasChanges ? "待套用" : "已同步"} tone={hasChanges ? "warning" : "success"} />
            </div>
          </AetherToolbar>

          <div className="aether-master-detail">
            <div className="aether-list-pane" aria-label="視覺插槽" role="listbox">
              <AetherSectionHeader title="視覺插槽" meta="2 slots" />
              {slotSections.filter((section) => filter === "All" || sectionFilter(section.title) === filter).map((section) => (
                <div key={section.title} className="grid gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{section.title}</p>
                  {section.slots.map((slot) => (
                    <AetherListRow
                      key={slot.key}
                      title={slot.label}
                      subtitle={`${slot.key} / ${slotSubtitle(slot.key, appliedSettings, savedAsset.name)}`}
                      meta={<AetherStatusIndicator label={slotStatusLabel(slot.key, appliedSettings)} tone={slotStatusTone(slot.key, appliedSettings)} />}
                      isActive={selectedSlotKey === slot.key}
                      onClick={() => setSelectedSlotKey(slot.key)}
                    />
                  ))}
                </div>
              ))}
              <div className="rounded-ui border border-border/60 bg-background/30 p-3 text-sm text-muted">
                目前只開放 Favicon 與頁面標題分隔特效。圖片上傳、材質調整與其他 WebP slot 尚未開放。
              </div>
            </div>

            <div className="aether-detail-pane">
              <div className="aether-detail-scroll">
                {selectedSlotKey === visualSlots.favicon.key ? (
                  <FaviconSlotDetail
                    selectedAsset={selectedAsset}
                    savedAsset={savedAsset}
                    availableAssets={availableAssets}
                    failedPreviewIds={failedPreviewIds}
                    onImageError={onImageError}
                    onSelectAsset={(assetId) => {
                      setDraftSettings((current) => ({ ...current, faviconAssetId: assetId }));
                      setMessage("");
                    }}
                  />
                ) : (
                  <HeaderDividerSlotDetail
                    enabled={draftSettings.headerDividerEnabled}
                    appliedEnabled={appliedSettings.headerDividerEnabled}
                    onToggle={(enabled) => {
                      setDraftSettings((current) => ({ ...current, headerDividerEnabled: enabled }));
                      setMessage("");
                    }}
                  />
                )}

                <p className={`text-sm ${hasStorageError ? "text-warning" : "text-muted"}`}>
                  {message || "此設定只儲存在目前瀏覽器。Windows、MacBook 與手機不會自動同步。"}
                </p>

                <AetherActionBar>
                  <Button type="button" variant="outline" onClick={onResetSelected}>恢復預設</Button>
                  <Button type="button" onClick={onApply} disabled={!hasChanges}>套用</Button>
                </AetherActionBar>
              </div>
            </div>
          </div>
        </div>
      </GameWindow>
    </section>
  );
}

function FaviconSlotDetail({ selectedAsset, savedAsset, availableAssets, failedPreviewIds, onImageError, onSelectAsset }: { selectedAsset: ReturnType<typeof getDefaultVisualAsset>; savedAsset: ReturnType<typeof getDefaultVisualAsset>; availableAssets: typeof builtInVisualAssets; failedPreviewIds: string[]; onImageError: (assetId: string) => void; onSelectAsset: (assetId: string) => void }) {
  return (
    <>
      <AetherSectionHeader title="插槽詳細設定" meta={visualSlots.favicon.key} />
      <div className="flex flex-wrap items-center gap-3 rounded-ui border border-border/60 bg-background/35 p-3">
        <PreviewIcon assetId={selectedAsset.id} src={selectedAsset.src} name={selectedAsset.name} failedPreviewIds={failedPreviewIds} onError={onImageError} size="large" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">{visualSlots.favicon.label}</h2>
          <p className="mt-1 text-sm text-muted">瀏覽器分頁與書籤顯示的 PersonalFinanceOS 圖示。</p>
        </div>
        <AetherStatusIndicator label={selectedAsset.id === savedAsset.id ? "啟用中" : "待套用"} tone={selectedAsset.id === savedAsset.id ? "success" : "warning"} />
      </div>

      <AetherDefinitionList>
        <AetherDefinitionRow label="Slot Key" value={visualSlots.favicon.key} />
        <AetherDefinitionRow label="儲存方式" value="localStorage" />
        <AetherDefinitionRow label="同步範圍" value="目前瀏覽器" />
        <AetherDefinitionRow label="目前素材" value={savedAsset.name} />
        <AetherDefinitionRow label="待套用素材" value={selectedAsset.name} />
        <AetherDefinitionRow label="素材路徑" value={<span className="break-all">{selectedAsset.src}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="可用素材" meta={`${availableAssets.length} assets`} />
        <div className="grid gap-2 sm:grid-cols-2">
          {availableAssets.map((asset) => {
            const isSelected = selectedAsset.id === asset.id;
            const isSaved = savedAsset.id === asset.id;

            return (
              <button
                key={asset.id}
                type="button"
                className={`aether-asset-option ${isSelected ? "aether-asset-option-active" : ""}`}
                aria-pressed={isSelected}
                onClick={() => onSelectAsset(asset.id)}
              >
                <PreviewIcon assetId={asset.id} src={asset.src} name={asset.name} failedPreviewIds={failedPreviewIds} onError={onImageError} />
                <span className="min-w-0 text-left">
                  <strong>{asset.name}</strong>
                  <small>{asset.format} / 內建素材</small>
                </span>
                {isSaved && <AetherStatusIndicator label="目前" tone="success" />}
                {isSelected && !isSaved && <AetherStatusIndicator label="待套用" tone="warning" />}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function HeaderDividerSlotDetail({ enabled, appliedEnabled, onToggle }: { enabled: boolean; appliedEnabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <>
      <AetherSectionHeader title="插槽詳細設定" meta={visualSlots.headerDivider.key} />
      <div className="grid gap-3 rounded-ui border border-border/60 bg-background/35 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{visualSlots.headerDivider.label}</h2>
            <p className="mt-1 text-sm text-muted">{visualSlots.headerDivider.description}</p>
          </div>
          <AetherStatusIndicator label={appliedEnabled ? "目前啟用" : "目前停用"} tone={appliedEnabled ? "success" : "neutral"} />
        </div>
        <label className="aether-toggle-row">
          <span>
            <strong>顯示頁面標題分隔特效</strong>
            <small>{enabled ? "草稿：開啟" : "草稿：關閉"}</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            className={`aether-switch ${enabled ? "aether-switch-on" : ""}`}
            onClick={() => onToggle(!enabled)}
          >
            <span />
          </button>
        </label>
      </div>

      <AetherDefinitionList>
        <AetherDefinitionRow label="Slot Key" value={visualSlots.headerDivider.key} />
        <AetherDefinitionRow label="類型" value="Animated WebP" />
        <AetherDefinitionRow label="儲存方式" value="localStorage" />
        <AetherDefinitionRow label="套用位置" value="信用卡頁標題區" />
        <AetherDefinitionRow label="預設值" value={visualSlots.headerDivider.defaultEnabled ? "啟用" : "停用"} />
        <AetherDefinitionRow label="素材路徑" value={<span className="break-all">{visualSlots.headerDivider.assetPath}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="即時預覽" meta={enabled ? "Preview enabled" : "Preview disabled"} />
        <div className="aether-divider-preview">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">系統視窗</p>
          <h3 className="text-2xl font-bold text-foreground">信用卡</h3>
          <p className="text-sm text-muted">信用卡額度、未繳金額、分期與帳單匯入狀態。</p>
          {enabled ? <AetherEnergyDivider className="-mb-2 -mt-2" intensity="normal" /> : <div className="rounded-ui border border-dashed border-border/70 p-4 text-center text-sm text-muted">分隔特效已在草稿中關閉。</div>}
        </div>
        <p className="text-xs text-muted">系統啟用「減少動態效果」時，動畫可能降低或隱藏，但不會改寫你的工坊設定。</p>
      </section>
    </>
  );
}

function PreviewIcon({ assetId, src, name, failedPreviewIds, onError, size = "normal" }: { assetId: string; src: string; name: string; failedPreviewIds: string[]; onError: (assetId: string) => void; size?: "normal" | "large" }) {
  const hasFailedPreview = failedPreviewIds.includes(assetId);
  const sizeClass = size === "large" ? "h-16 w-16" : "h-11 w-11";

  return (
    <span className={`grid shrink-0 place-items-center rounded-ui border border-border/75 bg-background/80 ${sizeClass}`}>
      {hasFailedPreview ? <span className="text-xs font-bold text-muted">ICON</span> : <img className="h-8 w-8 object-contain" src={src} alt={`${name} 預覽`} onError={() => onError(assetId)} />}
    </span>
  );
}

function slotSubtitle(slotKey: VisualSlotKey, settings: AetherWorkshopSettings, savedAssetName: string) {
  if (slotKey === visualSlots.favicon.key) return `目前：${savedAssetName}`;
  return "紫色能量分隔線";
}

function slotStatusLabel(slotKey: VisualSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "本機";
  return settings.headerDividerEnabled ? "已啟用" : "已停用";
}

function slotStatusTone(slotKey: VisualSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "credit";
  return settings.headerDividerEnabled ? "success" : "neutral";
}

function isDefaultSettings(settings: AetherWorkshopSettings, defaultAssetId: string) {
  return settings.faviconAssetId === defaultAssetId && settings.headerDividerEnabled === visualSlots.headerDivider.defaultEnabled;
}

function sectionFilter(sectionTitle: string): WorkshopFilter {
  if (sectionTitle === "系統品牌") return "Branding";
  if (sectionTitle === "視窗特效") return "Effects";
  return "Materials";
}

function workshopFilterLabel(filter: WorkshopFilter) {
  const labels: Record<WorkshopFilter, string> = {
    All: "全部",
    Branding: "系統品牌",
    Effects: "視窗特效",
    Materials: "元件材質"
  };
  return labels[filter];
}
