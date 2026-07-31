"use client";

import type { ReactNode } from "react";
import type { UserDto } from "@/lib/api-client";

export function MobileAppHeader({
  title,
  subtitle,
  user,
  rightAction,
  onMenu
}: {
  title: string;
  subtitle?: string;
  user: UserDto;
  rightAction?: ReactNode;
  onMenu: () => void;
}) {
  const initial = (user.displayName || user.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="mobile-app-header lg:hidden">
      <button type="button" className="mobile-app-header-button ui-focus" onClick={onMenu} aria-label="開啟選單">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>
      <div className="mobile-app-header-title">
        <p>{title}</p>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className="mobile-app-header-right">
        {rightAction}
        <span className="mobile-app-avatar" aria-label={`${user.displayName} avatar`} title={user.displayName}>
          {initial}
        </span>
      </div>
    </div>
  );
}
