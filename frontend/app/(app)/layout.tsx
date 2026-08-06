"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaviconController } from "@/components/aether/favicon-controller";
import { MobileAppHeader } from "@/components/mobile/mobile-app-header";
import { MobileBottomNavigation } from "@/components/mobile/mobile-bottom-navigation";
import { MobileDrawer } from "@/components/mobile/mobile-drawer";
import { ServiceConnectionState } from "@/components/system/service-connection-state";
import { Button } from "@/components/ui/button";
import { GameTheme } from "@/components/ui/game-theme";
import { useAuth } from "../auth-context";
import { t } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings/user-settings";
import { QuickAdd } from "./quick-add";
import { QuestLog } from "./quest-log";

const navGroups = [
  {
    title: t("finance"),
    links: [
      ["/accounts", t("accounts"), t("accountsHint")],
      ["/transactions", t("ledger"), t("ledgerHint")],
      ["/credit-cards", t("creditCards"), t("creditCardsHint")]
    ]
  },
  {
    title: t("planning"),
    links: [
      ["/dashboard", "儀表板", "財務指揮中心"],
      ["/hud", "我的介面", "PERSONAL HUD"],
      ["/recurring-transactions", t("recurring"), t("recurringHint")],
      ["/categories", t("categories"), t("categoriesHint")]
    ]
  },
  {
    title: t("system"),
    links: [
      ["/system-status", t("health"), t("healthHint")],
      ["/workshop", "介面工坊", "AETHER WORKSHOP"]
    ]
  }
] as const;

function mobileTitle(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "Coin Engine";
  if (pathname.startsWith("/transactions")) return "交易紀錄";
  if (pathname.startsWith("/hud")) return "我的介面";
  if (pathname.startsWith("/accounts")) return "帳戶";
  if (pathname.startsWith("/credit-cards")) return "信用卡";
  if (pathname.startsWith("/recurring-transactions")) return "週期交易";
  if (pathname.startsWith("/categories")) return "分類";
  if (pathname.startsWith("/upcoming")) return "待處理";
  if (pathname.startsWith("/workshop")) return "介面工坊";
  if (pathname.startsWith("/desktop-lab")) return "桌面實驗室";
  if (pathname.startsWith("/system-status")) return "系統狀態";
  return "Coin Engine";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-5">
        <ServiceConnectionState
          stage="waking-api"
          title="正在連線到服務"
          detail="Render 免費服務可能正在喚醒中，通常等待一下就會恢復。"
        />
      </main>
    );
  }

  const nav = (
    <nav className="grid gap-5">
      {navGroups.map((group) => (
        <section key={group.title} className="grid gap-2">
          <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-primary/75">{group.title}</p>
          <div className="grid gap-1.5">
            {group.links.map(([href, label, hint]) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`ui-focus relative overflow-hidden rounded-ui border px-3 py-2 transition duration-200 ${
                    isActive
                      ? "border-primary/65 bg-primary/12 text-foreground shadow-panel before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-primary/10 after:to-transparent"
                      : "border-transparent text-muted hover:border-border/70 hover:bg-surface-muted/60 hover:text-foreground"
                  }`}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={`block text-xs ${isActive ? "text-primary/85" : "text-muted"}`}>{hint}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <GameTheme>
      <SettingsProvider>
        <FaviconController />
        <main className="min-h-screen text-foreground">
          <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border/70 bg-surface/72 px-4 py-5 shadow-panel backdrop-blur-xl lg:block">
            <div className="mb-8 border-b border-border/55 pb-5">
              <p className="text-lg font-bold tracking-normal">Coin Engine</p>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{t("aetherCommandMenu")}</p>
            </div>
            {nav}
          </aside>

          {false && isMenuOpen && (
            <div className="fixed inset-0 z-50 bg-background/70 p-3 backdrop-blur-lg lg:hidden" onClick={() => setIsMenuOpen(false)}>
              <div className="game-panel h-full w-72" onClick={(event) => event.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between border-b border-border/55 pb-4">
                  <div>
                    <p className="font-bold">Coin Engine</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{t("aetherCommandMenu")}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>
                    關閉
                  </Button>
                </div>
                {nav}
              </div>
            </div>
          )}

          <MobileDrawer
            isOpen={isMenuOpen}
            nav={nav}
            user={user}
            onClose={() => setIsMenuOpen(false)}
            onLogout={async () => {
              await logout();
              setIsMenuOpen(false);
              router.replace("/login");
            }}
          />

          <section className="lg:pl-64">
            <header className="sticky top-0 z-30 border-b border-border/65 bg-background/78 shadow-panel backdrop-blur-xl">
              <MobileAppHeader title={mobileTitle(pathname)} user={user} onMenu={() => setIsMenuOpen(true)} />
              <div className="hidden min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:flex-nowrap sm:px-6 sm:py-0 lg:flex">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{user.displayName}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
                <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
                  <QuestLog />
                  <QuickAdd />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await logout();
                      router.replace("/login");
                    }}
                  >
                    {t("logout")}
                  </Button>
                </div>
              </div>
            </header>
            <div key={pathname} className="mobile-page-transition mx-auto grid max-w-7xl gap-8 px-4 py-7 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-7">{children}</div>
          </section>
          <MobileBottomNavigation onMore={() => setIsMenuOpen(true)} />
        </main>
      </SettingsProvider>
    </GameTheme>
  );
}
