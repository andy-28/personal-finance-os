"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { AetherEnergyDivider } from "@/components/ui/aether-effect";
import { Button } from "@/components/ui/button";
import { GameGauge, GameNumber, ResourceGuide, SoulInterface, type GameGaugeVariant, type GameNumberSize, type GameNumberVariant } from "@/components/game-ui";
import { WorkshopCatalog, WorkshopComingSoon, WorkshopInspector, WorkshopPreviewStage, WorkshopPropertyGroup, WorkshopPropertyRow } from "@/components/workshop/workshop-shell";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import {
  AetherActionBar,
  AetherDefinitionList,
  AetherDefinitionRow,
  AetherPanelHeader,
  AetherSectionHeader,
  AetherStatusIndicator,
  AetherToolbar
} from "@/components/ui/aether-management";
import {
  dashboardProfileImageOptions,
  defaultDashboardProfileImageSettings,
  resolveDashboardProfileImage,
  type DashboardProfileImageSettings
} from "@/lib/aether/dashboard-profile-settings";
import { getAetherAssetRegistry } from "@/lib/aether/assets";
import { builtInVisualAssets, getBuiltInVisualAsset, getDefaultVisualAsset, visualSlots, type VisualSlotKey } from "@/lib/aether/visual-slots";
import { defaultAetherWorkshopSettings, type AetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { clearDesktopAppearanceStorage, clearDesktopLabStorage, defaultDesktopLayout, readDesktopLayout, readDesktopPreferences, writeDesktopPreference, writeDesktopPreferences } from "@/lib/desktop-lab/storage";
import { defaultDesktopLabPreferences, desktopDockStylePresets, desktopHudStylePresets, desktopWallpaperPresets, desktopWindowSkinPresets, type DesktopDockStyle, type DesktopHudStyle, type DesktopLabPreferences, type DesktopWallpaperPreset, type DesktopWindowSkin } from "@/lib/desktop-lab/presets";
import { useSettings, type SettingsSyncStatus } from "@/lib/settings/user-settings";

type WorkshopAreaKey = "Appearance" | "Assets" | "UiLab" | "LayoutLab" | "DesktopLab";
type WorkshopSlotKey =
  | VisualSlotKey
  | "dashboard.profile-image"
  | "assets.library"
  | "ui-lab.resource-guide"
  | "ui-lab.soul-interface"
  | "ui-lab.game-number"
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

const workshopAreas: Array<{ key: WorkshopAreaKey; label: string; description: string; slots: Array<{ key: WorkshopSlotKey; label: string; subtitle: string }> }> = [
  {
    key: "Appearance",
    label: "Appearance",
    description: "正式外觀設定",
    slots: [
      { key: visualSlots.favicon.key, label: "Favicon", subtitle: "Browser and app icon" },
      { key: visualSlots.headerDivider.key, label: "Header Divider", subtitle: "Page energy divider" },
      { key: "dashboard.profile-image", label: "Dashboard Profile Image", subtitle: "Finance profile visual" }
    ]
  },
  {
    key: "Assets",
    label: "Assets",
    description: "素材索引",
    slots: [
      { key: "assets.library", label: "Asset Library", subtitle: "Icons, effects, HUD images and wallpaper catalog" }
    ]
  },
  {
    key: "UiLab",
    label: "UI Lab",
    description: "MMORPG 元件試驗",
    slots: [
      { key: "ui-lab.resource-guide", label: "Resource Guide", subtitle: "Mock enhancement guide card" },
      { key: "ui-lab.soul-interface", label: "Soul Interface", subtitle: "Mock soul meter card" },
      { key: "ui-lab.game-number", label: "Game Number", subtitle: "Reusable game number renderer" },
      { key: "ui-lab.gauge", label: "Gauge", subtitle: "Reusable progress gauge" },
      { key: "ui-lab.mission-panel", label: "Mission Panel", subtitle: "Coming later" },
      { key: "ui-lab.notification-panel", label: "Notification Panel", subtitle: "Coming later" },
      { key: "ui-lab.inventory-grid", label: "Inventory Grid", subtitle: "Coming later" }
    ]
  },
  {
    key: "LayoutLab",
    label: "Layout Lab",
    description: "頁面構圖預覽",
    slots: [
      { key: "layout-lab.previews", label: "Layout Previews", subtitle: "Dashboard, accounts and credit terminal sketches" }
    ]
  },
  {
    key: "DesktopLab",
    label: "Desktop Lab",
    description: "隔離桌面實驗",
    slots: [
      { key: "desktop-lab", label: "Desktop Mode Prototype", subtitle: "Wallpaper, dock and draggable windows" }
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
    resourceLabel: "Mock Account 目前資源",
    current: 68000,
    maximum: 100000,
    statusLabel: "NPC / 確認",
    footerLabel: "Local Prototype",
    variant: "cyan",
    compact: false
  });
  const [soulDemo, setSoulDemo] = useState<SoulDemoState>({
    title: "Soul Weapon",
    current: 615,
    maximum: 1000,
    bonusLabel: "攻擊力",
    bonusValue: "+20",
    state: "off",
    numberStyle: "aether",
    actionLabel: "全靈魂填滿"
  });
  const [gameNumberDemo, setGameNumberDemo] = useState({ value: "12,983", variant: "aether" as GameNumberVariant, size: "lg" as GameNumberSize, prefix: "", suffix: "", glow: true, outline: true });
  const [gaugeDemo, setGaugeDemo] = useState<GaugeDemoState>({ current: 66, maximum: 100, variant: "cyan", size: "md", showValue: true, showPercentage: true, label: "Aether Gauge", animated: true });
  const [previewVars, setPreviewVars] = useState({ glow: 1, radius: 8, gaugeHeight: 12, stroke: 1 });
  const [desktopPreferences, setDesktopPreferences] = useState<DesktopLabPreferences>(() => readDesktopPreferences());

  const appliedSettings = settings.workshopSettings;
  const selectedAsset = useMemo(() => getBuiltInVisualAsset(appliedSettings.faviconAssetId) ?? defaultAsset, [appliedSettings.faviconAssetId, defaultAsset]);
  const dashboardProfileSettings = appliedSettings.dashboardProfileImage;
  const dashboardProfileImage = useMemo(() => resolveDashboardProfileImage(dashboardProfileSettings), [dashboardProfileSettings]);
  const availableAssets = builtInVisualAssets.filter((asset) => asset.slotKeys.includes(visualSlots.favicon.key));
  const activeWorkshopArea = workshopAreas.find((area) => area.key === activeArea) ?? workshopAreas[0];
  const assetRegistry = getAetherAssetRegistry([appliedSettings.faviconAssetId, dashboardProfileSettings.imageId, desktopPreferences.wallpaper]);
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
        title="介面工坊"
        description="管理正式外觀，並隔離 UI Lab、Layout Lab 與 Desktop Lab 實驗。"
        actions={<Button type="button" variant="outline" onClick={() => updateWorkshopSettings(defaultAetherWorkshopSettings)} disabled={isDefault}>重設工坊</Button>}
      />
      <GameWindow title="Visual Configuration" description="Aether Workshop">
        <div className="aether-management-window aether-workshop" aria-live="polite">
          <AetherPanelHeader
            eyebrow="THEME EDITOR"
            title="Aether 介面工坊"
            subtitle="正式設定與實驗原型分區管理，避免 UI Lab 影響財務資料。"
            status={<AetherStatusIndicator label={settingsStatusLabel(status)} tone={settingsStatusTone(status)} />}
            summary="Server Settings"
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

          <div className="aether-master-detail">
            <div className="aether-list-pane" aria-label="視覺槽位" role="listbox">
              <WorkshopCatalog
                title={activeWorkshopArea.label}
                meta={`${activeWorkshopArea.slots.length} items`}
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
                Appearance 會同步到 User Settings；UI Lab、Layout Lab 與 Desktop Lab 只做隔離實驗，不寫入財務資料。
              </div>
            </div>

            <div className="aether-detail-pane">
              <div className="aether-detail-scroll">
                {selectedSlotKey === "assets.library" ? (
                  <AssetLibraryDetail assets={assetRegistry} failedPreviewIds={failedPreviewIds} onImageError={onImageError} />
                ) : selectedSlotKey === "ui-lab.resource-guide" ? (
                  <ResourceGuideLabDetail state={resourceGuideDemo} previewVars={previewVars} onPreviewVarsChange={setPreviewVars} onChange={setResourceGuideDemo} />
                ) : selectedSlotKey === "ui-lab.soul-interface" ? (
                  <SoulInterfaceLabDetail state={soulDemo} onChange={setSoulDemo} />
                ) : selectedSlotKey === "ui-lab.game-number" ? (
                  <GameNumberLabDetail state={gameNumberDemo} onChange={setGameNumberDemo} />
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
                  {isServerSettingSlot(selectedSlotKey) ? settingsStatusMessage(status, error) : "Local Prototype / Mock Only：此區不寫入 User Settings，也不呼叫 Finance API。"}
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
      <AetherSectionHeader title="Dashboard Appearance" meta="dashboard.profile-image" />
      <div className="grid gap-3 rounded-ui border border-border/60 bg-background/35 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-ui border border-primary/50 bg-background/70">
            <img className="h-full w-full object-contain p-2" src={resolvedImage.src} alt="" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">Dashboard Profile Image</h2>
            <p className="mt-1 text-sm text-muted">控制儀表板 Finance Profile 中央圖片，並由 User Settings 同步。</p>
          </div>
          <AetherStatusIndicator label="已同步" tone="success" />
        </div>
      </div>

      <AetherDefinitionList>
        <AetherDefinitionRow label="Slot Key" value="dashboard.profile-image" />
        <AetherDefinitionRow label="儲存方式" value="Server User Settings" />
        <AetherDefinitionRow label="目前圖片" value={resolvedImage.name} />
        <AetherDefinitionRow label="圖片路徑" value={<span className="break-all">{resolvedImage.src}</span>} />
      </AetherDefinitionList>

      <section className="grid gap-3">
        <AetherSectionHeader title="內建圖片" meta={`${dashboardProfileImageOptions.length} assets`} />
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
        <AetherSectionHeader title="自訂圖片 URL" meta="optional" />
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
        <Button type="button" variant="outline" onClick={onReset}>Reset</Button>
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
      <AetherSectionHeader title="Desktop Mode Status" meta="Local Prototype / Mock Only" />
      <div className="grid gap-4 rounded-ui border border-primary/45 bg-primary/8 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex rounded-full border border-warning/45 bg-warning/12 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-warning">
              Experimental
            </div>
            <h2 className="text-2xl font-black text-foreground">Desktop Mode</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              以 Wallpaper、Dock 與浮動視窗測試另一種操作模式。不會影響目前 Classic UI 與財務資料。
            </p>
          </div>
          <Link className="game-button game-button-primary ui-focus inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold" href="/desktop-lab">
            開啟實驗桌面
          </Link>
        </div>
        <AetherDefinitionList>
          <AetherDefinitionRow label="資料來源" value="Mock Data Only" />
          <AetherDefinitionRow label="隔離範圍" value="不修改 Backend / API / Ledger / Finance UI" />
          <AetherDefinitionRow label="測試互動" value="Wallpaper、Dock、Window 拖曳、最小化、關閉、Z-index" />
          <AetherDefinitionRow label="儲存方式" value="desktop-lab.preferences + desktop-lab.window-layout" />
          <AetherDefinitionRow label="目前桌布" value={currentWallpaper.label} />
          <AetherDefinitionRow label="Window Skin" value={preferences.windowSkin} />
          <AetherDefinitionRow label="Dock Style" value={preferences.dockStyle} />
          <AetherDefinitionRow label="HUD Style" value={preferences.hudStyle} />
          <AetherDefinitionRow label="開啟視窗" value={`${openWindows} open / ${minimizedWindows} minimized`} />
        </AetherDefinitionList>
        <div className="aether-ui-lab-controls">
          <label>Wallpaper<select value={preferences.wallpaper} onChange={(event) => updatePreference("wallpaper", event.target.value as DesktopWallpaperPreset)}>
            {desktopWallpaperPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <label>Window Skin<select value={preferences.windowSkin} onChange={(event) => updatePreference("windowSkin", event.target.value as DesktopWindowSkin)}>
            {desktopWindowSkinPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <label>Dock Style<select value={preferences.dockStyle} onChange={(event) => updatePreference("dockStyle", event.target.value as DesktopDockStyle)}>
            {desktopDockStylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <label>HUD Style<select value={preferences.hudStyle} onChange={(event) => updatePreference("hudStyle", event.target.value as DesktopHudStyle)}>
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
            Reset Desktop Layout
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearDesktopAppearanceStorage();
              onChange(defaultDesktopLabPreferences);
            }}
          >
            Reset Desktop Appearance
          </Button>
        </AetherActionBar>
        <p className="text-sm text-muted">此功能目前為 Prototype，只使用模擬資料。Reset Layout 不會清除外觀 preference。</p>
      </div>
    </>
  );
}

function AssetLibraryDetail({ assets, failedPreviewIds, onImageError }: { assets: ReturnType<typeof getAetherAssetRegistry>; failedPreviewIds: string[]; onImageError: (assetId: string) => void }) {
  return (
    <>
      <AetherSectionHeader title="Asset Registry" meta={`${assets.length} built-in assets`} />
      <div className="aether-asset-library">
        {assets.map((asset) => (
          <article key={asset.id} className="aether-asset-card">
            {asset.path.startsWith("/") ? (
              <PreviewIcon assetId={asset.id} src={asset.path} name={asset.name} failedPreviewIds={failedPreviewIds} onError={onImageError} />
            ) : (
              <span className="aether-css-asset-preview">{asset.id.slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <strong>{asset.name}</strong>
              <span>{asset.category} / {asset.builtIn ? "Built-in" : "External"}</span>
              <small>{asset.usage}</small>
              <small className="break-all">{asset.path}</small>
              <small>{asset.tags.join(", ")}</small>
              {asset.isCurrent && <AetherStatusIndicator label="Current" tone="success" />}
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">素材庫只索引專案內建合法素材；Window Skin 與 HUD 目前為 CSS preset，沒有圖片素材時不捏造資產。</p>
    </>
  );
}

function ResourceGuideLabDetail({ state, previewVars, onPreviewVarsChange, onChange }: { state: ResourceGuideDemoState; previewVars: { glow: number; radius: number; gaugeHeight: number; stroke: number }; onPreviewVarsChange: (vars: { glow: number; radius: number; gaugeHeight: number; stroke: number }) => void; onChange: (state: ResourceGuideDemoState) => void }) {
  const resetState = () => onChange({ title: "復活資金", description: "確認目前資源是否足以支援下一次任務。", resourceLabel: "Mock Account 目前資源", current: 68000, maximum: 100000, statusLabel: "NPC / 確認", footerLabel: "Local Prototype", variant: "cyan", compact: false });

  return (
    <>
      <WorkshopInspector title="Resource Guide Inspector" meta="Local Prototype / Mock Only" actions={<Button type="button" variant="outline" onClick={resetState}>Reset Preview</Button>}>
        <div className="aether-ui-lab-controls">
          <label>Title<input value={state.title} onChange={(event) => onChange({ ...state, title: event.target.value })} /></label>
          <label>Description<textarea value={state.description} onChange={(event) => onChange({ ...state, description: event.target.value })} /></label>
          <label>Resource Label<input value={state.resourceLabel} onChange={(event) => onChange({ ...state, resourceLabel: event.target.value })} /></label>
          <label>Current<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>Maximum<input type="number" value={state.maximum} onChange={(event) => onChange({ ...state, maximum: Number(event.target.value) })} /></label>
          <label>Status Label<input value={state.statusLabel} onChange={(event) => onChange({ ...state, statusLabel: event.target.value })} /></label>
          <label>Footer Label<input value={state.footerLabel} onChange={(event) => onChange({ ...state, footerLabel: event.target.value })} /></label>
          <label>Variant<select value={state.variant} onChange={(event) => onChange({ ...state, variant: event.target.value as "cyan" | "aether" | "warning" })}>
            <option value="cyan">cyan</option>
            <option value="aether">aether</option>
            <option value="warning">warning</option>
          </select></label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.compact} onChange={(event) => onChange({ ...state, compact: event.target.checked })} /> Compact</label>
        </div>
        <WorkshopPropertyGroup title="Safe CSS Variables">
          <WorkshopPropertyRow label="Glow"><input type="range" min="0" max="2" step="0.1" value={previewVars.glow} onChange={(event) => onPreviewVarsChange({ ...previewVars, glow: Number(event.target.value) })} /></WorkshopPropertyRow>
          <WorkshopPropertyRow label="Radius"><input type="range" min="4" max="18" value={previewVars.radius} onChange={(event) => onPreviewVarsChange({ ...previewVars, radius: Number(event.target.value) })} /></WorkshopPropertyRow>
          <WorkshopPropertyRow label="Gauge Height"><input type="range" min="6" max="18" value={previewVars.gaugeHeight} onChange={(event) => onPreviewVarsChange({ ...previewVars, gaugeHeight: Number(event.target.value) })} /></WorkshopPropertyRow>
          <WorkshopPropertyRow label="Number Stroke"><input type="range" min="0" max="2" step="0.25" value={previewVars.stroke} onChange={(event) => onPreviewVarsChange({ ...previewVars, stroke: Number(event.target.value) })} /></WorkshopPropertyRow>
        </WorkshopPropertyGroup>
      </WorkshopInspector>
      <WorkshopPreviewStage title="Live Preview" meta="Normal / edge cases" style={{ "--aether-glow-strength": previewVars.glow, "--aether-radius": `${previewVars.radius}px`, "--aether-gauge-height": `${previewVars.gaugeHeight}px`, "--aether-number-stroke": `${previewVars.stroke}px` } as CSSProperties}>
        <div className="aether-preview-matrix">
          {[
            ["Normal", state.current, state.maximum],
            ["Low Progress", 5, 100],
            ["Almost Complete", 95, 100],
            ["Completed", 100, 100],
            ["Overflow Test", 999999999, 100000]
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
  const resetState = () => onChange({ title: "Soul Weapon", current: 615, maximum: 1000, bonusLabel: "攻擊力", bonusValue: "+20", state: "off", numberStyle: "aether", actionLabel: "全靈魂填滿" });

  return (
    <>
      <WorkshopInspector title="Soul Interface Inspector" meta="Local Prototype / Mock Only" actions={<Button type="button" variant="outline" onClick={resetState}>Reset Preview</Button>}>
        <div className="aether-ui-lab-controls">
          <label>Title<input value={state.title} onChange={(event) => onChange({ ...state, title: event.target.value })} /></label>
          <label>Current<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>Maximum<input type="number" value={state.maximum} onChange={(event) => onChange({ ...state, maximum: Number(event.target.value) })} /></label>
          <label>Bonus Label<input value={state.bonusLabel} onChange={(event) => onChange({ ...state, bonusLabel: event.target.value })} /></label>
          <label>Bonus Value<input value={state.bonusValue} onChange={(event) => onChange({ ...state, bonusValue: event.target.value })} /></label>
          <label>Action Label<input value={state.actionLabel} onChange={(event) => onChange({ ...state, actionLabel: event.target.value })} /></label>
          <label>State<select value={state.state} onChange={(event) => onChange({ ...state, state: event.target.value as "off" | "active" | "complete" })}>
            <option value="off">off</option>
            <option value="active">active</option>
            <option value="complete">complete</option>
          </select></label>
          <label>Number Style<select value={state.numberStyle} onChange={(event) => onChange({ ...state, numberStyle: event.target.value as "default" | "aether" | "damage" })}>
            <option value="default">default</option>
            <option value="aether">aether</option>
            <option value="damage">damage</option>
          </select></label>
        </div>
      </WorkshopInspector>
      <WorkshopPreviewStage title="Live Preview" meta="Number overflow cases">
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

function GameNumberLabDetail({ state, onChange }: { state: { value: string; variant: GameNumberVariant; size: GameNumberSize; prefix: string; suffix: string; glow: boolean; outline: boolean }; onChange: (state: { value: string; variant: GameNumberVariant; size: GameNumberSize; prefix: string; suffix: string; glow: boolean; outline: boolean }) => void }) {
  return (
    <>
      <WorkshopInspector title="Game Number Inspector" meta="Local Prototype / Mock Only" actions={<Button type="button" variant="outline" onClick={() => onChange({ value: "12,983", variant: "aether", size: "lg", prefix: "", suffix: "", glow: true, outline: true })}>Reset Preview</Button>}>
        <div className="aether-ui-lab-controls">
          <label>Value<input value={state.value} onChange={(event) => onChange({ ...state, value: event.target.value })} /></label>
          <label>Prefix<input value={state.prefix} onChange={(event) => onChange({ ...state, prefix: event.target.value })} /></label>
          <label>Suffix<input value={state.suffix} onChange={(event) => onChange({ ...state, suffix: event.target.value })} /></label>
          <label>Variant<select value={state.variant} onChange={(event) => onChange({ ...state, variant: event.target.value as GameNumberVariant })}>
            {(["finance", "aether", "damage", "success", "warning"] as GameNumberVariant[]).map((variant) => <option key={variant} value={variant}>{variant}</option>)}
          </select></label>
          <label>Size<select value={state.size} onChange={(event) => onChange({ ...state, size: event.target.value as GameNumberSize })}>
            {(["sm", "md", "lg", "xl"] as GameNumberSize[]).map((size) => <option key={size} value={size}>{size}</option>)}
          </select></label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.glow} onChange={(event) => onChange({ ...state, glow: event.target.checked })} /> Glow</label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.outline} onChange={(event) => onChange({ ...state, outline: event.target.checked })} /> Outline</label>
        </div>
      </WorkshopInspector>
      <WorkshopPreviewStage title="Preview Matrix" meta="Game format, not finance format">
        <div className="game-number-matrix">
          {[state.value, "615", "1,000", "12,983", "100,000", "999,999,999", "-24,495"].map((value, index) => (
            <GameNumber key={`${index}-${value}`} value={value} variant={state.variant} size={state.size} prefix={state.prefix} suffix={state.suffix} glow={state.glow} outline={state.outline} />
          ))}
        </div>
      </WorkshopPreviewStage>
    </>
  );
}

function GaugeLabDetail({ state, onChange }: { state: GaugeDemoState; onChange: (state: GaugeDemoState) => void }) {
  return (
    <>
      <WorkshopInspector title="Gauge Inspector" meta="Local Prototype / Mock Only" actions={<Button type="button" variant="outline" onClick={() => onChange({ current: 66, maximum: 100, variant: "cyan", size: "md", showValue: true, showPercentage: true, label: "Aether Gauge", animated: true })}>Reset Preview</Button>}>
        <div className="aether-ui-lab-controls">
          <label>Label<input value={state.label} onChange={(event) => onChange({ ...state, label: event.target.value })} /></label>
          <label>Current<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>Maximum<input type="number" value={state.maximum} onChange={(event) => onChange({ ...state, maximum: Number(event.target.value) })} /></label>
          <label>Variant<select value={state.variant} onChange={(event) => onChange({ ...state, variant: event.target.value as GameGaugeVariant })}>
            {(["cyan", "purple", "green", "yellow", "red"] as GameGaugeVariant[]).map((variant) => <option key={variant} value={variant}>{variant}</option>)}
          </select></label>
          <label>Size<select value={state.size} onChange={(event) => onChange({ ...state, size: event.target.value as "sm" | "md" | "lg" })}>
            {(["sm", "md", "lg"] as const).map((size) => <option key={size} value={size}>{size}</option>)}
          </select></label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.showValue} onChange={(event) => onChange({ ...state, showValue: event.target.checked })} /> Show value</label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.showPercentage} onChange={(event) => onChange({ ...state, showPercentage: event.target.checked })} /> Show percentage</label>
          <label className="aether-checkbox-row"><input type="checkbox" checked={state.animated} onChange={(event) => onChange({ ...state, animated: event.target.checked })} /> Animated</label>
        </div>
      </WorkshopInspector>
      <WorkshopPreviewStage title="Gauge Preview" meta="ARIA progressbar">
        <div className="grid gap-4">
          <GameGauge {...state} />
          <GameGauge {...state} current={0} maximum={0} label="Maximum Zero" />
          <GameGauge {...state} current={999} maximum={100} label="Overflow Clamp" />
        </div>
      </WorkshopPreviewStage>
    </>
  );
}

function FutureComponentsDetail({ selectedKey }: { selectedKey: WorkshopSlotKey }) {
  const items = [
    ["Mission Panel", "任務列表與狀態徽章，下一階段再做互動。"],
    ["Notification Panel", "浮動通知、Toast 與系統提示。"],
    ["Inventory Grid", "格狀道具欄與財務資源格。"]
  ];
  return (
    <>
      <AetherSectionHeader title="Future Components" meta={selectedKey} />
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
    ["Dashboard Profile Layout", "正式 Dashboard 已使用", "Active", "Avatar + resource bars + mission hints", "Desktop / Mobile"],
    ["Account Overview Layout", "正式 Accounts 資訊層級", "Active", "Summary card + compact account slots", "Desktop / Mobile"],
    ["Credit Terminal Layout", "信用卡主從式布局", "Prototype", "Statement cards + import console", "Desktop first"],
    ["Desktop Workspace Layout", "Desktop Lab 隔離桌面", "Experimental", "Wallpaper + HUD + Windows + Dock", "Desktop"]
  ];

  return (
    <>
      <AetherSectionHeader title="Layout Lab" meta="Structure sketches" />
      <div className="aether-layout-lab-grid">
        {previews.map(([title, purpose, status, description, viewport]) => (
          <article key={title} className="aether-layout-preview-card">
            <span>{title.slice(0, 2).toUpperCase()}</span>
            <strong>{title}</strong>
            <p>{description}</p>
            <small>{purpose}</small>
            <small>狀態：{status}</small>
            <small>適合：{viewport}</small>
            <small>Mock / Static Preview</small>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">Layout Lab 只做構圖比較；成熟後才逐頁搬進正式 Finance UI。</p>
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

function slotSubtitle(slotKey: WorkshopSlotKey, settings: AetherWorkshopSettings, savedAssetName: string, dashboardImageName: string, fallback: string) {
  if (slotKey === visualSlots.favicon.key) return `目前：${savedAssetName}`;
  if (slotKey === "dashboard.profile-image") return `目前：${dashboardImageName}`;
  if (slotKey === "desktop-lab") return "Prototype / Mock Data Only";
  if (slotKey === visualSlots.headerDivider.key) return settings.headerDividerEnabled ? "頁首光效啟用" : "頁首光效停用";
  return fallback;
}

function slotStatusLabel(slotKey: WorkshopSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "同步";
  if (slotKey === "dashboard.profile-image") return "同步";
  if (slotKey === "desktop-lab") return "Experimental";
  if (slotKey.startsWith("ui-lab.") || slotKey === "layout-lab.previews") return slotKey === "ui-lab.mission-panel" || slotKey === "ui-lab.notification-panel" || slotKey === "ui-lab.inventory-grid" ? "Coming Later" : "Mock";
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
