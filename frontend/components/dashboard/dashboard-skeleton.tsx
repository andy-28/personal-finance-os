export function DashboardSkeleton() {
  return (
    <div className="grid gap-5" aria-label="正在載入 Dashboard">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-ui border border-border/55 bg-surface/55" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-ui border border-border/55 bg-surface/45" />)}
      </div>
    </div>
  );
}