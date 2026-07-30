"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaviconController } from "@/components/aether/favicon-controller";
import { useAuth } from "@/app/auth-context";
import { SettingsProvider } from "@/lib/settings/user-settings";
import { clearDesktopLabStorage, defaultDesktopLayout, readDesktopLayout, readDesktopWallpaper, writeDesktopLayout, writeDesktopWallpaper } from "@/lib/desktop-lab/storage";
import { creditTerminalRows, desktopWallpapers, desktopWindows, financeOverviewRows, missionBoardRows, recentActivityRows } from "./desktop-mock-data";
import type { DesktopPoint, DesktopWallpaperId, DesktopWindowId, DesktopWindowLayout } from "./desktop-types";
import { DesktopWindow } from "./desktop-window";

type DesktopDockItem = { id: string; label: string; icon: string; windowId?: DesktopWindowId; href?: string };

const desktopDockItems: DesktopDockItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "DB", windowId: "finance-overview" },
  { id: "accounts", label: "Accounts", icon: "AC", windowId: "finance-overview" },
  { id: "credit-cards", label: "Credit Cards", icon: "CC", windowId: "credit-terminal" },
  { id: "transactions", label: "Transactions", icon: "TR", windowId: "recent-activity" },
  { id: "mission-board", label: "Mission Board", icon: "MB", windowId: "mission-board" },
  { id: "workshop", label: "Workshop", icon: "WS", href: "/workshop" }
];

export function DesktopPrototypePage() {
  return (
    <SettingsProvider>
      <FaviconController />
      <DesktopPrototype />
    </SettingsProvider>
  );
}

function DesktopPrototype() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [wallpaper, setWallpaper] = useState<DesktopWallpaperId>("aether-grid");
  const [layout, setLayout] = useState<DesktopWindowLayout>(() => defaultDesktopLayout());

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setWallpaper(readDesktopWallpaper());
      setLayout(readDesktopLayout());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeWindowId = useMemo(() => {
    return Object.values(layout)
      .filter((window) => window.isOpen && !window.isMinimized)
      .sort((a, b) => b.zIndex - a.zIndex)[0]?.id;
  }, [layout]);

  const persistLayout = useCallback((next: DesktopWindowLayout) => {
    setLayout(next);
    writeDesktopLayout(next);
  }, []);

  const normalizeZ = useCallback((next: DesktopWindowLayout, focusedId: DesktopWindowId) => {
    const ordered = Object.values(next)
      .filter((window) => window.isOpen && window.id !== focusedId)
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((window, index) => ({ ...window, zIndex: index + 1 }));
    const focused = { ...next[focusedId], zIndex: ordered.length + 1 };
    return { ...next, ...Object.fromEntries(ordered.map((window) => [window.id, window])), [focusedId]: focused };
  }, []);

  const focusWindow = useCallback((id: DesktopWindowId, options?: { persist?: boolean }) => {
    setLayout((current) => {
      const next = normalizeZ(current, id);
      if (options?.persist) writeDesktopLayout(next);
      return next;
    });
  }, [normalizeZ]);

  const openWindow = useCallback((id: DesktopWindowId) => {
    setLayout((current) => {
      const definition = desktopWindows.find((window) => window.id === id);
      const openCount = Object.values(current).filter((window) => window.isOpen).length;
      const shouldCascade = !current[id].isOpen;
      const cascadedPosition = shouldCascade && definition
        ? clampDesktopSpawn({
          x: definition.defaultPosition.x + (openCount % 4) * 28,
          y: definition.defaultPosition.y + (openCount % 4) * 26
        }, definition.size)
        : current[id].position;
      const next = normalizeZ({
        ...current,
        [id]: { ...current[id], isOpen: true, isMinimized: false, position: cascadedPosition }
      }, id);
      writeDesktopLayout(next);
      return next;
    });
  }, [normalizeZ]);

  const closeWindow = useCallback((id: DesktopWindowId) => {
    persistLayout({ ...layout, [id]: { ...layout[id], isOpen: false, isMinimized: false } });
  }, [layout, persistLayout]);

  const minimizeWindow = useCallback((id: DesktopWindowId) => {
    persistLayout({ ...layout, [id]: { ...layout[id], isMinimized: true } });
  }, [layout, persistLayout]);

  const moveWindow = useCallback((id: DesktopWindowId, position: DesktopPoint, options?: { commit?: boolean }) => {
    setLayout((current) => {
      const next = { ...current, [id]: { ...current[id], position } };
      if (options?.commit) writeDesktopLayout(next);
      return next;
    });
  }, []);

  const cycleWallpaper = () => {
    const currentIndex = desktopWallpapers.findIndex((item) => item.id === wallpaper);
    const next = desktopWallpapers[(currentIndex + 1) % desktopWallpapers.length].id;
    setWallpaper(next);
    writeDesktopWallpaper(next);
  };

  const resetLayout = () => {
    if (!window.confirm("確定要重設實驗桌面配置嗎？")) return;
    clearDesktopLabStorage();
    const next = defaultDesktopLayout();
    setWallpaper("aether-grid");
    setLayout(next);
  };

  if (isLoading || !user || !isMounted) {
    return <main className="desktop-lab desktop-lab-loading">正在啟動 Aether Desktop...</main>;
  }

  return (
    <main className={`desktop-lab desktop-lab-wallpaper-${wallpaper}`}>
      <div className="desktop-lab-mobile">
        <section>
          <p className="desktop-lab-eyebrow">DESKTOP MODE</p>
          <h1>Desktop Lab 建議使用電腦瀏覽器體驗。</h1>
          <p>手機版第一階段不啟用拖曳視窗，避免影響正式 PWA 操作。</p>
          <div className="flex flex-wrap gap-2">
            <Link className="desktop-lab-link-button" href="/workshop">返回介面工坊</Link>
            <button type="button" className="desktop-lab-link-button" onClick={() => document.body.classList.toggle("desktop-lab-force-preview")}>仍要預覽</button>
          </div>
        </section>
      </div>

      <DesktopHud />

      <div className="desktop-window-layer" aria-label="Desktop prototype windows">
        {desktopWindows.map((definition) => {
          const state = layout[definition.id];
          if (!state?.isOpen) return null;
          return (
            <DesktopWindow
              key={definition.id}
              id={definition.id}
              title={definition.title}
              icon={definition.icon}
              position={state.position}
              size={definition.size}
              zIndex={state.zIndex}
              isMinimized={state.isMinimized}
              isActive={activeWindowId === definition.id}
              onFocus={() => focusWindow(definition.id)}
              onMove={(position, options) => moveWindow(definition.id, position, options)}
              onMinimize={() => minimizeWindow(definition.id)}
              onClose={() => closeWindow(definition.id)}
            >
              <WindowContent id={definition.id} />
            </DesktopWindow>
          );
        })}
      </div>

      <DesktopControls wallpaper={wallpaper} onCycleWallpaper={cycleWallpaper} onReset={resetLayout} />
      <DesktopDock layout={layout} activeWindowId={activeWindowId} onOpen={openWindow} />
    </main>
  );
}

