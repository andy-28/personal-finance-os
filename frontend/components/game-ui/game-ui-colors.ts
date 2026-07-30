import type { GameUiAccent, GameUiAccentStyle } from "./game-ui-types";

export const gameUiAccentStyles: Record<GameUiAccent, GameUiAccentStyle> = {
  violet: { label: "Arcane violet", fill: "linear-gradient(90deg, #6d28d9 0%, #a855f7 55%, #f0abfc 100%)", glow: "0 0 10px rgba(168, 85, 247, 0.75)", border: "#a78bfa", track: "#2b1743", frameGlow: "0 0 16px rgba(124, 58, 237, 0.35)" },
  cyan: { label: "Aether cyan", fill: "linear-gradient(90deg, #0891b2 0%, #22d3ee 55%, #a5f3fc 100%)", glow: "0 0 10px rgba(34, 211, 238, 0.75)", border: "#67e8f9", track: "#0f2f3a", frameGlow: "0 0 16px rgba(34, 211, 238, 0.32)" },
  emerald: { label: "Guild green", fill: "linear-gradient(90deg, #047857 0%, #34d399 55%, #bbf7d0 100%)", glow: "0 0 10px rgba(52, 211, 153, 0.7)", border: "#86efac", track: "#0f3328", frameGlow: "0 0 16px rgba(52, 211, 153, 0.32)" },
  amber: { label: "Quest amber", fill: "linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fde68a 100%)", glow: "0 0 10px rgba(245, 158, 11, 0.72)", border: "#fcd34d", track: "#3b270b", frameGlow: "0 0 16px rgba(245, 158, 11, 0.32)" },
  rose: { label: "Raid rose", fill: "linear-gradient(90deg, #be123c 0%, #fb7185 55%, #fecdd3 100%)", glow: "0 0 10px rgba(251, 113, 133, 0.72)", border: "#fda4af", track: "#3b1220", frameGlow: "0 0 16px rgba(251, 113, 133, 0.32)" }
};
