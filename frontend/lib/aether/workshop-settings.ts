import { defaultDashboardProfileImageSettings, normalizeDashboardProfileImageSettings, type DashboardProfileImageSettings } from "./dashboard-profile-settings";
import { getBuiltInVisualAsset, visualSlots } from "./visual-slots";

export interface AetherWorkshopSettings {
  faviconAssetId: string;
  headerDividerEnabled: boolean;
  dashboardProfileImage: DashboardProfileImageSettings;
}

export const defaultAetherWorkshopSettings: AetherWorkshopSettings = {
  faviconAssetId: visualSlots.favicon.defaultAssetId,
  headerDividerEnabled: visualSlots.headerDivider.defaultEnabled,
  dashboardProfileImage: defaultDashboardProfileImageSettings
};

export function normalizeAetherWorkshopSettings(value: unknown): AetherWorkshopSettings {
  if (!value || typeof value !== "object") return defaultAetherWorkshopSettings;

  const candidate = value as Partial<AetherWorkshopSettings>;
  const faviconAssetId = typeof candidate.faviconAssetId === "string" && getBuiltInVisualAsset(candidate.faviconAssetId)
    ? candidate.faviconAssetId
    : defaultAetherWorkshopSettings.faviconAssetId;
  const headerDividerEnabled = typeof candidate.headerDividerEnabled === "boolean"
    ? candidate.headerDividerEnabled
    : defaultAetherWorkshopSettings.headerDividerEnabled;
  const dashboardProfileImage = normalizeDashboardProfileImageSettings(candidate.dashboardProfileImage);

  return { faviconAssetId, headerDividerEnabled, dashboardProfileImage };
}
