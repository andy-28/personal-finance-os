"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { getAetherAssetDefinition, type AetherAssetKey } from "@/lib/aether/asset-registry";

type AetherAssetSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "hero";

type AetherAssetProps = {
  name: AetherAssetKey;
  size?: AetherAssetSize;
  label?: string;
  decorative?: boolean;
  className?: string;
  forceFallback?: boolean;
};

const sizeMap: Record<AetherAssetSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  hero: 96
};

export function AetherIcon(props: AetherAssetProps) {
  return <AetherAsset {...props} variant="icon" />;
}

export function AetherAsset({ name, size = "md", label, decorative = true, className, forceFallback = false, variant = "asset" }: AetherAssetProps & { variant?: "icon" | "asset" }) {
  const definition = getAetherAssetDefinition(name);
  const [hasImageError, setHasImageError] = useState(false);
  const pixelSize = sizeMap[size];
  const accessibleLabel = label ?? definition.label;
  const style = { "--aether-asset-size": `${pixelSize}px` } as CSSProperties;

  if (definition.customSrc && !hasImageError && !forceFallback) {
    return (
      <Image
        src={definition.customSrc}
        alt={decorative ? "" : accessibleLabel}
        aria-hidden={decorative || undefined}
        width={pixelSize}
        height={pixelSize}
        className={`aether-asset aether-asset-${variant} aether-asset-${size} aether-asset-${definition.tone} ${className ?? ""}`}
        style={style}
        onError={() => setHasImageError(true)}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`aether-asset aether-asset-${variant} aether-asset-${size} aether-asset-${definition.tone} aether-asset-${definition.category} ${className ?? ""}`}
      style={style}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      role={decorative ? undefined : "img"}
      data-asset={name}
    >
      <FallbackGlyph name={definition.fallback} />
    </span>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function FallbackGlyph({ name }: { name: AetherAssetKey }) {
  switch (name) {
    case "account":
    case "account-vault":
      return <Svg><path d="M4 9.5 12 5l8 4.5" /><path d="M6 10v8" /><path d="M10 10v8" /><path d="M14 10v8" /><path d="M18 10v8" /><path d="M4 19h16" /></Svg>;
    case "ledger":
      return <Svg><path d="M5 4h11.5A2.5 2.5 0 0 1 19 6.5V20H7a2 2 0 0 1-2-2V4Z" /><path d="M8 8h7" /><path d="M8 12h6" /><path d="M8 16h5" /></Svg>;
    case "credit-card":
      return <Svg><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M4 10h16" /><path d="M7 15h3" /><path d="M14 15h3" /></Svg>;
    case "dashboard":
      return <Svg><path d="M4 13a8 8 0 1 1 16 0" /><path d="m12 13 4-4" /><path d="M5 17h14" /></Svg>;
    case "personal-hud":
    case "goal-star":
    case "goal-crystal":
      return <Svg><path d="m12 3 2.6 5.5 5.9.8-4.3 4.2 1 5.9L12 16.5l-5.2 2.9 1-5.9-4.3-4.2 5.9-.8L12 3Z" /></Svg>;
    case "recurring":
      return <Svg><path d="M17 2.5 21 6l-4 3.5" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 21.5-4-3.5L7 14.5" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></Svg>;
    case "category":
      return <Svg><path d="M5 5h5v5H5z" /><path d="M14 5h5v5h-5z" /><path d="M5 14h5v5H5z" /><path d="M14 14h5v5h-5z" /></Svg>;
    case "system-status":
    case "success":
      return <Svg><path d="M12 3 20 7v5c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V7l8-4Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></Svg>;
    case "workshop":
      return <Svg><path d="M14.5 4.5 19.5 9.5" /><path d="m4 20 5.5-1 10-10-4.5-4.5-10 10L4 20Z" /><path d="M12 7 17 12" /></Svg>;
    case "add":
      return <Svg><path d="M12 5v14" /><path d="M5 12h14" /></Svg>;
    case "edit":
      return <Svg><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Svg>;
    case "search":
      return <Svg><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></Svg>;
    case "filter":
      return <Svg><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></Svg>;
    case "calendar":
      return <Svg><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /></Svg>;
    case "statement":
    case "statement-scroll":
      return <Svg><path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h4" /></Svg>;
    case "installment":
      return <Svg><path d="M5 7h14" /><path d="M7 12h10" /><path d="M9 17h6" /><path d="M4 4h16v16H4z" /></Svg>;
    case "payment":
    case "coin":
      return <Svg><circle cx="12" cy="12" r="7.5" /><path d="M12 7.5v9" /><path d="M9.5 9.5h3.5a2 2 0 0 1 0 4H11a2 2 0 0 0 0 4h3.5" /></Svg>;
    case "warning":
      return <Svg><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></Svg>;
    case "pending":
      return <Svg><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></Svg>;
    case "asset-crystal":
    case "available-energy":
    case "credit-energy":
      return <Svg><path d="M12 3 19 9l-7 12L5 9l7-6Z" /><path d="M5 9h14" /><path d="M12 3v18" /></Svg>;
    case "debt-shard":
      return <Svg><path d="M13 3 20 8l-5 13-9-4 3-7-3-3 7-4Z" /><path d="m9 10 6 3" /></Svg>;
    case "net-worth-core":
      return <Svg><circle cx="12" cy="12" r="7" /><path d="M12 5v14" /><path d="M5 12h14" /><path d="m8 8 8 8" /><path d="m16 8-8 8" /></Svg>;
    case "travel-token":
      return <Svg><circle cx="12" cy="12" r="8" /><path d="M8 14c2.5-1 5.5-1 8 0" /><path d="M10 9h.01" /><path d="M14 9h.01" /></Svg>;
    case "wallet":
      return <Svg><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" /><path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" /></Svg>;
    default:
      return <Svg><path d="M12 4 20 12 12 20 4 12 12 4Z" /></Svg>;
  }
}
