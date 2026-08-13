import type { AetherAssetKey } from "./asset-registry";

export type PersonalReferenceAssetPack = {
  id: string;
  label: string;
  source: "aether-original" | "personal-reference";
  runtime: "production-safe" | "local-only";
  status: "available" | "empty" | "reference-only";
  description: string;
};

export type PersonalReferenceMapping = {
  semanticAsset: AetherAssetKey;
  referenceKey: string;
  packId: string;
  status: "not-configured" | "local-only" | "reference-only";
  comparisonFocus: string[];
};

export const personalReferenceAssetPacks: PersonalReferenceAssetPack[] = [
  {
    id: "aether-core",
    label: "Aether Core",
    source: "aether-original",
    runtime: "production-safe",
    status: "available",
    description: "Coin Engine original runtime artwork from the Aether Asset Registry."
  },
  {
    id: "personal-reference",
    label: "Personal Reference",
    source: "personal-reference",
    runtime: "local-only",
    status: "empty",
    description: "Local-only visual research workspace. Reference images are ignored by Git and never deployed."
  },
  {
    id: "maplestory-reference",
    label: "MapleStory Reference",
    source: "personal-reference",
    runtime: "local-only",
    status: "empty",
    description: "Optional local study pack for MMORPG UI comparison. No third-party images are committed."
  }
];

export const personalReferenceMappings: PersonalReferenceMapping[] = [
  {
    semanticAsset: "coin",
    referenceKey: "maple-meso",
    packId: "maplestory-reference",
    status: "not-configured",
    comparisonFocus: ["silhouette", "small-size readability", "material", "resource identity"]
  },
  {
    semanticAsset: "asset-crystal",
    referenceKey: "maple-crystal",
    packId: "maplestory-reference",
    status: "not-configured",
    comparisonFocus: ["crystal shape", "contrast", "rarity language", "inventory readability"]
  },
  {
    semanticAsset: "debt-shard",
    referenceKey: "maple-shard",
    packId: "maplestory-reference",
    status: "not-configured",
    comparisonFocus: ["danger silhouette", "ruby tone", "dark-background contrast"]
  }
];

export const personalReferenceAssetRules = [
  "Reference artwork is local-only and ignored by Git.",
  "Reference artwork must not be placed in frontend/public.",
  "Reference artwork is never an approved Aether asset.",
  "Workshop may display architecture and empty states, but production UI must use Aether Core artwork."
];
