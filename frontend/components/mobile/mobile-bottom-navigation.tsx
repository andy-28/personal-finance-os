"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { QuickAdd } from "@/app/(app)/quick-add";

type IconProps = {
  className?: string;
};

function IconBase({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </IconBase>
  );
}

function LedgerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
      <path d="M7 4v16" />
    </IconBase>
  );
}

function GoalsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </IconBase>
  );
}

function MoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

export function MobileBottomNavigation({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const isHome = pathname === "/dashboard" || pathname === "/";
  const isLedger = pathname === "/transactions" || pathname.startsWith("/transactions/");
  const isHud = pathname.startsWith("/hud");

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Mobile primary navigation">
      <Link className={`mobile-bottom-nav-item ${isHome ? "mobile-bottom-nav-item-active" : ""}`} href="/dashboard" aria-label="Home" aria-current={isHome ? "page" : undefined}>
        <span aria-hidden="true"><HomeIcon /></span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isLedger ? "mobile-bottom-nav-item-active" : ""}`} href="/transactions" aria-label="Ledger" aria-current={isLedger ? "page" : undefined}>
        <span aria-hidden="true"><LedgerIcon /></span>
      </Link>
      <QuickAdd variant="mobile" />
      <Link className={`mobile-bottom-nav-item ${isHud ? "mobile-bottom-nav-item-active" : ""}`} href="/hud" aria-label="我的介面" aria-current={isHud ? "page" : undefined}>
        <span aria-hidden="true"><GoalsIcon /></span>
      </Link>
      <button type="button" className="mobile-bottom-nav-item" onClick={onMore} aria-label="Open more navigation">
        <span aria-hidden="true"><MoreIcon /></span>
      </button>
    </nav>
  );
}
