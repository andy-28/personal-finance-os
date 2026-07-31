"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { UserDto } from "@/lib/api-client";

export function MobileDrawer({
  isOpen,
  nav,
  user,
  onClose,
  onLogout
}: {
  isOpen: boolean;
  nav: ReactNode;
  user: UserDto;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="mobile-drawer-backdrop lg:hidden" onClick={onClose}>
      <aside
        className="mobile-drawer-panel"
        aria-label="Mobile navigation drawer"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current;
          const endX = event.changedTouches[0]?.clientX;
          touchStartXRef.current = null;
          if (startX != null && endX != null && endX - startX < -70) onClose();
        }}
      >
        <div className="mobile-drawer-header">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close menu">
            ×
          </Button>
        </div>
        {nav}
        <div className="mobile-drawer-footer">
          <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </aside>
    </div>
  );
}
