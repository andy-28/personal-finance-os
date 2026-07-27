"use client";

import { useEffect, useState } from "react";
import { aetherWorkshopSettingsChangedEvent, aetherWorkshopStorageKey, loadAetherWorkshopSettings, normalizeAetherWorkshopSettings } from "@/lib/aether/workshop-settings";
import { visualSlots } from "@/lib/aether/visual-slots";

type AetherEffectIntensity = "subtle" | "normal" | "strong";

const intensityClasses: Record<AetherEffectIntensity, string> = {
  subtle: "opacity-45 motion-reduce:opacity-25",
  normal: "opacity-65 motion-reduce:opacity-30",
  strong: "opacity-85 motion-reduce:opacity-40"
};

export function AetherEnergyDivider({ className = "", ariaHidden = true, intensity = "normal", hidden = false }: { className?: string; ariaHidden?: boolean; intensity?: AetherEffectIntensity; hidden?: boolean }) {
  if (hidden) return null;

  return (
    <div className={`pointer-events-none select-none overflow-hidden ${className}`} aria-hidden={ariaHidden}>
      <img
        src={visualSlots.headerDivider.assetPath}
        alt=""
        loading="lazy"
        decoding="async"
        className={`pointer-events-none mx-auto block h-auto w-[min(360px,72vw)] object-contain mix-blend-screen drop-shadow-[0_0_18px_rgba(168,85,247,0.55)] ${intensityClasses[intensity]}`}
      />
    </div>
  );
}

export function AetherHeaderDividerSlot({ className = "", intensity = "normal" }: { className?: string; intensity?: AetherEffectIntensity }) {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsEnabled(loadAetherWorkshopSettings().headerDividerEnabled);
    }, 0);

    const onSettingsChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setIsEnabled(normalizeAetherWorkshopSettings(detail).headerDividerEnabled);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== aetherWorkshopStorageKey) return;

      try {
        setIsEnabled(normalizeAetherWorkshopSettings(event.newValue ? JSON.parse(event.newValue) : null).headerDividerEnabled);
      } catch {
        setIsEnabled(loadAetherWorkshopSettings().headerDividerEnabled);
      }
    };

    window.addEventListener(aetherWorkshopSettingsChangedEvent, onSettingsChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener(aetherWorkshopSettingsChangedEvent, onSettingsChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return <AetherEnergyDivider className={className} intensity={intensity} hidden={!isEnabled} />;
}
