"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AetherEnergyDivider } from "@/components/ui/aether-effect";
import { Button } from "@/components/ui/button";
import { ResourceGuide, SoulInterface, gameUiAccentStyles, type GameUiAccent } from "@/components/game-ui";
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
import {
  dashboardProfileImageOptions,
  defaultDashboardProfileImageSettings,
  resolveDashboardProfileImage,
  type DashboardProfileImageSettings
} from "@/lib/aether/dashboard-profile-settings";
import { builtInVisualAssets, getBuiltInVisualAsset, getDefaultVisualAsset, visualSlots, type VisualSlotKey } from "@/lib/aether/visual-slots";
import { defaultAetherWorkshopSettings, type AetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { clearDesktopLabStorage, defaultDesktopLayout, readDesktopLayout, readDesktopWallpaper } from "@/lib/desktop-lab/storage";
import { desktopWallpapers } from "@/components/desktop-lab/desktop-mock-data";
import { useSettings, type SettingsSyncStatus } from "@/lib/settings/user-settings";

type WorkshopAreaKey = "Appearance" | "Assets" | "UiLab" | "LayoutLab" | "DesktopLab";
type WorkshopSlotKey =
  | VisualSlotKey
  | "dashboard.profile-image"
  | "assets.library"
  | "ui-lab.resource-guide"
  | "ui-lab.soul-interface"
  | "ui-lab.future"
  | "layout-lab.previews"
  | "desktop-lab";

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
      { key: "ui-lab.future", label: "Future Components", subtitle: "Game numbers, gauges and mission panels" }
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
  const [resourceGuideDemo, setResourceGuideDemo] = useState({ title: "復活資金", current: 68000, target: 100000, accent: "cyan" as GameUiAccent });
  const [soulDemo, setSoulDemo] = useState({ value: 615, max: 1000 });

  const appliedSettings = settings.workshopSettings;
  const selectedAsset = useMemo(() => getBuiltInVisualAsset(appliedSettings.faviconAssetId) ?? defaultAsset, [appliedSettings.faviconAssetId, defaultAsset]);
  const dashboardProfileSettings = appliedSettings.dashboardProfileImage;
  const dashboardProfileImage = useMemo(() => resolveDashboardProfileImage(dashboardProfileSettings), [dashboardProfileSettings]);
  const availableAssets = builtInVisualAssets.filter((asset) => asset.slotKeys.includes(visualSlots.favicon.key));
  const activeWorkshopArea = workshopAreas.find((area) => area.key === activeArea) ?? workshopAreas[0];
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
              <AetherSectionHeader title={activeWorkshopArea.label} meta={`${activeWorkshopArea.slots.length} items`} />
              <p className="text-sm text-muted">{activeWorkshopArea.description}</p>
              <div className="grid gap-2">
                {activeWorkshopArea.slots.map((slot) => (
                  <AetherListRow
                    key={slot.key}
                    title={slot.label}
                    subtitle={`${slot.key} / ${slotSubtitle(slot.key, appliedSettings, selectedAsset.name, dashboardProfileImage.name, slot.subtitle)}`}
                    meta={<AetherStatusIndicator label={slotStatusLabel(slot.key, appliedSettings)} tone={slotStatusTone(slot.key, appliedSettings)} />}
                    isActive={selectedSlotKey === slot.key}
                    onClick={() => setSelectedSlotKey(slot.key)}
                  />
                ))}
              </div>
              <div className="rounded-ui border border-border/60 bg-background/30 p-3 text-sm text-muted">
                Appearance 會同步到 User Settings；UI Lab、Layout Lab 與 Desktop Lab 只做隔離實驗，不寫入財務資料。
              </div>
            </div>

            <div className="aether-detail-pane">
              <div className="aether-detail-scroll">
                {selectedSlotKey === "desktop-lab" ? (
                  <DesktopLabSlotDetail />
                ) : selectedSlotKey === "assets.library" ? (
                  <AssetLibraryDetail failedPreviewIds={failedPreviewIds} onImageError={onImageError} />
                ) : selectedSlotKey === "ui-lab.resource-guide" ? (
                  <ResourceGuideLabDetail state={resourceGuideDemo} onChange={setResourceGuideDemo} />
                ) : selectedSlotKey === "ui-lab.soul-interface" ? (
                  <SoulInterfaceLabDetail state={soulDemo} onChange={setSoulDemo} />
                ) : selectedSlotKey === "ui-lab.future" ? (
                  <FutureComponentsDetail />
                ) : selectedSlotKey === "layout-lab.previews" ? (
                  <LayoutLabDetail />
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

                <p className={`text-sm ${status === "error" ? "text-warning" : "text-muted"}`}>
                  {settingsStatusMessage(status, error)}
                </p>

                <AetherActionBar>
                  {status === "error" && <Button type="button" variant="outline" onClick={retry}>重試同步</Button>}
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
            <p className="mt-1 text-sm text-muted">控制儀錶板 Finance Profile 中央圖片，並由 User Settings 同步。</p>
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

function DesktopLabSlotDetail() {
  const storedWallpaper = readDesktopWallpaper();
  const storedLayout = readDesktopLayout();
  const openWindows = Object.values(storedLayout).filter((windowState) => windowState.isOpen).length;
  const minimizedWindows = Object.values(storedLayout).filter((windowState) => windowState.isOpen && windowState.isMinimized).length;
  const currentWallpaper = desktopWallpapers.find((wallpaper) => wallpaper.id === storedWallpaper) ?? desktopWallpapers[0];

  return (
    <>
      <AetherSectionHeader title="DESKTOP MODE" meta="Experimental Desktop Lab" />
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
          <AetherDefinitionRow label="儲存方式" value="desktop-lab.* localStorage namespace" />
          <AetherDefinitionRow label="目前桌布" value={currentWallpaper.name} />
          <AetherDefinitionRow label="開啟視窗" value={`${openWindows} open / ${minimizedWindows} minimized`} />
        </AetherDefinitionList>
        <AetherActionBar>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearDesktopLabStorage();
              window.dispatchEvent(new StorageEvent("storage", { key: "desktop-lab.window-layout", newValue: JSON.stringify(defaultDesktopLayout()) }));
            }}
          >
            重設 Desktop Lab
          </Button>
        </AetherActionBar>
        <p className="text-sm text-muted">此功能目前為 Prototype，只使用模擬資料。成熟後再評估是否升級成正式 Shell。</p>
      </div>
    </>
  );
}

function AssetLibraryDetail({ failedPreviewIds, onImageError }: { failedPreviewIds: string[]; onImageError: (assetId: string) => void }) {
  const dashboardAssets = dashboardProfileImageOptions.map((asset) => ({ id: asset.id, name: asset.name, src: asset.src, format: "Image", usage: "Dashboard Profile" }));
  const visualAssets = builtInVisualAssets.map((asset) => ({ id: asset.id, name: asset.name, src: asset.src, format: asset.format, usage: asset.slotKeys.join(", ") }));
  const wallpaperAssets = desktopWallpapers.map((wallpaper) => ({ id: wallpaper.id, name: wallpaper.name, src: "", format: "CSS", usage: "Desktop Lab wallpaper" }));
  const allAssets = [...visualAssets, ...dashboardAssets, ...wallpaperAssets];

  return (
    <>
      <AetherSectionHeader title="Asset Library" meta={`${allAssets.length} assets`} />
      <div className="aether-asset-library">
        {allAssets.map((asset) => (
          <article key={asset.id} className="aether-asset-card">
            {asset.src ? (
              <PreviewIcon assetId={asset.id} src={asset.src} name={asset.name} failedPreviewIds={failedPreviewIds} onError={onImageError} />
            ) : (
              <span className="aether-css-asset-preview">{asset.id.slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <strong>{asset.name}</strong>
              <span>{asset.format}</span>
              <small>{asset.usage}</small>
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">素材庫只索引內建資產；目前不新增上傳流程，也不使用第三方遊戲素材。</p>
    </>
  );
}

function ResourceGuideLabDetail({ state, onChange }: { state: { title: string; current: number; target: number; accent: GameUiAccent }; onChange: (state: { title: string; current: number; target: number; accent: GameUiAccent }) => void }) {
  return (
    <>
      <AetherSectionHeader title="Resource Guide" meta="UI Lab / Mock only" />
      <div className="aether-ui-lab">
        <div className="aether-ui-lab-controls">
          <label>標題<input value={state.title} onChange={(event) => onChange({ ...state, title: event.target.value })} /></label>
          <label>目前值<input type="number" value={state.current} onChange={(event) => onChange({ ...state, current: Number(event.target.value) })} /></label>
          <label>目標值<input type="number" value={state.target} onChange={(event) => onChange({ ...state, target: Number(event.target.value) })} /></label>
          <label>色系<select value={state.accent} onChange={(event) => onChange({ ...state, accent: event.target.value as GameUiAccent })}>
            {(Object.keys(gameUiAccentStyles) as GameUiAccent[]).map((accent) => <option key={accent} value={accent}>{gameUiAccentStyles[accent].label}</option>)}
          </select></label>
        </div>
        <ResourceGuide
          title={state.title || "復活資金"}
          description="確認目前資源是否足以支援下一次任務。這裡只使用 UI Lab mock 資料。"
          sourceLabel="Mock Account 目前資源"
          current={state.current}
          target={state.target}
          accent={state.accent}
        />
      </div>
    </>
  );
}

function SoulInterfaceLabDetail({ state, onChange }: { state: { value: number; max: number }; onChange: (state: { value: number; max: number }) => void }) {
  return (
    <>
      <AetherSectionHeader title="Soul Interface" meta="UI Lab / Mock only" />
      <div className="aether-ui-lab aether-ui-lab-compact">
        <div className="aether-ui-lab-controls">
          <label>目前值<input type="number" value={state.value} onChange={(event) => onChange({ ...state, value: Number(event.target.value) })} /></label>
          <label>最大值<input type="number" value={state.max} onChange={(event) => onChange({ ...state, max: Number(event.target.value) })} /></label>
        </div>
        <SoulInterface value={state.value} max={state.max} />
      </div>
    </>
  );
}

function FutureComponentsDetail() {
  const items = ["Game Number", "Gauge", "Notice Panel", "Mission Panel", "Inventory Grid"];
  return (
    <>
      <AetherSectionHeader title="Future Components" meta="Backlog preview" />
      <div className="aether-layout-lab-grid">
        {items.map((item) => (
          <article key={item} className="aether-layout-preview-card">
            <span>{item.slice(0, 2).toUpperCase()}</span>
            <strong>{item}</strong>
            <p>預留元件，不連接 API，不影響正式頁面。</p>
          </article>
        ))}
      </div>
    </>
  );
}

function LayoutLabDetail() {
  const previews = [
    ["Dashboard Profile Layout", "Avatar + resource bars + mission hints"],
    ["Account Overview Layout", "Summary card + compact account slots"],
    ["Credit Terminal Layout", "Statement cards + import console"]
  ];

  return (
    <>
      <AetherSectionHeader title="Layout Lab" meta="Structure sketches" />
      <div className="aether-layout-lab-grid">
        {previews.map(([title, description]) => (
          <article key={title} className="aether-layout-preview-card">
            <span>{title.slice(0, 2).toUpperCase()}</span>
            <strong>{title}</strong>
            <p>{description}</p>
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
  if (slotKey === "ui-lab.resource-guide" || slotKey === "ui-lab.soul-interface" || slotKey === "ui-lab.future" || slotKey === "layout-lab.previews") return "Mock";
  if (slotKey === "assets.library") return "索引";
  return settings.headerDividerEnabled ? "啟用" : "停用";
}

function slotStatusTone(slotKey: WorkshopSlotKey, settings: AetherWorkshopSettings) {
  if (slotKey === visualSlots.favicon.key) return "credit";
  if (slotKey === "dashboard.profile-image") return "success";
  if (slotKey === "desktop-lab") return "warning";
  if (slotKey === "ui-lab.resource-guide" || slotKey === "ui-lab.soul-interface" || slotKey === "ui-lab.future" || slotKey === "layout-lab.previews") return "neutral";
  if (slotKey === "assets.library") return "credit";
  return settings.headerDividerEnabled ? "success" : "neutral";
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
