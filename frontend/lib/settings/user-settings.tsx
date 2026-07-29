"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/auth-context";
import { apiFetch, problemMessage, type UserGoalSettingsDto, type UserSettingsDto, type UserSettingsPatchRequest, type UserVisualSettingsDto, type UserWorkshopSettingsDto } from "@/lib/api-client";
import { defaultAetherWorkshopSettings, normalizeAetherWorkshopSettings } from "@/lib/aether/workshop-settings";

export type SettingsSyncStatus = "idle" | "loading" | "saving" | "saved" | "error";

const defaultGoalSettings: UserGoalSettingsDto = {
  goalBars: [],
  collapsed: false,
  displayStyle: "compact"
};

const defaultVisualSettings: UserVisualSettingsDto = {
  headerDividerAssetId: "purple-energy-divider"
};

function defaultUserSettings(userId = ""): UserSettingsDto {
  return {
    id: "",
    userId,
    theme: "Aether",
    workshopSettings: defaultAetherWorkshopSettings,
    visualSettings: defaultVisualSettings,
    goalSettings: defaultGoalSettings,
    createdAtUtc: "",
    updatedAtUtc: ""
  };
}

function normalizeSettings(settings: UserSettingsDto | null | undefined, userId = ""): UserSettingsDto {
  const fallback = defaultUserSettings(userId);
  if (!settings) return fallback;

  return {
    ...fallback,
    ...settings,
    theme: settings.theme || fallback.theme,
    workshopSettings: normalizeAetherWorkshopSettings(settings.workshopSettings),
    visualSettings: { ...fallback.visualSettings, ...(settings.visualSettings ?? {}) },
    goalSettings: {
      ...fallback.goalSettings,
      ...(settings.goalSettings ?? {}),
      goalBars: Array.isArray(settings.goalSettings?.goalBars) ? settings.goalSettings.goalBars : []
    }
  };
}

function mergeSettings(current: UserSettingsDto, patch: UserSettingsPatchRequest): UserSettingsDto {
  return normalizeSettings({
    ...current,
    ...patch,
    workshopSettings: patch.workshopSettings ? { ...current.workshopSettings, ...patch.workshopSettings } : current.workshopSettings,
    visualSettings: patch.visualSettings ? { ...current.visualSettings, ...patch.visualSettings } : current.visualSettings,
    goalSettings: patch.goalSettings ? { ...current.goalSettings, ...patch.goalSettings } : current.goalSettings
  }, current.userId);
}

type SettingsContextValue = {
  settings: UserSettingsDto;
  status: SettingsSyncStatus;
  error: string;
  isLoaded: boolean;
  updateSettings: (patch: UserSettingsPatchRequest) => Promise<void>;
  updateWorkshopSettings: (patch: Partial<UserWorkshopSettingsDto>) => Promise<void>;
  updateGoalSettings: (goalSettings: UserGoalSettingsDto) => Promise<void>;
  retry: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, refreshSession } = useAuth();
  const [settings, setSettings] = useState<UserSettingsDto>(() => defaultUserSettings(user?.id));
  const [status, setStatus] = useState<SettingsSyncStatus>("idle");
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const lastFailedPatchRef = useRef<UserSettingsPatchRequest | null>(null);
  const confirmedSettingsRef = useRef<UserSettingsDto>(defaultUserSettings(user?.id));
  const settingsRef = useRef(settings);
  const saveSequenceRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let isCancelled = false;

    async function loadSettings() {
      saveSequenceRef.current += 1;
      if (!user) {
        const fallback = defaultUserSettings();
        confirmedSettingsRef.current = fallback;
        settingsRef.current = fallback;
        setSettings(fallback);
        setIsLoaded(false);
        setStatus("idle");
        setError("");
        lastFailedPatchRef.current = null;
        return;
      }

      setStatus("loading");
      setError("");

      try {
        const serverSettings = await apiFetch<UserSettingsDto>("/api/user-settings", accessToken, undefined, refreshSession);
        if (isCancelled) return;
        const normalized = normalizeSettings(serverSettings, user.id);
        confirmedSettingsRef.current = normalized;
        settingsRef.current = normalized;
        setSettings(normalized);
        setIsLoaded(true);
        setStatus("saved");
        lastFailedPatchRef.current = null;
      } catch (caught) {
        if (isCancelled) return;
        const fallback = normalizeSettings(settingsRef.current, user.id);
        confirmedSettingsRef.current = fallback;
        settingsRef.current = fallback;
        setSettings(fallback);
        setIsLoaded(true);
        setStatus("error");
        setError(problemMessage(caught));
      }
    }

    loadSettings();
    return () => {
      isCancelled = true;
    };
  }, [accessToken, refreshSession, user]);

  const updateSettings = useCallback(async (patch: UserSettingsPatchRequest) => {
    const sequence = saveSequenceRef.current + 1;
    saveSequenceRef.current = sequence;
    const optimistic = mergeSettings(settingsRef.current, patch);
    settingsRef.current = optimistic;
    setSettings(optimistic);
    setStatus("saving");
    setError("");

    try {
      const saved = await apiFetch<UserSettingsDto>("/api/user-settings", accessToken, {
        method: "PATCH",
        body: JSON.stringify(patch)
      }, refreshSession);
      if (saveSequenceRef.current !== sequence) return;
      const normalized = normalizeSettings(saved, user?.id);
      confirmedSettingsRef.current = normalized;
      settingsRef.current = normalized;
      setSettings(normalized);
      setStatus("saved");
      lastFailedPatchRef.current = null;
    } catch (caught) {
      if (saveSequenceRef.current !== sequence) return;
      const rollback = confirmedSettingsRef.current;
      settingsRef.current = rollback;
      setSettings(rollback);
      setStatus("error");
      setError(problemMessage(caught));
      lastFailedPatchRef.current = patch;
    }
  }, [accessToken, refreshSession, user]);

  const updateWorkshopSettings = useCallback((patch: Partial<UserWorkshopSettingsDto>) => {
    return updateSettings({ workshopSettings: { ...settings.workshopSettings, ...patch } });
  }, [settings.workshopSettings, updateSettings]);

  const updateGoalSettings = useCallback((goalSettings: UserGoalSettingsDto) => {
    return updateSettings({ goalSettings });
  }, [updateSettings]);

  const retry = useCallback(async () => {
    if (!lastFailedPatchRef.current) return;
    await updateSettings(lastFailedPatchRef.current);
  }, [updateSettings]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    status,
    error,
    isLoaded,
    updateSettings,
    updateWorkshopSettings,
    updateGoalSettings,
    retry
  }), [error, isLoaded, retry, settings, status, updateGoalSettings, updateSettings, updateWorkshopSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
