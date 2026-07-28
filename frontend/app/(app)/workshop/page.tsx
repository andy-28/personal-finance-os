"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
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
import { defaultAetherWorkshopSettings, type AetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { useSettings, type SettingsSyncStatus } from "@/lib/settings/user-settings";

type WorkshopFilter = "All" | "Branding" | "Effects" | "Materials";

const slotSections = [
  { title: "品牌識別", slots: [visualSlots.favicon] },
  { title: "視覺特效", slots: [visualSlots.headerDivider] }
];

export default function WorkshopPage() {
  const defaultAsset = getDefaultVisualAsset();
  const { settings, status, error, updateWorkshopSettings, retry } = useSettings();
  const [filter, setFilter] = useState<WorkshopFilter>("All");
  const [selectedSlotKey, setSelectedSlotKey] = useState<VisualSlotKey>(visualSlots.favicon.key);
  const [failedPreviewIds, setFailedPreviewIds] = useState<string[]>([]);

  const appliedSettings = settings.workshopSettings;
  const selectedAsset = useMemo(() => getBuiltInVisualAsset(appliedSettings.faviconAssetId) ?? defaultAsset, [appliedSettings.faviconAssetId, defaultAsset]);
  const availableAssets = builtInVisualAssets.filter((asset) => asset.slotKeys.includes(visualSlots.favicon.key));
  const isDefault = appliedSettings.faviconAssetId === defaultAsset.id && appliedSettings.headerDividerEnabled === visualSlots.headerDivider.defaultEnabled;

  const onImageError = (assetId: string) => {
    setFailedPreviewIds((current) => current.includes(assetId) ? current : [...current, assetId]);
  };

  return (
    <section className="grid gap-6">
      <PageHeader
        title="介面工坊"
        description="管理 PersonalFinanceOS 的品牌圖示、視覺特效與 Aether 介面偏好。"
        actions={<Button type="button" variant="outline" onClick={() => updateWorkshopSettings(defaultAetherWorkshopSettings)} disabled={isDefault}>重設工坊</Button>}
      />
      <GameWindow title="Visual Configuration" description="Aether Workshop">
        <div className="aether-management-window" aria-live="polite">
          <AetherPanelHeader
            eyebrow="THEME EDITOR"
            title="Aether 介面工坊"
            subtitle="Favicon、頁首能量分隔線與未來主題素材統一由 User Settings 同步。"
            status={<AetherStatusIndicator label={settingsStatusLabel(status)} tone={settingsStatusTone(status)} />}
            summary="Server Settings"
          />
          <AetherToolbar role="tablist" ariaLabel="介面工坊篩選">
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
              <span>同步狀態</span>
              <AetherStatusIndicator label={settingsStatusLabel(status)} tone={settingsStatusTone(status)} />
            </div>
          </AetherToolbar>

          <div className="aether-master-detail">
            <div className="aether-list-pane" aria-label="視覺槽位" role="listbox">
              <AetherSectionHeader title="視覺槽位" meta="2 slots" />
              {slotSections.filter((section) => filter === "All" || sectionFilter(section.title) === filter).map((section) => (
                <div key={section.title} className="grid gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{section.title}</p>
                  {section.slots.map((slot) => (
                    <AetherListRow
                      key={slot.key}
                      title={slot.label}
                      subtitle={`${slot.key} / ${slotSubtitle(slot.key, appliedSettings, selectedAsset.name)}`}
                      meta={<AetherStatusIndicator label={slotStatusLabel(slot.key, appliedSettings)} tone={slotStatusTone(slot.key, appliedSettings)} />}
                      isActive={selectedSlotKey === slot.key}
                      onClick={() => setSelectedSlotKey(slot.key)}
                    />
                  ))}
                </div>
              ))}
              <div className="rounded-ui border border-border/60 bg-background/30 p-3 text-sm text-muted">
                本頁設定已改由後端 User Settings 保存。未來部署上雲後，登入同一帳號即可同步工坊偏好。
              </div>
            </div>

            <div className="aether-detail-pane">
              <div className="aether-detail-scroll">
                {selectedSlotKey === visualSlots.favicon.key ? (
                  <FaviconSlotDetail
                    selectedAsset={selectedAsset}
                    availableAssets={availableAssets}
                    failedPreviewIds={failedPreviewIds}
                    onImageError={onImageError}
                    onSelectAsset={(assetId) => updateWorkshopSettings({ faviconAssetId: assetId })}
                  />
                ) : (
                  <HeaderDividerSlotDetail
                    enabled={appliedSettings.headerDividerEnabled}
                    onToggle={(enabled) => updateWorkshopSettings({ headerDividerEnabled: enabled })}
                  />
                )}

                <p className={`text-sm ${status === "error" ? "text-warning" : "text-muted"}`}>
                  {settingsStatusMessage(status, error)}
                </p>

                <AetherActionBar>
                  {status === "error" && <Button type="button" variant="outline" onClick={retry}>重試同步</Button>}
                  <Button type="button" variant="outline" onClick={() => updateWorkshopSettings(defaultAetherWorkshopSettings)} disabled={isDefault}>重設所選</Button>
                </AetherActionBar>
              </div>
            </div>
          </div>
        </div>
      </GameWindow>
    </section>
  );
}

function FaviconSlotDetail({ selectedAsset, availableAssets, failedPreviewIds, onImageError, onSelectAsset }: { selectedAsset: ReturnType<typeof getDefaultVisualAsset>; availableAssets: typeof builtInVisualAssets; failedPreviewIds: string[]; onImageError: (assetId: string) => void; onSelectAsset: (assetId: string) => void }) {
  return (
    <>
      <AetherSectionHeader title="槽位設定" meta={visualSlots.favicon.key} />
      <div className="flex flex-wrap items-center gap-3 rounded-ui border border-border/60 bg-background/35 p-3">
        <PreviewIcon assetId={selectedAsset.id} src={selectedAsset.src} name={selectedAsset.name} failedPreviewIds={failedPreviewIds} onError={onImageError} size="large" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">{visualSlots.favicon.label}</h2>
          <p className="mt-1 text-sm text-muted">控制瀏覽器分頁與應用程式圖示。</p>
        </div>
        <AetherStatusIndicator label="已同步" tone="success" />
      </div>

      <AetherDefinitionList>
        <AetherDefinitionRow label="Slot Key" value={visualSlots.favicon.key} />
        <AetherDefinitionRow label="儲存方式" value="Server User Settings" />
        <AetherDefinitionRow label="目前素材" value={selectedAsset.name} />
        <AetherDefinitionRow label="素材路徑" value={<span className="break-all">{selectedAsset.src}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="可用素材" meta={`${availableAssets.length} assets`} />
        <div className="grid gap-2 sm:grid-cols-2">
          {availableAssets.map((asset) => {
            const isSelected = selectedAsset.id === asset.id;
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
                {isSelected && <AetherStatusIndicator label="目前" tone="success" />}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function HeaderDividerSlotDetail({ enabled, onToggle }: { enabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <>
      <AetherSectionHeader title="槽位設定" meta={visualSlots.headerDivider.key} />
      <div className="grid gap-3 rounded-ui border border-border/60 bg-background/35 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">頁首能量分隔線</h2>
            <p className="mt-1 text-sm text-muted">控制信用卡頁標題區下方的紫色 WebP 光效。</p>
          </div>
          <AetherStatusIndicator label={enabled ? "啟用" : "停用"} tone={enabled ? "success" : "neutral"} />
        </div>
        <label className="aether-toggle-row">
          <span>
            <strong>顯示頁首 WebP 光效</strong>
            <small>{enabled ? "目前會顯示在支援的頁面。" : "目前已隱藏。"}</small>
          </span>
          <button type="button" role="switch" aria-checked={enabled} className={`aether-switch ${enabled ? "aether-switch-on" : ""}`} onClick={() => onToggle(!enabled)}>
            <span />
          </button>
        </label>
      </div>

      <AetherDefinitionList>
        <AetherDefinitionRow label="Slot Key" value={visualSlots.headerDivider.key} />
        <AetherDefinitionRow label="類型" value="Animated WebP" />
        <AetherDefinitionRow label="儲存方式" value="Server User Settings" />
        <AetherDefinitionRow label="預設值" value={visualSlots.headerDivider.defaultEnabled ? "啟用" : "停用"} />
        <AetherDefinitionRow label="素材路徑" value={<span className="break-all">{visualSlots.headerDivider.assetPath}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="效果預覽" meta={enabled ? "Preview enabled" : "Preview disabled"} />
        <div className="aether-divider-preview">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Visual Slot</p>
          <h3 className="text-2xl font-bold text-foreground">Aether Divider</h3>
          <p className="text-sm text-muted">此效果只作為裝飾，不影響頁面資料與操作。</p>
          {enabled ? <AetherEnergyDivider className="-mb-2 -mt-2" intensity="normal" /> : <div className="rounded-ui border border-dashed border-border/70 p-4 text-center text-sm text-muted">光效已停用。</div>}
        </div>
      </section>
    </>
  );
}

function PreviewIcon({ assetId, src, name, failedPreviewIds, onError, size = "normal" }: { assetId: string; src: string; name: string; failedPreviewIds: string[]; onError: (assetId: string) => void; size?: "normal" | "large" }) {
  const hasFailedPreview = failedPreviewIds.includes(assetId);
  const sizeClass = size === "large" ? "h-16 w-16" : "h-11 w-11";

  return (
    <span className={`grid shrink-0 place-items-center rounded-ui border border-border/75 bg-background/80 ${sizeClass}`}>
      {hasFailedPreview ? <span className="text-xs font-bold text-muted">ICON</span> : <img className="h-8 w-8 object-contain" src={src} alt={`${name} preview`} onError={() => onError(assetId)} />}
    </span>
  );
}

function slotSubtitle(slotKey: VisualSlotKey, settings: AetherWorkshopSettings, savedAssetName: string) {
  if (slotKey === visualSlots.favicon.key) return `目前：${savedAssetName}`;
  return settings.headerDividerEnabled ? "頁首光效啟用" : "頁首光效停用";
}

function slotStatusLabel(slotKey: VisualSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "同步";
  return settings.headerDividerEnabled ? "啟用" : "停用";
}

function slotStatusTone(slotKey: VisualSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "credit";
  return settings.headerDividerEnabled ? "success" : "neutral";
}

function sectionFilter(sectionTitle: string): WorkshopFilter {
  if (sectionTitle === "品牌識別") return "Branding";
  if (sectionTitle === "視覺特效") return "Effects";
  return "Materials";
}

function workshopFilterLabel(filter: WorkshopFilter) {
  const labels: Record<WorkshopFilter, string> = {
    All: "全部",
    Branding: "品牌",
    Effects: "特效",
    Materials: "材質"
  };
  return labels[filter];
}

function settingsStatusLabel(status: SettingsSyncStatus) {
  if (status === "loading") return "讀取中";
  if (status === "saving") return "同步中";
  if (status === "saved") return "已同步";
  if (status === "error") return "同步失敗";
  return "待命";
}

function settingsStatusTone(status: SettingsSyncStatus) {
  if (status === "error") return "danger";
  if (status === "saving" || status === "loading") return "warning";
  if (status === "saved") return "success";
  return "neutral";
}

function settingsStatusMessage(status: SettingsSyncStatus, error: string) {
  if (status === "loading") return "正在讀取伺服器設定...";
  if (status === "saving") return "正在同步 User Settings...";
  if (status === "saved") return "設定已同步到伺服器，重新登入後仍會保留。";
  if (status === "error") return error || "同步失敗，畫面已保留目前設定。";
  return "修改設定後會自動同步，不需要手動儲存。";
}
