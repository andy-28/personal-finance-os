export function LoadingState({ label = "載入中..." }: { label?: string }) {
  return <div className="ui-card text-sm text-muted">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="game-panel border-danger/40 bg-danger/10 text-sm text-danger">{message}</div>;
}

export function EmptyState({ title = "目前沒有資料", description }: { title?: string; description?: string }) {
  return (
    <div className="ui-card text-sm">
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-muted">{description}</p>}
    </div>
  );
}
