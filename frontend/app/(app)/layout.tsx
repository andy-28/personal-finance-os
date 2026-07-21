"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "../auth-context";
import { QuickAdd } from "./quick-add";

const links = [
  ["/accounts", "總覽", "帳戶"],
  ["/transactions", "交易", "交易流水"],
  ["/upcoming", "待辦", "即將發生"],
  ["/credit-cards", "信用卡", "卡片與分期"],
  ["/recurring-transactions", "定期", "循環交易"],
  ["/categories", "分類", "收支分類"],
  ["/system-status", "系統", "服務狀態"]
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
    return <main className="grid min-h-screen place-items-center bg-background p-5"><LoadingState label="正在確認登入狀態..." /></main>;
  }

  const nav = (
    <nav className="grid gap-1">
      {links.map(([href, label, hint]) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setIsMenuOpen(false)}
            className={`rounded-ui px-3 py-2 transition ${isActive ? "bg-primary text-white" : "text-muted hover:bg-surface-muted hover:text-foreground"}`}
          >
            <span className="block text-sm font-medium">{label}</span>
            <span className={`block text-xs ${isActive ? "text-white/70" : "text-muted"}`}>{hint}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-surface px-4 py-5 lg:block">
        <div className="mb-8">
          <p className="text-lg font-semibold">PersonalFinanceOS</p>
          <p className="text-sm text-muted">在地化財務工作區</p>
        </div>
        {nav}
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-primary/30 p-3 lg:hidden" onClick={() => setIsMenuOpen(false)}>
          <div className="h-full w-72 rounded-ui border bg-surface p-4 shadow-panel" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold">PersonalFinanceOS</p>
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>關閉</Button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <section className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsMenuOpen(true)}>選單</Button>
              <div>
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <QuickAdd />
              <Button variant="outline" size="sm" onClick={async () => { await logout(); router.replace("/login"); }}>登出</Button>
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">{children}</div>
      </section>
    </main>
  );
}
