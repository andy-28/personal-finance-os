import { getBuiltInVisualAsset, visualSlots } from "./visual-slots";

export interface AetherWorkshopSettings {
  faviconAssetId: string;
}

export const aetherWorkshopStorageKey = "personal-finance-os:aether-workshop";
export const aetherWorkshopSettingsChangedEvent = "aether-workshop-settings-change";

export const defaultAetherWorkshopSettings: AetherWorkshopSettings = {
  faviconAssetId: visualSlots.favicon.defaultAssetId
};

export function normalizeAetherWorkshopSettings(value: unknown): AetherWorkshopSettings {
  if (!value || typeof value !== "object") return defaultAetherWorkshopSettings;

  const candidate = value as Partial<AetherWorkshopSettings>;
  const faviconAssetId = typeof candidate.faviconAssetId === "string" && getBuiltInVisualAsset(candidate.faviconAssetId)
    ? candidate.faviconAssetId
    : defaultAetherWorkshopSettings.faviconAssetId;

  return { faviconAssetId };
}

export function loadAetherWorkshopSettings(): AetherWorkshopSettings {
  if (typeof window === "undefined") return defaultAetherWorkshopSettings;

  try {
    const raw = window.localStorage.getItem(aetherWorkshopStorageKey);
    if (!raw) return defaultAetherWorkshopSettings;
    return normalizeAetherWorkshopSettings(JSON.parse(raw));
  } catch {
    return defaultAetherWorkshopSettings;
  }
}

export function saveAetherWorkshopSettings(settings: AetherWorkshopSettings) {
  if (typeof window === "undefined") return { ok: false, settings: defaultAetherWorkshopSettings };

  const normalized = normalizeAetherWorkshopSettings(settings);

  try {
    window.localStorage.setItem(aetherWorkshopStorageKey, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent<AetherWorkshopSettings>(aetherWorkshopSettingsChangedEvent, { detail: normalized }));
    return { ok: true, settings: normalized };
  } catch {
    window.dispatchEvent(new CustomEvent<AetherWorkshopSettings>(aetherWorkshopSettingsChangedEvent, { detail: normalized }));
    return { ok: false, settings: normalized };
  }
}

export function resetAetherWorkshopSettings() {
  return saveAetherWorkshopSettings(defaultAetherWorkshopSettings);
}
