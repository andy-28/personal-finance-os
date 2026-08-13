"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { AetherEnergyDivider } from "@/components/ui/aether-effect";
import { Button } from "@/components/ui/button";
import { GameGauge, ResourceGuide, SoulInterface, type GameGaugeVariant } from "@/components/game-ui";
import { WorkshopCatalog, WorkshopComingSoon, WorkshopInspector, WorkshopPreviewStage, WorkshopPropertyGroup, WorkshopPropertyRow } from "@/components/workshop/workshop-shell";
import { AetherNumberLab } from "@/components/workshop/number-lab";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { AetherAsset } from "@/components/aether/aether-asset";
import {
  AetherActionBar,
  AetherDefinitionList,
  AetherDefinitionRow,
  AetherPanelHeader,
  AetherSectionHeader,
  AetherStatusIndicator,
  AetherToolbar
} from "@/components/ui/aether-management";
import { getP0AetherResourceAssets, type AetherAssetDefinition } from "@/lib/aether/asset-registry";
import {
  dashboardProfileImageOptions,
  defaultDashboardProfileImageSettings,
  resolveDashboardProfileImage,
  type DashboardProfileImageSettings
} from "@/lib/aether/dashboard-profile-settings";
import { getAetherAssetRegistry } from "@/lib/aether/assets";
import { personalReferenceAssetPacks, personalReferenceAssetRules, personalReferenceMappings } from "@/lib/aether/personal-reference-assets";
import { builtInVisualAssets, getBuiltInVisualAsset, getDefaultVisualAsset, visualSlots, type VisualSlotKey } from "@/lib/aether/visual-slots";
import { defaultAetherWorkshopSettings, type AetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { clearDesktopAppearanceStorage, clearDesktopLabStorage, defaultDesktopLayout, readDesktopLayout, readDesktopPreferences, writeDesktopPreference, writeDesktopPreferences } from "@/lib/desktop-lab/storage";
import { defaultDesktopLabPreferences, desktopDockStylePresets, desktopHudStylePresets, desktopWallpaperPresets, desktopWindowSkinPresets, type DesktopDockStyle, type DesktopHudStyle, type DesktopLabPreferences, type DesktopWallpaperPreset, type DesktopWindowSkin } from "@/lib/desktop-lab/presets";
import { useSettings, type SettingsSyncStatus } from "@/lib/settings/user-settings";
import { coinTerminology } from "@/lib/coin-engine-terminology";

type WorkshopAreaKey = "Appearance" | "Assets" | "UiLab" | "NumberLab" | "LayoutLab" | "DesktopLab";
type WorkshopSlotKey =
  | VisualSlotKey
  | "dashboard.profile-image"
  | "assets.library"
  | "ui-lab.resource-guide"
  | "ui-lab.soul-interface"
  | "number-lab"
  | "ui-lab.gauge"
  | "ui-lab.mission-panel"
  | "ui-lab.notification-panel"
  | "ui-lab.inventory-grid"
  | "layout-lab.previews"
  | "desktop-lab";

type ResourceGuideDemoState = {
  title: string;
  description: string;
  resourceLabel: string;
  current: number;
  maximum: number;
  statusLabel: string;
  footerLabel: string;
  variant: "cyan" | "aether" | "warning";
  compact: boolean;
};

type SoulDemoState = {
  title: string;
  current: number;
  maximum: number;
  bonusLabel: string;
  bonusValue: string;
  state: "off" | "active" | "complete";
  numberStyle: "default" | "aether" | "damage";
  actionLabel: string;
};

type GaugeDemoState = {
  current: number;
  maximum: number;
  variant: GameGaugeVariant;
  size: "sm" | "md" | "lg";
  showValue: boolean;
  showPercentage: boolean;
  label: string;
  animated: boolean;
};

const { desktop, hud, status: statusTerms, workshop } = coinTerminology;

const workshopAreas: Array<{ key: WorkshopAreaKey; label: string; description: string; slots: Array<{ key: WorkshopSlotKey; label: string; subtitle: string }> }> = [
  {
    key: "Appearance",
    label: workshop.sections.appearance.label,
    description: "正式外觀設定",
    slots: [
      { key: visualSlots.favicon.key, label: "分頁圖示", subtitle: "瀏覽器與 PWA 圖示" },
      { key: visualSlots.headerDivider.key, label: "頁首能量分隔線", subtitle: "頁面能量分隔光效" },
      { key: "dashboard.profile-image", label: "儀表板角色圖像", subtitle: "財務首頁視覺圖像" }
    ]
  },
  {
    key: "Assets",
    label: workshop.sections.assets.label,
    description: "素材索引",
    slots: [
      { key: "assets.library", label: workshop.assets.registry.label, subtitle: "圖示、特效、HUD 圖像與桌布素材索引" }
    ]
  },
  {
    key: "UiLab",
    label: workshop.sections.uiLab.label,
    description: "MMORPG 元件試驗",
    slots: [
      { key: "ui-lab.resource-guide", label: hud.widgetNames.resourceGuide.label, subtitle: "模擬資源指引卡片" },
      { key: "ui-lab.soul-interface", label: hud.widgetNames.soulInterface.label, subtitle: "模擬靈魂儀表卡片" },
      { key: "ui-lab.gauge", label: hud.widgetNames.gameGauge.label, subtitle: "可重用的進度量表" },
      { key: "ui-lab.mission-panel", label: workshop.widgets.missionPanel, subtitle: statusTerms.planned.label },
      { key: "ui-lab.notification-panel", label: workshop.widgets.notificationPanel, subtitle: statusTerms.planned.label },
      { key: "ui-lab.inventory-grid", label: workshop.widgets.inventoryGrid, subtitle: statusTerms.planned.label }
    ]
  },
  {
    key: "NumberLab",
    label: workshop.numberLab.title,
    description: "Aether Number System 編輯器骨架",
    slots: [
      { key: "number-lab", label: workshop.numberLab.title, subtitle: "Preset、Preview 與設定 Tabs" }
    ]
  },
  {
    key: "LayoutLab",
    label: workshop.sections.layoutLab.label,
    description: "頁面構圖預覽",
    slots: [
      { key: "layout-lab.previews", label: workshop.layout.previews, subtitle: "儀表板、帳戶與信用卡終端構圖草圖" }
    ]
  },
  {
    key: "DesktopLab",
    label: workshop.sections.desktopLab.label,
    description: "隔離桌面實驗",
    slots: [
      { key: "desktop-lab", label: desktop.prototype, subtitle: "桌布、Dock 與可拖曳視窗" }
    ]
  }
];

export default function WorkshopPage() {
  const defaultAsset = getDefaultVisualAsset();
  const { settings, status, error, updateWorkshopSettings, retry } = useSettings();
  const [activeArea, setActiveArea] = useState<WorkshopAreaKey>("Appearance");
  const [selectedSlotKey, setSelectedSlotKey] = useState<WorkshopSlotKey>(visualSlots.favicon.key);
  const [failedPreviewIds, setFailedPreviewIds] = useState<string[]>([]);
  const [resourceGuideDemo, setResourceGuideDemo] = useState<ResourceGuideDemoState>({
    title: "復活資金",
    description: "確認目前資源是否足以支援下一次任務。",
    resourceLabel: "模擬帳戶目前資源",
    current: 68000,
    maximum: 100000,
    statusLabel: "NPC / 確認",
    footerLabel: workshop.prototype.notice,
    variant: "cyan",
    compact: false
  });
  const [soulDemo, setSoulDemo] = useState<SoulDemoState>({
    title: "靈魂武器",
    current: 615,
    maximum: 1000,
    bonusLabel: "攻擊力",
    bonusValue: "+20",
    state: "off",
    numberStyle: "aether",
    actionLabel: "全靈魂填滿"
  });
  const [gaugeDemo, setGaugeDemo] = useState<GaugeDemoState>({ current: 66, maximum: 100, variant: "cyan", size: "md", showValue: true, showPercentage: true, label: "Aether 量表", animated: true });
  const [previewVars, setPreviewVars] = useState({ glow: 1, radius: 8, gaugeHeight: 12, stroke: 1 });
  const [desktopPreferences, setDesktopPreferences] = useState<DesktopLabPreferences>(() => readDesktopPreferences());

  const appliedSettings = settings.workshopSettings;
  const selectedAsset = useMemo(() => getBuiltInVisualAsset(appliedSettings.faviconAssetId) ?? defaultAsset, [appliedSettings.faviconAssetId, defaultAsset]);
  const dashboardProfileSettings = appliedSettings.dashboardProfileImage;
  const dashboardProfileImage = useMemo(() => resolveDashboardProfileImage(dashboardProfileSettings), [dashboardProfileSettings]);
  const availableAssets = builtInVisualAssets.filter((asset) => asset.slotKeys.includes(visualSlots.favicon.key));
  const activeWorkshopArea = workshopAreas.find((area) => area.key === activeArea) ?? workshopAreas[0];
  const assetRegistry = getAetherAssetRegistry([appliedSettings.faviconAssetId, dashboardProfileSettings.imageId, desktopPreferences.wallpaper]);
  const p0ResourceAssets = getP0AetherResourceAssets();
  const isDefault = appliedSettings.faviconAssetId === defaultAsset.id
    && appliedSettings.headerDividerEnabled === visualSlots.headerDivider.defaultEnabled
    && dashboardProfileSettings.imageId === defaultDashboardProfileImageSettings.imageId
    && dashboardProfileSettings.customImageUrl === defaultDashboardProfileImageSettings.customImageUrl;

  const onImageError = (assetId: string) => {
    setFailedPreviewIds((current) => current.includes(assetId) ? current : [...current, assetId]);
  };

  return (
    <section className="grid gap-6">
      <PageHeader
        title={workshop.title}
        description={workshop.description}
        actions={<Button type="button" variant="outline" onClick={() => updateWorkshopSettings(defaultAetherWorkshopSettings)} disabled={isDefault}>重設工坊</Button>}
      />
      <GameWindow title="視覺設定" description={workshop.systemLabel}>
        <div className="aether-management-window aether-workshop" aria-live="polite">
          <AetherPanelHeader
            eyebrow={workshop.systemLabel}
            title={workshop.title}
            subtitle="正式設定與實驗原型分區管理，避免介面實驗室影響財務資料。"
            status={<AetherStatusIndicator label={settingsStatusLabel(status)} tone={settingsStatusTone(status)} />}
            summary="伺服器設定"
          />
          <AetherToolbar role="tablist" ariaLabel="介面工坊篩選">
            {workshopAreas.map((area) => (
              <button
                key={area.key}
                type="button"
                role="tab"
                aria-selected={activeArea === area.key}
                className={`aether-filter-tab ${activeArea === area.key ? "aether-filter-tab-active" : ""}`}
                onClick={() => {
                  setActiveArea(area.key);
                  setSelectedSlotKey(area.slots[0].key);
                }}
              >
                {area.label}
              </button>
            ))}
            <div className="aether-toolbar-check">
              <span>同步狀態</span>
              <AetherStatusIndicator label={settingsStatusLabel(status)} tone={settingsStatusTone(status)} />
            </div>
          </AetherToolbar>

          {activeArea === "NumberLab" ? (
            <div className="aether-workshop-full-detail">
              <AetherNumberLab />
              <p className="text-sm text-muted">{workshop.prototype.notice}：此區不寫入使用者設定，也不呼叫 Finance API。</p>
            </div>
          ) : (
          <div className="aether-master-detail">
            <div className="aether-list-pane" aria-label="視覺槽位" role="listbox">
              <WorkshopCatalog
                title={activeWorkshopArea.label}
                meta={`${activeWorkshopArea.slots.length} 項`}
                description={activeWorkshopArea.description}
                items={activeWorkshopArea.slots.map((slot) => ({
                  key: slot.key,
                  title: slot.label,
                  subtitle: `${slot.key} / ${slotSubtitle(slot.key, appliedSettings, selectedAsset.name, dashboardProfileImage.name, slot.subtitle)}`,
                  statusLabel: slotStatusLabel(slot.key, appliedSettings),
                  statusTone: slotStatusTone(slot.key, appliedSettings)
                }))}
                selectedKey={selectedSlotKey}
                onSelect={setSelectedSlotKey}
              />
              <div className="rounded-ui border border-border/60 bg-background/30 p-3 text-sm text-muted">
                外觀設定會同步到使用者設定；介面實驗室、版面實驗室與桌面實驗室只做隔離實驗，不寫入財務資料。
              </div>
            </div>

            <div className="aether-detail-pane">
              <div className="aether-detail-scroll">
                {selectedSlotKey === "assets.library" ? (
                  <AssetLibraryDetail assets={assetRegistry} p0Assets={p0ResourceAssets} failedPreviewIds={failedPreviewIds} onImageError={onImageError} />
                ) : selectedSlotKey === "ui-lab.resource-guide" ? (
                  <ResourceGuideLabDetail state={resourceGuideDemo} previewVars={previewVars} onPreviewVarsChange={setPreviewVars} onChange={setResourceGuideDemo} />
                ) : selectedSlotKey === "ui-lab.soul-interface" ? (
                  <SoulInterfaceLabDetail state={soulDemo} onChange={setSoulDemo} />
                ) : selectedSlotKey === "ui-lab.gauge" ? (
                  <GaugeLabDetail state={gaugeDemo} onChange={setGaugeDemo} />
                ) : selectedSlotKey === "ui-lab.mission-panel" || selectedSlotKey === "ui-lab.notification-panel" || selectedSlotKey === "ui-lab.inventory-grid" ? (
                  <FutureComponentsDetail selectedKey={selectedSlotKey} />
                ) : selectedSlotKey === "layout-lab.previews" ? (
                  <LayoutLabDetail />
                ) : selectedSlotKey === "desktop-lab" ? (
                  <DesktopLabSlotDetail preferences={desktopPreferences} onChange={(next) => { setDesktopPreferences(next); writeDesktopPreferences(next); }} />
                ) : selectedSlotKey === "dashboard.profile-image" ? (
                  <DashboardProfileImageSlotDetail
                    settings={dashboardProfileSettings}
                    resolvedImage={dashboardProfileImage}
                    onUpdate={(dashboardProfileImage) => updateWorkshopSettings({ dashboardProfileImage })}
                    onReset={() => updateWorkshopSettings({ dashboardProfileImage: defaultDashboardProfileImageSettings })}
                  />
                ) : selectedSlotKey === visualSlots.favicon.key ? (
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

                <p className={`text-sm ${status === "error" && isServerSettingSlot(selectedSlotKey) ? "text-warning" : "text-muted"}`}>
                  {isServerSettingSlot(selectedSlotKey) ? settingsStatusMessage(status, error) : `${workshop.prototype.notice}：此區不寫入使用者設定，也不呼叫 Finance API。`}
                </p>

                <AetherActionBar>
                  {status === "error" && isServerSettingSlot(selectedSlotKey) && <Button type="button" variant="outline" onClick={retry}>重試同步</Button>}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      updateWorkshopSettings(defaultAetherWorkshopSettings);
                    }}
                    disabled={isDefault}
                  >
                    重設工坊
                  </Button>
                </AetherActionBar>
              </div>
            </div>
          </div>
          )}
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
        <AetherDefinitionRow label="槽位 Key" value={visualSlots.favicon.key} />
        <AetherDefinitionRow label="儲存方式" value="伺服器使用者設定" />
        <AetherDefinitionRow label="目前素材" value={selectedAsset.name} />
        <AetherDefinitionRow label="素材路徑" value={<span className="break-all">{selectedAsset.src}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="可用素材" meta={`${availableAssets.length} 個素材`} />
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
        <AetherDefinitionRow label="槽位 Key" value={visualSlots.headerDivider.key} />
        <AetherDefinitionRow label="類型" value="動態 WebP" />
        <AetherDefinitionRow label="儲存方式" value="伺服器使用者設定" />
        <AetherDefinitionRow label="預設值" value={visualSlots.headerDivider.defaultEnabled ? "啟用" : "停用"} />
        <AetherDefinitionRow label="素材路徑" value={<span className="break-all">{visualSlots.headerDivider.assetPath}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title={workshop.preview.effect} meta={enabled ? "預覽啟用" : "預覽停用"} />
        <div className="aether-divider-preview">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">VISUAL SLOT</p>
          <h3 className="text-2xl font-bold text-foreground">Aether Divider</h3>
          <p className="text-sm text-muted">此效果只作為裝飾，不影響頁面資料與操作。</p>
          {enabled ? <AetherEnergyDivider className="-mb-2 -mt-2" intensity="normal" /> : <div className="rounded-ui border border-dashed border-border/70 p-4 text-center text-sm text-muted">光效已停用。</div>}
        </div>
      </section>
    </>
  );
}

function DashboardProfileImageSlotDetail({
  settings,
  resolvedImage,
  onUpdate,
  onReset
}: {
  settings: DashboardProfileImageSettings;
  resolvedImage: { id: string; name: string; src: string; description: string };
  onUpdate: (settings: DashboardProfileImageSettings) => void;
  onReset: () => void;
}) {
  return (
    <>
      <AetherSectionHeader title="儀表板外觀" meta="dashboard.profile-image" />
      <div className="grid gap-3 rounded-ui border border-border/60 bg-background/35 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-ui border border-primary/50 bg-background/70">
            <img className="h-full w-full object-contain p-2" src={resolvedImage.src} alt="" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">儀表板角色圖像</h2>
            <p className="mt-1 text-sm text-muted">控制儀表板財務角色區的中央圖片，並由使用者設定同步。</p>
          </div>
          <AetherStatusIndicator label="已同步" tone="success" />
        </div>
      </div>

      <AetherDefinitionList>
        <AetherDefinitionRow label="槽位 Key" value="dashboard.profile-image" />
        <AetherDefinitionRow label="儲存方式" value="伺服器使用者設定" />
        <AetherDefinitionRow label="目前圖片" value={resolvedImage.name} />
        <AetherDefinitionRow label="圖片路徑" value={<span className="break-all">{resolvedImage.src}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="內建圖片" meta={`${dashboardProfileImageOptions.length} 個素材`} />
        <div className="grid gap-2 sm:grid-cols-2">
          {dashboardProfileImageOptions.map((option) => {
            const isSelected = settings.imageId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`aether-asset-option ${isSelected ? "aether-asset-option-active" : ""}`}
                aria-pressed={isSelected}
                onClick={() => onUpdate({ imageId: option.id, customImageUrl: settings.customImageUrl })}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-ui border border-border/75 bg-background/80">
                  <img className="h-9 w-9 object-contain" src={option.src} alt="" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-left">
                  <strong>{option.name}</strong>
                <small>{option.description}</small>
                </span>
                {isSelected && <AetherStatusIndicator label="目前" tone="success" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3">
        <AetherSectionHeader title="自訂圖片 URL" meta="選填" />
        <label className="grid gap-2 text-sm font-semibold text-foreground">
          圖片網址
          <input
            className="h-11 rounded-ui border border-border/75 bg-background/70 px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={settings.customImageUrl}
            placeholder="https://... 或 /aether/..."
            onChange={(event) => onUpdate({ imageId: "custom", customImageUrl: event.target.value })}
          />
        </label>
        <p className="text-xs text-muted">這個版本不會上傳檔案；你可以先使用公開圖片網址或 public 目錄中的路徑，設定會同步到伺服器。</p>
      </section>

      <AetherActionBar>
        <Button type="button" variant="outline" onClick={onReset}>重設圖片</Button>
      </AetherActionBar>
    </>
  );
}

function DesktopLabSlotDetail({ preferences, onChange }: { preferences: DesktopLabPreferences; onChange: (preferences: DesktopLabPreferences) => void }) {
  const storedLayout = readDesktopLayout();
  const openWindows = Object.values(storedLayout).filter((windowState) => windowState.isOpen).length;
  const minimizedWindows = Object.values(storedLayout).filter((windowState) => windowState.isOpen && windowState.isMinimized).length;
  const currentWallpaper = desktopWallpaperPresets.find((wallpaper) => wallpaper.id === preferences.wallpaper) ?? desktopWallpaperPresets[0];

  function updatePreference<TKey extends keyof DesktopLabPreferences>(key: TKey, value: DesktopLabPreferences[TKey]) {
    const next = writeDesktopPreference(key, value);
    onChange(next);
  }

  return (
    <>
      <AetherSectionHeader title="桌面模式狀態" meta={workshop.prototype.notice} />
      <div className="grid gap-4 rounded-ui border border-primary/45 bg-primary/8 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex rounded-full border border-warning/45 bg-warning/12 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-warning">
              {statusTerms.experimental.label}
            </div>
            <h2 className="text-2xl font-black text-foreground">{desktop.mode}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              以桌布、Dock 與浮動視窗測試另一種操作模式。不會影響目前正式介面與財務資料。
            </p>
          </div>
          <Link className="game-button game-button-primary ui-focus inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold" href="/desktop-lab">
            開啟實驗桌面
          </Link>
        </div>
        <AetherDefinitionList>
          <AetherDefinitionRow label="資料來源" value={desktop.mockOnly} />
          <AetherDefinitionRow label="隔離範圍" value="不修改 Backend / API / Ledger / Finance UI" />
          <AetherDefinitionRow label="測試互動" value="桌布、Dock、視窗拖曳、最小化、關閉、Z-index" />
          <AetherDefinitionRow label="儲存方式" value="desktop-lab.preferences + desktop-lab.window-layout" />
          <AetherDefinitionRow label="目前桌布" value={currentWallpaper.label} />
          <AetherDefinitionRow label={desktop.windowSkin} value={preferences.windowSkin} />
          <AetherDefinitionRow label="Dock 樣式" value={preferences.dockStyle} />
          <AetherDefinitionRow label="HUD 樣式" value={preferences.hudStyle} />
          <AetherDefinitionRow label="開啟視窗" value={`${openWindows} 個開啟 / ${minimizedWindows} 個最小化`} />
        </AetherDefinitionList>
        <div className="aether-ui-lab-controls">
          <label>{desktop.wallpaper}<select value={preferences.wallpaper} onChange={(event) => updatePreference("wallpaper", event.target.value as DesktopWallpaperPreset)}>
            {desktopWallpaperPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <label>{desktop.windowSkin}<select value={preferences.windowSkin} onChange={(event) => updatePreference("windowSkin", event.target.value as DesktopWindowSkin)}>
            {desktopWindowSkinPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <label>Dock 樣式<select value={preferences.dockStyle} onChange={(event) => updatePreference("dockStyle", event.target.value as DesktopDockStyle)}>
            {desktopDockStylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <label>HUD 樣式<select value={preferences.hudStyle} onChange={(event) => updatePreference("hudStyle", event.target.value as DesktopHudStyle)}>
            {desktopHudStylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
        </div>
        <AetherActionBar>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearDesktopLabStorage();
              window.dispatchEvent(new StorageEvent("storage", { key: "desktop-lab.window-layout", newValue: JSON.stringify(defaultDesktopLayout()) }));
            }}
          >
            {desktop.resetLayout}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearDesktopAppearanceStorage();
              onChange(defaultDesktopLabPreferences);
            }}
          >
            {desktop.resetAppearance}
          </Button>
        </AetherActionBar>
        <p className="text-sm text-muted">此功能目前為原型，只使用模擬資料。重設版面不會清除外觀偏好。</p>
      </div>
    </>
  );
}

const resourcePreviewSizes = ["md", "lg", "xl", "xxl", "hero"] as const;
const resourcePreviewSurfaces = [
  { key: "app", label: "App Background" },
  { key: "workspace", label: "Workspace Surface" },
  { key: "selected", label: "Selected / Cyan Surface" }
] as const;

function AssetLibraryDetail({ assets, p0Assets, failedPreviewIds, onImageError }: { assets: ReturnType<typeof getAetherAssetRegistry>; p0Assets: AetherAssetDefinition[]; failedPreviewIds: string[]; onImageError: (assetId: string) => void }) {
  return (
    <>
      <AetherSectionHeader title="Aether Resource Artwork Review" meta={`${p0Assets.length} 個 P0 素材 / Visual Review`} />
      <div className="aether-resource-review-workspace">
        <div className="aether-resource-review-list">
          {p0Assets.map((asset) => (
            <article key={asset.key} className="aether-resource-review-card">
              <div className="aether-resource-review-card-head">
                <AetherAsset name={asset.key} size="lg" className="aether-resource-icon" />
                <div>
                  <strong>{asset.label}</strong>
                  <span>{asset.key}</span>
                </div>
                <AetherStatusIndicator label={reviewStatusLabel(asset.reviewStatus)} tone={reviewStatusTone(asset.reviewStatus)} />
              </div>
              <p>{asset.visualDescription}</p>
              <AetherDefinitionList>
                <AetherDefinitionRow label="Category" value={asset.category} />
                <AetherDefinitionRow label="Runtime Path" value={<span className="break-all">{asset.customSrc}</span>} />
                <AetherDefinitionRow label="Format" value={`${asset.format ?? "WebP"} / ${asset.dimensions ?? "256x256"}`} />
                <AetherDefinitionRow label="Primary Usage" value={asset.primaryUsage ?? asset.purpose} />
                <AetherDefinitionRow label="Fallback" value={asset.fallback} />
              </AetherDefinitionList>
            </article>
          ))}
        </div>

        <div className="aether-resource-review-inspector">
          <AetherSectionHeader title="Size Preview" meta="24 / 32 / 48 / 64 / 96 px plus fallback" />
          <div className="aether-resource-size-grid">
            {p0Assets.map((asset) => (
              <div key={`${asset.key}-sizes`} className="aether-resource-size-row">
                <strong>{asset.key}</strong>
                {resourcePreviewSizes.map((size) => (
                  <span key={size} className="aether-resource-preview-slot">
                    <AetherAsset name={asset.key} size={size} />
                  </span>
                ))}
                <span className="aether-resource-preview-slot">
                  <AetherAsset name={asset.key} size="lg" forceFallback />
                </span>
              </div>
            ))}
          </div>

          <AetherSectionHeader title="Surface Preview" meta="contrast / glow / dark frame" />
          <div className="aether-resource-surface-grid">
            {resourcePreviewSurfaces.map((surface) => (
              <div key={surface.key} className={`aether-resource-surface aether-resource-surface-${surface.key}`}>
                <span>{surface.label}</span>
                <div>
                  {p0Assets.map((asset) => <AetherAsset key={`${surface.key}-${asset.key}`} name={asset.key} size="lg" className="aether-resource-icon" />)}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-ui border border-border/60 bg-background/35 p-3 text-sm text-muted">
            目前四個 P0 素材只標記為 Visual Review，不標記 Approved。審核重點：Silhouette、Small-size readability、Contrast、Material consistency、Aether identity、UI fit。
          </div>
        </div>
      </div>

      <AetherSectionHeader title="Asset Pack" meta="Aether Core / Personal Reference" />
      <div className="aether-reference-pack-grid">
        {personalReferenceAssetPacks.map((pack) => (
          <article key={pack.id} className={`aether-reference-pack-card aether-reference-pack-card-${pack.runtime}`}>
            <div>
              <strong>{pack.label}</strong>
              <span>{pack.source} / {pack.runtime}</span>
            </div>
            <AetherStatusIndicator label={referencePackStatusLabel(pack.status)} tone={referencePackStatusTone(pack.status)} />
            <p>{pack.description}</p>
          </article>
        ))}
      </div>

      <AetherSectionHeader title="Reference Mapping" meta="development-only comparison" />
      <div className="aether-reference-mapping-grid">
        {personalReferenceMappings.map((mapping) => (
          <article key={`${mapping.semanticAsset}-${mapping.referenceKey}`} className="aether-reference-mapping-card">
            <div className="aether-reference-mapping-assets">
              <span>
                <AetherAsset name={mapping.semanticAsset} size="lg" className="aether-resource-icon" />
                <strong>Aether Original</strong>
                <small>{mapping.semanticAsset}</small>
              </span>
              <span className="aether-reference-arrow">→</span>
              <span>
                <span className="aether-css-asset-preview">REF</span>
                <strong>Personal Reference</strong>
                <small>{mapping.referenceKey}</small>
              </span>
            </div>
            <AetherDefinitionList>
              <AetherDefinitionRow label="Pack" value={mapping.packId} />
              <AetherDefinitionRow label="Status" value={mapping.status} />
              <AetherDefinitionRow label="Focus" value={mapping.comparisonFocus.join(", ")} />
            </AetherDefinitionList>
          </article>
        ))}
      </div>

      <div className="rounded-ui border border-warning/35 bg-warning/10 p-3 text-sm text-muted">
        <strong className="mb-2 block text-warning">Personal Reference Pack is local-only</strong>
        <ul className="grid gap-1">
          {personalReferenceAssetRules.map((rule) => <li key={rule}>• {rule}</li>)}
        </ul>
      </div>

      <AetherSectionHeader title={workshop.assets.registry.label} meta={`${assets.length} 個內建素材`} />
      <div className="aether-asset-library">
        {assets.map((asset) => (
          <article key={`${asset.category}-${asset.id}`} className="aether-asset-card">
            {asset.path.startsWith("/") ? (
              <PreviewIcon assetId={asset.id} src={asset.path} name={asset.name} failedPreviewIds={failedPreviewIds} onError={onImageError} />
            ) : (
              <span className="aether-css-asset-preview">{asset.id.slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <strong>{asset.name}</strong>
              <span>{asset.category} / {asset.builtIn ? workshop.assets.builtIn : workshop.assets.external}</span>
              <small>{asset.usage}</small>
              <small className="break-all">{asset.path}</small>
              <small>{asset.tags.join(", ")}</small>
              {asset.isCurrent && <AetherStatusIndicator label={workshop.assets.current} tone="success" />}
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">素材註冊表只索引專案內建合法素材；視窗外觀與 HUD 目前為 CSS preset，沒有圖片素材時不捏造資產。</p>
    </>
  );
}

function referencePackStatusLabel(status: (typeof personalReferenceAssetPacks)[number]["status"]) {
  if (status === "available") return "Available";
  if (status === "reference-only") return "Reference Only";
  return "Empty";
}

function referencePackStatusTone(status: (typeof personalReferenceAssetPacks)[number]["status"]) {
  if (status === "available") return "success";
  if (status === "reference-only") return "warning";
  return "neutral";
}

function reviewStatusLabel(status: AetherAssetDefinition["reviewStatus"]) {
  if (status === "visual-review") return "Visual Review";
  if (status === "approved") return "Approved";
  if (status === "revision-required") return "Revision Required";
  if (status === "integrated") return "Integrated";
  return "Not Reviewed";
}

function reviewStatusTone(status: AetherAssetDefinition["reviewStatus"]) {
  if (status === "approved") return "success";
  if (status === "revision-required") return "warning";
  if (status === "visual-review") return "credit";
  return "neutral";
}

function ResourceGuideLabDetail({ state, previewVars, onPreviewVarsChange, onChange }: { state: ResourceGuideDemoState; previewVars: { glow: number; radius: number; gaugeHeight: number; stroke: number }; onPreviewVarsChange: (vars: { glow: number; radius: number; gaugeHeight: number; stroke: number }) => void; onChange: (state: ResourceGuideDemoState) => void }) {
  const resetState = () => onChange({ title: "復活資金", description: "確認目前資源是否足以支援下一次任務。", resourceLabel: "模擬帳戶目前資源", current: 68000, maximum: 100000, statusLabel: "NPC / 確認", footerLabel: workshop.prototype.notice, variant: "cyan", compact: false });

  return (
    <>
      <WorkshopInspector title={workshop.inspector.resourceGuide} meta={workshop.prototype.notice} actions={<Button type="button" variant="outline" onClick={resetState}>{workshop.preview.reset}</Button>}>
        <div className="aether-ui-lab-controls">
          <label>{workshop.fields.title}<input value={state.title} onChange={(event) => onChange({ ...state, title: event.target.value })} /></label>
          <label>{workshop.fields.description}<textarea value={state.description} onChange={(event) => onChange({ ...state, description: event.target.value })} /></label>
          <label>{workshop.fields.resourceLabel}<input value={state.resourceLabel} onChange={(event) => onChange({ ...state, resourceLabel: event.target.value })} /></label>
          <label>{workshop.fields.current}<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>{workshop.fields.maximum}<input type="number" value={state.maximum} onChange={(event) => onChange({ ...state, maximum: Number(event.target.value) })} /></label>
          <label>{workshop.fields.statusLabel}<input value={state.statusLabel} onChange={(event) => onChange({ ...state, statusLabel: event.target.value })} /></label>
          <label>{workshop.fields.footerLabel}<input value={state.footerLabel} onChange={(event) => onChange({ ...state, footerLabel: event.target.value })} /></label>
          <label>{workshop.fields.variant}<select value={state.variant} onChange={(event) => onChange({ ...state, variant: event.target.value as "cyan" | "aether" | "warning" })}>
            <option value="cyan">{hud.variants.cyan}</option>
            <option value="aether">{hud.variants.aether}</option>
            <option value="warning">警示橘</option>
          </select></label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.compact} onChange={(event) => onChange({ ...state, compact: event.target.checked })} /> {workshop.fields.compact}</label>
        </div>
        <WorkshopPropertyGroup title="安全樣式變數">
          <WorkshopPropertyRow label={workshop.fields.glow}><input type="range" min="0" max="2" step="0.1" value={previewVars.glow} onChange={(event) => onPreviewVarsChange({ ...previewVars, glow: Number(event.target.value) })} /></WorkshopPropertyRow>
          <WorkshopPropertyRow label={workshop.fields.radius}><input type="range" min="4" max="18" value={previewVars.radius} onChange={(event) => onPreviewVarsChange({ ...previewVars, radius: Number(event.target.value) })} /></WorkshopPropertyRow>
          <WorkshopPropertyRow label={workshop.fields.gaugeHeight}><input type="range" min="6" max="18" value={previewVars.gaugeHeight} onChange={(event) => onPreviewVarsChange({ ...previewVars, gaugeHeight: Number(event.target.value) })} /></WorkshopPropertyRow>
          <WorkshopPropertyRow label={workshop.fields.numberStroke}><input type="range" min="0" max="2" step="0.25" value={previewVars.stroke} onChange={(event) => onPreviewVarsChange({ ...previewVars, stroke: Number(event.target.value) })} /></WorkshopPropertyRow>
        </WorkshopPropertyGroup>
      </WorkshopInspector>
      <WorkshopPreviewStage title={workshop.preview.live} meta={`${workshop.preview.normal} / ${workshop.preview.edgeCases}`} style={{ "--aether-glow-strength": previewVars.glow, "--aether-radius": `${previewVars.radius}px`, "--aether-gauge-height": `${previewVars.gaugeHeight}px`, "--aether-number-stroke": `${previewVars.stroke}px` } as CSSProperties}>
        <div className="aether-preview-matrix">
          {[
            ["一般狀態", state.current, state.maximum],
            ["低進度", 5, 100],
            ["接近完成", 95, 100],
            ["已完成", 100, 100],
            ["溢位測試", 999999999, 100000]
          ].map(([label, current, maximum]) => (
            <div key={String(label)} className="grid gap-2">
              <AetherStatusIndicator label={String(label)} tone="neutral" />
              <ResourceGuide {...state} current={Number(current)} maximum={Number(maximum)} />
            </div>
          ))}
        </div>
      </WorkshopPreviewStage>
    </>
  );
}

function SoulInterfaceLabDetail({ state, onChange }: { state: SoulDemoState; onChange: (state: SoulDemoState) => void }) {
  const resetState = () => onChange({ title: "靈魂武器", current: 615, maximum: 1000, bonusLabel: "攻擊力", bonusValue: "+20", state: "off", numberStyle: "aether", actionLabel: "全靈魂填滿" });

  return (
    <>
      <WorkshopInspector title={workshop.inspector.soulInterface} meta={workshop.prototype.notice} actions={<Button type="button" variant="outline" onClick={resetState}>{workshop.preview.reset}</Button>}>
        <div className="aether-ui-lab-controls">
          <label>{workshop.fields.title}<input value={state.title} onChange={(event) => onChange({ ...state, title: event.target.value })} /></label>
          <label>{workshop.fields.current}<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>{workshop.fields.maximum}<input type="number" value={state.maximum} onChange={(event) => onChange({ ...state, maximum: Number(event.target.value) })} /></label>
          <label>{workshop.fields.bonusLabel}<input value={state.bonusLabel} onChange={(event) => onChange({ ...state, bonusLabel: event.target.value })} /></label>
          <label>{workshop.fields.bonusValue}<input value={state.bonusValue} onChange={(event) => onChange({ ...state, bonusValue: event.target.value })} /></label>
          <label>{workshop.fields.actionLabel}<input value={state.actionLabel} onChange={(event) => onChange({ ...state, actionLabel: event.target.value })} /></label>
          <label>{workshop.fields.state}<select value={state.state} onChange={(event) => onChange({ ...state, state: event.target.value as "off" | "active" | "complete" })}>
            <option value="off">{statusTerms.inactive.label}</option>
            <option value="active">{statusTerms.active.label}</option>
            <option value="complete">{statusTerms.completed.label}</option>
          </select></label>
          <label>{workshop.fields.numberStyle}<select value={state.numberStyle} onChange={(event) => onChange({ ...state, numberStyle: event.target.value as "default" | "aether" | "damage" })}>
            <option value="default">{hud.variants.default}</option>
            <option value="aether">{hud.variants.aether}</option>
            <option value="damage">{hud.variants.damage}</option>
          </select></label>
        </div>
      </WorkshopInspector>
      <WorkshopPreviewStage title={workshop.preview.live} meta="數值溢位案例">
        <div className="aether-preview-matrix aether-preview-matrix-compact">
          {[
            [state.current, state.maximum],
            [0, 1000],
            [1000, 1000],
            [999999, 1000000]
          ].map(([current, maximum]) => <SoulInterface key={`${current}-${maximum}`} {...state} current={current} maximum={maximum} />)}
        </div>
      </WorkshopPreviewStage>
    </>
  );
}

function GaugeLabDetail({ state, onChange }: { state: GaugeDemoState; onChange: (state: GaugeDemoState) => void }) {
  return (
    <>
      <WorkshopInspector title={workshop.inspector.gameGauge} meta={workshop.prototype.notice} actions={<Button type="button" variant="outline" onClick={() => onChange({ current: 66, maximum: 100, variant: "cyan", size: "md", showValue: true, showPercentage: true, label: "Aether 量表", animated: true })}>{workshop.preview.reset}</Button>}>
        <div className="aether-ui-lab-controls">
          <label>{workshop.fields.label}<input value={state.label} onChange={(event) => onChange({ ...state, label: event.target.value })} /></label>
          <label>{workshop.fields.current}<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>{workshop.fields.maximum}<input type="number" value={state.maximum} onChange={(event) => onChange({ ...state, maximum: Number(event.target.value) })} /></label>
          <label>{workshop.fields.variant}<select value={state.variant} onChange={(event) => onChange({ ...state, variant: event.target.value as GameGaugeVariant })}>
            <option value="cyan">{hud.variants.cyan}</option>
            <option value="purple">{hud.variants.purple}</option>
            <option value="green">成功綠</option>
            <option value="yellow">{hud.variants.yellow}</option>
            <option value="red">警示紅</option>
          </select></label>
          <label>{workshop.fields.size}<select value={state.size} onChange={(event) => onChange({ ...state, size: event.target.value as "sm" | "md" | "lg" })}>
            <option value="sm">小</option>
            <option value="md">中</option>
            <option value="lg">大</option>
          </select></label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.showValue} onChange={(event) => onChange({ ...state, showValue: event.target.checked })} /> {workshop.fields.showValue}</label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.showPercentage} onChange={(event) => onChange({ ...state, showPercentage: event.target.checked })} /> {workshop.fields.showPercentage}</label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.animated} onChange={(event) => onChange({ ...state, animated: event.target.checked })} /> {workshop.fields.animated}</label>
        </div>
      </WorkshopInspector>
      <WorkshopPreviewStage title={workshop.preview.live} meta="ARIA progressbar">
        <div className="grid gap-4">
          <GameGauge {...state} />
          <GameGauge {...state} current={0} maximum={0} label="最大值為零" />
          <GameGauge {...state} current={999} maximum={100} label="溢位限制" />
        </div>
      </WorkshopPreviewStage>
    </>
  );
}

function FutureComponentsDetail({ selectedKey }: { selectedKey: WorkshopSlotKey }) {
  const items = [
    [workshop.widgets.missionPanel, "任務列表與狀態徽章，下一階段再做互動。"],
    [workshop.widgets.notificationPanel, "浮動通知、Toast 與系統提示。"],
    [workshop.widgets.inventoryGrid, "格狀道具欄與財務資源格。"]
  ];
  return (
    <>
      <AetherSectionHeader title="未來元件" meta={selectedKey} />
      <div className="aether-layout-lab-grid">
        {items.map(([title, description]) => (
          <WorkshopComingSoon key={title} title={title} description={description} />
        ))}
      </div>
    </>
  );
}

function LayoutLabDetail() {
  const previews = [
    ["儀表板角色版面", "正式儀表板已使用", statusTerms.active.label, "角色圖像 + 資源條 + 任務提示", "桌面 / 手機"],
    ["帳戶總覽版面", "正式帳戶頁資訊層級", statusTerms.active.label, "摘要卡片 + 精簡帳戶槽位", "桌面 / 手機"],
    ["信用卡終端版面", "信用卡主從式布局", statusTerms.prototype.label, "帳單卡片 + 匯入控制台", "桌面優先"],
    ["桌面工作區版面", "桌面實驗室隔離桌面", statusTerms.experimental.label, "桌布 + HUD + 視窗 + Dock", "桌面"]
  ];

  return (
    <>
      <AetherSectionHeader title={workshop.sections.layoutLab.label} meta={workshop.layout.structureSketches} />
      <div className="aether-layout-lab-grid">
        {previews.map(([title, purpose, status, description, viewport]) => (
          <article key={title} className="aether-layout-preview-card">
            <span>{title.slice(0, 2).toUpperCase()}</span>
            <strong>{title}</strong>
            <p>{description}</p>
            <small>{purpose}</small>
            <small>狀態：{status}</small>
            <small>適合：{viewport}</small>
            <small>{workshop.layout.mockStaticPreview}</small>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">版面實驗室只做構圖比較；成熟後才逐頁搬進正式財務介面。</p>
    </>
  );
}

function PreviewIcon({ assetId, src, name, failedPreviewIds, onError, size = "normal" }: { assetId: string; src: string; name: string; failedPreviewIds: string[]; onError: (assetId: string) => void; size?: "normal" | "large" }) {
  const hasFailedPreview = failedPreviewIds.includes(assetId);
  const sizeClass = size === "large" ? "h-16 w-16" : "h-11 w-11";

  return (
    <span className={`grid shrink-0 place-items-center rounded-ui border border-border/75 bg-background/80 ${sizeClass}`}>
      {hasFailedPreview ? <span className="text-xs font-bold text-muted">圖示</span> : <img className="h-8 w-8 object-contain" src={src} alt={`${name} 預覽`} onError={() => onError(assetId)} />}
    </span>
  );
}

function slotSubtitle(slotKey: WorkshopSlotKey, settings: AetherWorkshopSettings, savedAssetName: string, dashboardImageName: string, fallback: string) {
  if (slotKey === visualSlots.favicon.key) return `目前：${savedAssetName}`;
  if (slotKey === "dashboard.profile-image") return `目前：${dashboardImageName}`;
  if (slotKey === "desktop-lab") return workshop.prototype.notice;
  if (slotKey === visualSlots.headerDivider.key) return settings.headerDividerEnabled ? "頁首光效啟用" : "頁首光效停用";
  return fallback;
}

function slotStatusLabel(slotKey: WorkshopSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "同步";
  if (slotKey === "dashboard.profile-image") return "同步";
  if (slotKey === "desktop-lab") return statusTerms.experimental.label;
  if (slotKey.startsWith("ui-lab.") || slotKey === "layout-lab.previews") return slotKey === "ui-lab.mission-panel" || slotKey === "ui-lab.notification-panel" || slotKey === "ui-lab.inventory-grid" ? statusTerms.planned.label : statusTerms.mockOnly.label;
  if (slotKey === "assets.library") return "索引";
  return settings.headerDividerEnabled ? "啟用" : "停用";
}

function slotStatusTone(slotKey: WorkshopSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "credit";
  if (slotKey === "dashboard.profile-image") return "success";
  if (slotKey === "desktop-lab") return "warning";
  if (slotKey.startsWith("ui-lab.") || slotKey === "layout-lab.previews") return "neutral";
  if (slotKey === "assets.library") return "credit";
  return settings.headerDividerEnabled ? "success" : "neutral";
}

function isServerSettingSlot(slotKey: WorkshopSlotKey) {
  return slotKey === visualSlots.favicon.key || slotKey === visualSlots.headerDivider.key || slotKey === "dashboard.profile-image";
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