function DesktopHud() {
  return (
    <aside className="desktop-hud" aria-label="Desktop Lab status">
      <p className="desktop-lab-eyebrow">AETHER DESKTOP</p>
      <strong>Prototype Mode</strong>
      <span>4 Windows Available</span>
      <span>Classic Finance Data: Disconnected</span>
      <span>Mock Data Only</span>
    </aside>
  );
}

function DesktopControls({ wallpaper, onCycleWallpaper, onReset }: { wallpaper: DesktopWallpaperId; onCycleWallpaper: () => void; onReset: () => void }) {
  const current = desktopWallpapers.find((item) => item.id === wallpaper) ?? desktopWallpapers[0];
  return (
    <div className="desktop-controls" aria-label="Desktop Lab controls">
      <Link className="desktop-control-button" href="/workshop">返回介面工坊</Link>
      <button type="button" className="desktop-control-button" onClick={onCycleWallpaper}>Wallpaper: {current.name}</button>
      <button type="button" className="desktop-control-button" onClick={onReset}>Reset Layout</button>
    </div>
  );
}

function DesktopDock({ layout, activeWindowId, onOpen }: { layout: DesktopWindowLayout; activeWindowId?: DesktopWindowId; onOpen: (id: DesktopWindowId) => void }) {
  return (
    <nav className="desktop-dock" aria-label="Desktop Lab dock">
      {desktopDockItems.map((item) => {
        const state = item.windowId ? layout[item.windowId] : undefined;
        const isActive = Boolean(item.windowId && item.windowId === activeWindowId && state?.isOpen && !state.isMinimized);
        const isMinimized = Boolean(state?.isOpen && state.isMinimized);
        const isOpen = Boolean(state?.isOpen && !state.isMinimized && !isActive);
        const dockStatus = item.href ? "link" : isActive ? "active" : isMinimized ? "minimized" : isOpen ? "open" : "closed";
        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className="desktop-dock-item desktop-dock-item-link" aria-label={item.label} title={`${item.label} / link`}>
              <span>{item.icon}</span>
              <small>{item.label}</small>
              <em>link</em>
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className={`desktop-dock-item desktop-dock-item-${dockStatus}`}
            onClick={() => item.windowId && onOpen(item.windowId)}
            aria-label={`${item.label}，${dockStatusLabel(dockStatus)}`}
            title={`${item.label} / ${dockStatusLabel(dockStatus)}`}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
            <em>{dockStatusLabel(dockStatus)}</em>
          </button>
        );
      })}
    </nav>
  );
}

function dockStatusLabel(status: "active" | "minimized" | "open" | "closed" | "link") {
  const labels = {
    active: "active",
    minimized: "min",
    open: "open",
    closed: "closed",
    link: "link"
  };
  return labels[status];
}

function clampDesktopSpawn(position: DesktopPoint, size: { width: number; height: number }): DesktopPoint {
  if (typeof window === "undefined") return position;
  const safeRight = 96;
  const safeBottom = 132;
  return {
    x: Math.max(16, Math.min(position.x, Math.max(16, window.innerWidth - size.width - safeRight))),
    y: Math.max(16, Math.min(position.y, Math.max(16, window.innerHeight - size.height - safeBottom)))
  };
}

function WindowContent({ id }: { id: DesktopWindowId }) {
  if (id === "finance-overview") {
    return (
      <div className="desktop-data-list">
        {financeOverviewRows.map(([label, value, tone]) => (
          <div key={label} className={`desktop-data-row desktop-data-${tone}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (id === "credit-terminal") {
    return (
      <div className="desktop-terminal">
        {creditTerminalRows.map(([label, value]) => (
          <div key={label} className="desktop-data-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div className="desktop-lab-progress" role="progressbar" aria-label="Credit usage" aria-valuenow={4.8} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: "4.8%" }} />
        </div>
      </div>
    );
  }

  if (id === "recent-activity") {
    return (
      <div className="desktop-data-list">
        {recentActivityRows.map(([label, value]) => (
          <div key={label} className="desktop-data-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="desktop-mission-list">
      {missionBoardRows.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
