import { Button } from "@/components/ui/button";
import { coinTerminology } from "@/lib/coin-engine-terminology";

export function HudEmptyState({ onAdd }: { onAdd: () => void }) {
  const { actions, emptyState, hud } = coinTerminology;
  return (
    <section className="hud-empty-state">
      <p className="mobile-section-eyebrow">{hud.systemLabel}</p>
      <h2>{emptyState.hud.title}</h2>
      <p>{emptyState.hud.description}</p>
      <Button type="button" onClick={onAdd}>{actions.addFirstHudWidget}</Button>
    </section>
  );
}
