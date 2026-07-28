"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { builtInVisualAssets, getBuiltInVisualAsset, getDefaultVisualAsset } from "@/lib/aether/visual-slots";
import { defaultAetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { useSettings } from "@/lib/settings/user-settings";

export function FaviconPicker() {
  const { settings, status, error, updateWorkshopSettings, retry } = useSettings();
  const [failedPreviewIds, setFailedPreviewIds] = useState<string[]>([]);
  const selectedAsset = useMemo(() => getBuiltInVisualAsset(settings.workshopSettings.faviconAssetId) ?? getDefaultVisualAsset(), [settings.workshopSettings.faviconAssetId]);

  const onImageError = (assetId: string) => {
    setFailedPreviewIds((current) => current.includes(assetId) ? current : [...current, assetId]);
  };

  return (
    <Card className="overflow-hidden">
      <CardTitle title="品牌圖示" description="Branding slots" />
      <div className="grid gap-5 p-4">
        <section className="grid gap-3 rounded-ui border border-border/65 bg-background/35 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Favicon</h2>
              <p className="mt-1 text-sm text-muted">選擇瀏覽器分頁與應用程式圖示。</p>
            </div>
            <div className="flex items-center gap-3 rounded-ui border border-border/70 bg-surface-muted/65 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">目前圖示</span>
              <img className="h-8 w-8 rounded border border-border/70 bg-background object-contain p-1" src={selectedAsset.src} alt={`${selectedAsset.name} preview`} onError={() => onImageError(selectedAsset.id)} />
            </div>
          </div>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-foreground">內建素材</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {builtInVisualAssets.map((asset) => {
                const isSelected = selectedAsset.id === asset.id;
                const hasFailedPreview = failedPreviewIds.includes(asset.id);

                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`ui-focus grid gap-3 rounded-ui border p-4 text-left transition duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_18px_rgba(66,198,229,0.18)]"
                        : "border-border/70 bg-surface-muted/45 hover:border-primary/50 hover:bg-surface-muted/70"
                    }`}
                    onClick={() => updateWorkshopSettings({ faviconAssetId: asset.id })}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-ui border border-border/75 bg-background/80">
                        {hasFailedPreview ? <span className="text-xs font-bold text-muted">ICON</span> : <img className="h-8 w-8 object-contain" src={asset.src} alt={`${asset.name} preview`} onError={() => onImageError(asset.id)} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-foreground">{asset.name}</p>
                          {isSelected && <Badge tone="success">已同步</Badge>}
                        </div>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{asset.format} / 內建素材</p>
                        <p className="mt-2 truncate text-xs text-muted">{asset.src}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm ${status === "error" ? "text-warning" : "text-muted"}`} aria-live="polite">{settingsStatusText(status, error)}</p>
            <div className="flex flex-wrap gap-2">
              {status === "error" && <Button type="button" variant="outline" onClick={retry}>重試</Button>}
              <Button type="button" variant="outline" onClick={() => updateWorkshopSettings(defaultAetherWorkshopSettings)} disabled={selectedAsset.id === getDefaultVisualAsset().id}>重設</Button>
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}

function settingsStatusText(status: string, error: string) {
  if (status === "saving") return "正在同步...";
  if (status === "saved") return "已同步到伺服器。";
  if (status === "error") return error || "同步失敗，請稍後重試。";
  return "設定會自動同步到 User Settings。";
}
