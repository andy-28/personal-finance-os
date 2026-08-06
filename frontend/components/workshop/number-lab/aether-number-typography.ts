import { Bungee, Bungee_Inline, Fredoka } from "next/font/google";
import type { AetherNumberTypographyId } from "./aether-number-types";

const bungee = Bungee({ subsets: ["latin"], weight: "400", display: "swap" });
const bungeeInline = Bungee_Inline({ subsets: ["latin"], weight: "400", display: "swap" });
const fredoka = Fredoka({ subsets: ["latin"], weight: ["600", "700"], display: "swap" });

export type TypographyPreset = {
  id: AetherNumberTypographyId;
  displayName: string;
  systemLabel: string;
  fontFamily: string;
  fontWeight: number;
  supportsOutline: boolean;
  supportsGlow: boolean;
  recommendedUse: string;
};

export const aetherTypographyRegistry: TypographyPreset[] = [
  {
    id: "default",
    displayName: "Default",
    systemLabel: "SYSTEM DEFAULT",
    fontFamily: "var(--font-sans)",
    fontWeight: 950,
    supportsOutline: true,
    supportsGlow: true,
    recommendedUse: "日常財務介面與長數字。"
  },
  {
    id: "bungee",
    displayName: "Bungee",
    systemLabel: "ARCADE IMPACT",
    fontFamily: bungee.style.fontFamily,
    fontWeight: 400,
    supportsOutline: true,
    supportsGlow: true,
    recommendedUse: "爆擊、金幣獲得與成就通知。"
  },
  {
    id: "bungee-inline",
    displayName: "Bungee Inline",
    systemLabel: "INLINE ARCADE",
    fontFamily: bungeeInline.style.fontFamily,
    fontWeight: 400,
    supportsOutline: true,
    supportsGlow: true,
    recommendedUse: "大型 Hero 數字與招牌式標題。"
  },
  {
    id: "fredoka",
    displayName: "Fredoka",
    systemLabel: "ROUND RPG UI",
    fontFamily: fredoka.style.fontFamily,
    fontWeight: 700,
    supportsOutline: true,
    supportsGlow: true,
    recommendedUse: "圓潤 MMORPG UI、百分比與角色狀態。"
  }
];

export function getAetherTypography(id: AetherNumberTypographyId) {
  return aetherTypographyRegistry.find((preset) => preset.id === id) ?? aetherTypographyRegistry[0];
}
