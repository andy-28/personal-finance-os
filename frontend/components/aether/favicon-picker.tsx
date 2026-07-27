"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { builtInVisualAssets, getBuiltInVisualAsset, getDefaultVisualAsset } from "@/lib/aether/visual-slots";
import { loadAetherWorkshopSettings, resetAetherWorkshopSettings, saveAetherWorkshopSettings } from "@/lib/aether/workshop-settings";

export function FaviconPicker() {
  const [selectedAssetId, setSelectedAssetId] = useState(getDefaultVisualAsset().id);
  const [savedAssetId, setSavedAssetId] = useState(getDefaultVisualAsset().id);
  const [message, setMessage] = useState("");
  const [hasStorageError, setHasStorageError] = useState(false);
  const [failedPreviewIds, setFailedPreviewIds] = useState<string[]>([]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const settings = loadAetherWorkshopSettings();
      setSelectedAssetId(settings.faviconAssetId);
      setSavedAssetId(settings.faviconAssetId);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const selectedAsset = useMemo(() => getBuiltInVisualAsset(selectedAssetId) ?? getDefaultVisualAsset(), [selectedAssetId]);
  const savedAsset = useMemo(() => getBuiltInVisualAsset(savedAssetId) ?? getDefaultVisualAsset(), [savedAssetId]);
  const hasChanges = selectedAsset.id !== savedAsset.id;

  const onApply = () => {
    const result = saveAetherWorkshopSettings({ ...loadAetherWorkshopSettings(), faviconAssetId: selectedAsset.id });
    setSavedAssetId(result.settings.faviconAssetId);
    setSelectedAssetId(result.settings.faviconAssetId);
    setHasStorageError(!result.ok);
    setMessage(result.ok ? "Favicon 已更新。" : "無法儲存本機設定，已先套用本次預覽。");
  };

  const onReset = () => {
    const result = resetAetherWorkshopSettings();
    setSavedAssetId(result.settings.faviconAssetId);
    setSelectedAssetId(result.settings.faviconAssetId);
    setHasStorageError(!result.ok);
    setMessage(result.ok ? "已恢復預設 favicon。" : "無法儲存本機設定，已先恢復本次預覽。");
  };

  const onImageError = (assetId: string) => {
    setFailedPreviewIds((current) => current.includes(assetId) ? current : [...current, assetId]);
  };

  return (
    <Card className="overflow-hidden">
      <CardTitle title="系統品牌" description="Branding slots" />
      <div className="grid gap-5 p-4">
        <section className="grid gap-3 rounded-ui border border-border/65 bg-background/35 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Favicon</h2>
              <p className="mt-1 text-sm text-muted">從內建素材切換瀏覽器分頁圖示。</p>
            </div>
            <div className="flex items-center gap-3 rounded-ui border border-border/70 bg-surface-muted/65 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">目前圖示</span>
              <img className="h-8 w-8 rounded border border-border/70 bg-background object-contain p-1" src={savedAsset.src} alt={`${savedAsset.name} 預覽`} onError={() => onImageError(savedAsset.id)} />
            </div>
          </div>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-foreground">可用素材</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {builtInVisualAssets.map((asset) => {
                const isSelected = selectedAsset.id === asset.id;
                const isSaved = savedAsset.id === asset.id;
                const hasFailedPreview = failedPreviewIds.includes(asset.id);

                return (
                  <label
                    key={asset.id}
                    className={`ui-focus grid cursor-pointer gap-3 rounded-ui border p-4 transition duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_18px_rgba(66,198,229,0.18)]"
                        : "border-border/70 bg-surface-muted/45 hover:border-primary/50 hover:bg-surface-muted/70"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="faviconAsset"
                      value={asset.id}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedAssetId(asset.id);
                        setMessage("");
                      }}
                    />
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-ui border border-border/75 bg-background/80">
                        {hasFailedPreview ? (
                          <span className="text-xs font-bold text-muted">ICON</span>
                        ) : (
                          <img className="h-8 w-8 object-contain" src={asset.src} alt={`${asset.name} 預覽`} onError={() => onImageError(asset.id)} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-foreground">{asset.name}</p>
                          {isSaved && <Badge tone="success">目前使用</Badge>}
                          {isSelected && !isSaved && <Badge tone="credit">待套用</Badge>}
                        </div>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{asset.format} / 內建素材</p>
                        <p className="mt-2 truncate text-xs text-muted">{asset.src}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm ${hasStorageError ? "text-warning" : "text-muted"}`} aria-live="polite">{message || "選擇素材後按套用，重新整理後仍會保留。"}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onReset} disabled={savedAsset.id === getDefaultVisualAsset().id && selectedAsset.id === getDefaultVisualAsset().id}>恢復預設</Button>
              <Button type="button" onClick={onApply} disabled={!hasChanges}>套用</Button>
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}
