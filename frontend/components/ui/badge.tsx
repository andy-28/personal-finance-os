import type { ReactNode } from "react";
import { GameBadge } from "./game-theme";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "credit" | "transfer";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <GameBadge tone={tone}>{children}</GameBadge>;
}
