"use client";

import { visualSlots } from "@/lib/aether/visual-slots";
import { useSettings } from "@/lib/settings/user-settings";

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
  const { settings } = useSettings();
  return <AetherEnergyDivider className={className} intensity={intensity} hidden={!settings.workshopSettings.headerDividerEnabled} />;
}
