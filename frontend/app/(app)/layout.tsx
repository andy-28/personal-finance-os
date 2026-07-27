"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaviconController } from "@/components/aether/favicon-controller";
import { Button } from "@/components/ui/button";
import { GameTheme } from "@/components/ui/game-theme";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "../auth-context";
import { t } from "@/lib/i18n";
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
      ["/recurring-transactions", t("recurring"), t("recurringHint")],
      ["/categories", t("categories"), t("categoriesHint")]
    ]
  },
  {
    title: t("system"),
    links: [
      ["/system-status", t("health"), t("healthHint")],
      ["/workshop", "介面工坊", "Aether Workshop"]
    ]
  }
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return <main className="grid min-h-screen place-items-center bg-background p-5"><LoadingState label={t("loadingInterface")} /></main>;
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
      <FaviconController />
      <main className="min-h-screen text-foreground">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border/70 bg-surface/72 px-4 py-5 shadow-panel backdrop-blur-xl lg:block">
          <div className="mb-8 border-b border-border/55 pb-5">
            <p className="text-lg font-bold tracking-normal">PersonalFinanceOS</p>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{t("aetherCommandMenu")}</p>
          </div>
          {nav}
        </aside>

        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/70 p-3 backdrop-blur-lg lg:hidden" onClick={() => setIsMenuOpen(false)}>
            <div className="game-panel h-full w-72" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between border-b border-border/55 pb-4">
                <div>
                  <p className="font-bold">PersonalFinanceOS</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{t("aetherCommandMenu")}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>{t("close")}</Button>
              </div>
              {nav}
            </div>
          </div>
        )}

        <section className="lg:pl-64">
          <header className="sticky top-0 z-30 border-b border-border/65 bg-background/78 shadow-panel backdrop-blur-xl">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:flex-nowrap sm:px-6 sm:py-0">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsMenuOpen(true)}>{t("menu")}</Button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{user.displayName}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <QuestLog />
                <QuickAdd />
                <Button variant="outline" size="sm" onClick={async () => { await logout(); router.replace("/login"); }}>{t("logout")}</Button>
              </div>
            </div>
          </header>
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-7 sm:px-6">{children}</div>
        </section>
      </main>
    </GameTheme>
  );
}
