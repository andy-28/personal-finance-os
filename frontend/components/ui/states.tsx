import { AetherEmptyState } from "./aether-management";

export function LoadingState({ label = "載入中..." }: { label?: string }) {
  return <div className="aether-state-panel text-sm text-muted" aria-busy="true">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="aether-state-panel border-danger/45 bg-danger/10 text-sm text-danger" role="alert">{message}</div>;
}

export function EmptyState({ title = "目前沒有資料", description }: { title?: string; description?: string }) {
  return <AetherEmptyState title={title} description={description} />;
}
