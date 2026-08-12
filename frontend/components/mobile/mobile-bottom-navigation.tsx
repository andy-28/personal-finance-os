"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuickAdd } from "@/app/(app)/quick-add";
import { AetherIcon } from "@/components/aether/aether-asset";

export function MobileBottomNavigation({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const isHome = pathname === "/dashboard" || pathname === "/";
  const isLedger = pathname === "/transactions" || pathname.startsWith("/transactions/");
  const isCreditCards = pathname.startsWith("/credit-cards");
  const isHud = pathname.startsWith("/hud");

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="手機主要導覽">
      <Link className={`mobile-bottom-nav-item ${isHome ? "mobile-bottom-nav-item-active" : ""}`} href="/dashboard" aria-label="首頁" aria-current={isHome ? "page" : undefined}>
        <span aria-hidden="true"><AetherIcon name="dashboard" size="md" /></span>
      </Link>
      <Link className={`mobile-bottom-nav-item ${isLedger ? "mobile-bottom-nav-item-active" : ""}`} href="/transactions" aria-label="交易紀錄" aria-current={isLedger ? "page" : undefined}>
        <span aria-hidden="true"><AetherIcon name="ledger" size="md" /></span>
      </Link>
      <QuickAdd variant="mobile" />
      <Link className={`mobile-bottom-nav-item ${isCreditCards || isHud ? "mobile-bottom-nav-item-active" : ""}`} href={isCreditCards ? "/credit-cards" : "/hud"} aria-label={isCreditCards ? "信用卡" : "我的介面"} aria-current={isCreditCards || isHud ? "page" : undefined}>
        <span aria-hidden="true"><AetherIcon name={isCreditCards ? "credit-card" : "personal-hud"} size="md" /></span>
      </Link>
      <button type="button" className="mobile-bottom-nav-item" onClick={onMore} aria-label="開啟更多選單">
        <span aria-hidden="true"><AetherIcon name="workshop" size="md" /></span>
      </button>
    </nav>
  );
}
