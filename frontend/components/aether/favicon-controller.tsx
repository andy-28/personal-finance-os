"use client";

import { useEffect } from "react";
import { aetherWorkshopSettingsChangedEvent, aetherWorkshopStorageKey, loadAetherWorkshopSettings, normalizeAetherWorkshopSettings, type AetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { getBuiltInVisualAsset, getDefaultVisualAsset } from "@/lib/aether/visual-slots";

function applyFavicon(settings: AetherWorkshopSettings) {
  const asset = getBuiltInVisualAsset(settings.faviconAssetId) ?? getDefaultVisualAsset();
  const href = new URL(asset.src, window.location.origin).toString();

  let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!iconLink) {
    iconLink = document.createElement("link");
    iconLink.rel = "icon";
    document.head.appendChild(iconLink);
  }

  iconLink.href = href;
  iconLink.type = "image/png";

  let shortcutLink = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  if (!shortcutLink) {
    shortcutLink = document.createElement("link");
    shortcutLink.rel = "shortcut icon";
    document.head.appendChild(shortcutLink);
  }

  shortcutLink.href = href;
  shortcutLink.type = "image/png";
}

export function FaviconController() {
  useEffect(() => {
    applyFavicon(loadAetherWorkshopSettings());

    const onSettingsChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      applyFavicon(normalizeAetherWorkshopSettings(detail));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== aetherWorkshopStorageKey) return;

      try {
        applyFavicon(normalizeAetherWorkshopSettings(event.newValue ? JSON.parse(event.newValue) : null));
      } catch {
        applyFavicon(loadAetherWorkshopSettings());
      }
    };

    window.addEventListener(aetherWorkshopSettingsChangedEvent, onSettingsChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(aetherWorkshopSettingsChangedEvent, onSettingsChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
