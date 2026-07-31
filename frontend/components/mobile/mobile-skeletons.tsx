"use client";

export function MobileDashboardSkeleton() {
  return (
    <div className="mobile-dashboard mobile-skeleton-screen md:hidden" aria-label="Loading mobile dashboard" aria-busy="true">
      <div className="mobile-skeleton-card mobile-skeleton-hero" />
      <div className="mobile-skeleton-card">
        <div className="mobile-skeleton-line mobile-skeleton-line-title" />
        <div className="mobile-skeleton-grid">
          <span />
          <span />
          <span className="mobile-skeleton-wide" />
        </div>
      </div>
      <div className="mobile-skeleton-card">
        <div className="mobile-skeleton-line mobile-skeleton-line-title" />
        <div className="mobile-skeleton-row" />
        <div className="mobile-skeleton-row" />
      </div>
      <div className="mobile-skeleton-card">
        <div className="mobile-skeleton-line mobile-skeleton-line-title" />
        <div className="mobile-skeleton-row" />
        <div className="mobile-skeleton-row" />
        <div className="mobile-skeleton-row" />
      </div>
    </div>
  );
}

export function MobileTransactionSkeleton() {
  return (
    <div className="grid gap-3 md:hidden" aria-label="Loading mobile transactions" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="mobile-skeleton-card mobile-skeleton-transaction">
          <span className="mobile-skeleton-orb" />
          <span className="mobile-skeleton-copy">
            <span className="mobile-skeleton-line" />
            <span className="mobile-skeleton-line mobile-skeleton-line-short" />
          </span>
          <span className="mobile-skeleton-amount" />
        </div>
      ))}
    </div>
  );
}

export function MobileHudEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mobile-hud-empty">
      <span className="mobile-hud-empty-icon" aria-hidden="true">◇</span>
      <div>
        <p>{title}</p>
        <small>{description}</small>
      </div>
    </div>
  );
}
