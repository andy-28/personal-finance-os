import { Button } from "@/components/ui/button";

export function HudEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="hud-empty-state">
      <p className="mobile-section-eyebrow">PERSONAL HUD</p>
      <h2>尚未建立個人介面</h2>
      <p>從介面庫選擇一種呈現方式，開始追蹤重要的財務資訊。</p>
      <Button type="button" onClick={onAdd}>新增介面</Button>
    </section>
  );
}
