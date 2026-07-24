"use client";

import { FaviconPicker } from "@/components/aether/favicon-picker";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { visualSlots } from "@/lib/aether/visual-slots";

export default function WorkshopPage() {
  return (
    <section className="grid gap-6">
      <PageHeader title="介面工坊" description="調整 Aether 介面的本機顯示設定。" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <FaviconPicker />

        <Card className="overflow-hidden">
          <CardTitle title="Visual Slot Registry" description="Local preview" />
          <div className="grid gap-3 p-4 text-sm text-muted">
            <div className="rounded-ui border border-border/65 bg-background/35 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Active slot</p>
              <p className="mt-2 text-lg font-bold text-foreground">{visualSlots.favicon.key}</p>
              <p className="mt-1">第一版只開放 favicon 插槽，素材來源限定為 repo 內建清單。</p>
            </div>
            <div className="rounded-ui border border-border/65 bg-background/35 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Future slots</p>
              <p className="mt-2">Sidebar logo、頁面光效、Goal Bar 材質與 Modal 特效先保留為後續階段，不在本次啟用。</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
