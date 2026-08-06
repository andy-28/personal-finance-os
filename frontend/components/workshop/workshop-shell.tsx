import type { CSSProperties, ReactNode } from "react";
import { AetherListRow, AetherSectionHeader, AetherStatusIndicator } from "@/components/ui/aether-management";
import { coinTerminology } from "@/lib/coin-engine-terminology";

export type WorkshopTone = "neutral" | "success" | "warning" | "danger" | "credit";

export type WorkshopCatalogEntry<TKey extends string> = {
  key: TKey;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: WorkshopTone;
  disabled?: boolean;
};

export function WorkshopCatalog<TKey extends string>({
  title,
  meta,
  description,
  items,
  selectedKey,
  onSelect
}: {
  title: string;
  meta: string;
  description: string;
  items: WorkshopCatalogEntry<TKey>[];
  selectedKey: TKey;
  onSelect: (key: TKey) => void;
}) {
  return (
    <div className="aether-workshop-catalog">
      <AetherSectionHeader title={title} meta={meta} />
      <p className="text-sm text-muted">{description}</p>
      <div className="grid gap-2" role="listbox" aria-label={title}>
        {items.map((item) => (
          <AetherListRow
            key={item.key}
            title={item.title}
            subtitle={item.subtitle}
            meta={<AetherStatusIndicator label={item.statusLabel} tone={item.statusTone} />}
            isActive={selectedKey === item.key}
            onClick={() => !item.disabled && onSelect(item.key)}
          />
        ))}
      </div>
    </div>
  );
}

export function WorkshopInspector({ title, meta, children, actions }: { title: ReactNode; meta?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="workshop-inspector">
      <AetherSectionHeader title={title} meta={meta} actions={actions} />
      <div className="workshop-inspector-body">{children}</div>
    </section>
  );
}

export function WorkshopPreviewStage({ title, meta, children, style }: { title: ReactNode; meta?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="aether-preview-stage" style={style}>
      <AetherSectionHeader title={title} meta={meta} />
      <div className="aether-preview-stage-body">{children}</div>
    </section>
  );
}

export function WorkshopPropertyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="workshop-property-group">
      <legend>{title}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

export function WorkshopPropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="workshop-property-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function WorkshopComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <article className="workshop-coming-soon">
      <span>{coinTerminology.status.planned.label}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
  );
}
