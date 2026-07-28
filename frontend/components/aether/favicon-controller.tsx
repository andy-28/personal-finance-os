"use client";

import { useEffect } from "react";
import { getBuiltInVisualAsset, getDefaultVisualAsset } from "@/lib/aether/visual-slots";
import { useSettings } from "@/lib/settings/user-settings";

function applyFavicon(faviconAssetId: string) {
  const asset = getBuiltInVisualAsset(faviconAssetId) ?? getDefaultVisualAsset();
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
  const { settings } = useSettings();

  useEffect(() => {
    applyFavicon(settings.workshopSettings.faviconAssetId);
  }, [settings.workshopSettings.faviconAssetId]);

  return null;
}
