"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";

export type DashboardProfileImageId = "aether-orb" | "aether-favicon" | "custom";

export type DashboardProfileImageSettings = {
  imageId: DashboardProfileImageId;
  customImageUrl: string;
};

export type DashboardProfileImageOption = {
  id: DashboardProfileImageId;
  name: string;
  src: string;
  description: string;
};

const storageKey = "pfos.dashboardProfileImage";

export const dashboardProfileImageOptions: DashboardProfileImageOption[] = [
  {
    id: "aether-orb",
    name: "Aether Core",
    src: "/aether/effects/purple-energy-divider.webp",
    description: "Default Aether energy mark for the Dashboard profile."
  },
  {
    id: "aether-favicon",
    name: "Aether Icon",
    src: "/aether/branding/aether-favicon.png",
    description: "Compact icon for a minimal Dashboard profile."
  }
];

export const defaultDashboardProfileImageSettings: DashboardProfileImageSettings = {
  imageId: "aether-orb",
  customImageUrl: ""
};

export function normalizeDashboardProfileImageSettings(value: unknown): DashboardProfileImageSettings {
  if (!value || typeof value !== "object") return defaultDashboardProfileImageSettings;
  const candidate = value as Partial<DashboardProfileImageSettings>;
  const imageId = candidate.imageId === "aether-favicon" || candidate.imageId === "custom" || candidate.imageId === "aether-orb"
    ? candidate.imageId
    : defaultDashboardProfileImageSettings.imageId;
  const customImageUrl = typeof candidate.customImageUrl === "string" ? candidate.customImageUrl.trim() : "";
  return { imageId, customImageUrl };
}

export function resolveDashboardProfileImage(settings: DashboardProfileImageSettings) {
  if (settings.imageId === "custom" && settings.customImageUrl) {
    return {
      id: "custom",
      name: "自訂圖片",
      src: settings.customImageUrl,
      description: "User supplied Dashboard profile image."
    };
  }

  return dashboardProfileImageOptions.find((option) => option.id === settings.imageId) ?? dashboardProfileImageOptions[0];
}

export function useDashboardProfileImageSettings() {
  const [settings, setSettings] = useState<DashboardProfileImageSettings>(defaultDashboardProfileImageSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setSettings(normalizeDashboardProfileImageSettings(raw ? JSON.parse(raw) : null));
    } catch {
      setSettings(defaultDashboardProfileImageSettings);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const updateSettings = (next: DashboardProfileImageSettings) => {
    const normalized = normalizeDashboardProfileImageSettings(next);
    setSettings(normalized);
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  };

  const resetSettings = () => updateSettings(defaultDashboardProfileImageSettings);

  const resolvedImage = useMemo(() => resolveDashboardProfileImage(settings), [settings]);

  return { settings, resolvedImage, isLoaded, updateSettings, resetSettings };
}
