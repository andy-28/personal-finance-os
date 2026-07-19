"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../auth-context";
import { QuickAdd } from "./quick-add";

const links = [
  ["/accounts", "Accounts"],
  ["/upcoming", "Upcoming"],
  ["/credit-cards", "Credit Cards"],
  ["/recurring-transactions", "Recurring"],
  ["/transactions", "Transactions"],
  ["/categories", "Categories"],
  ["/system-status", "System Status"]
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) return <main className="grid min-h-screen place-items-center text-stone-700">Loading...</main>;

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-stone-950">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-lg font-semibold">Personal Finance OS</p><p className="text-sm text-stone-600">{user.displayName}</p></div>
          <nav className="flex flex-wrap items-center gap-2">
            {links.map(([href, label]) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} className={`rounded px-3 py-2 text-sm ${isActive ? "bg-stone-950 text-white" : "border border-stone-300 bg-white"}`}>{label}</Link>;
            })}
            <QuickAdd />
            <button className="rounded border border-stone-300 px-3 py-2 text-sm" onClick={async () => { await logout(); router.replace("/login"); }}>Logout</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-6">{children}</div>
    </main>
  );
}
