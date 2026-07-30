"use client";

import { useEffect, useRef } from "react";
import type { DesktopPoint, DesktopSize } from "./desktop-types";

type DesktopWindowProps = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  position: DesktopPoint;
  size: DesktopSize;
  zIndex: number;
  isMinimized: boolean;
  isActive: boolean;
  onFocus: () => void;
  onMove: (position: DesktopPoint, options?: { commit?: boolean }) => void;
  onMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

const dockSafeArea = 112;
const titleBarVisible = 76;

export function DesktopWindow({
  id,
  title,
  icon,
  position,
  size,
  zIndex,
  isMinimized,
  isActive,
  onFocus,
  onMove,
  onMinimize,
  onClose,
  children
}: DesktopWindowProps) {
  const dragRef = useRef<{ pointerId: number; origin: DesktopPoint; start: DesktopPoint } | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const clamped = clampPosition(position, size);
    if (clamped.x !== position.x || clamped.y !== position.y) onMove(clamped, { commit: true });
  }, [onMove, position, size]);

  if (isMinimized) return null;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    onFocus();
    dragRef.current = {
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start: position
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = clampPosition({
      x: drag.start.x + event.clientX - drag.origin.x,
      y: drag.start.y + event.clientY - drag.origin.y
    }, size);
    onMove(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const next = clampPosition({
      x: drag.start.x + event.clientX - drag.origin.x,
      y: drag.start.y + event.clientY - drag.origin.y
    }, size);
    onMove(next, { commit: true });
  };

  return (
    <section
      ref={frameRef}
      className={`desktop-window ${isActive ? "desktop-window-active" : "desktop-window-inactive"}`}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height, zIndex }}
      onPointerDown={onFocus}
      aria-labelledby={`desktop-window-${id}-title`}
    >
      <div
        className="desktop-window-titlebar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="desktop-window-title">
          <span className="desktop-window-icon" aria-hidden="true">{icon}</span>
          <h2 id={`desktop-window-${id}-title`}>{title}</h2>
        </div>
        <div className="desktop-window-actions">
          <button type="button" aria-label={`最小化 ${title}`} onPointerDown={(event) => event.stopPropagation()} onClick={onMinimize}>−</button>
          <button type="button" aria-label={`關閉 ${title}`} onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>×</button>
        </div>
      </div>
      <div className="desktop-window-body">{children}</div>
    </section>
  );
}

function clampPosition(position: DesktopPoint, size: DesktopSize): DesktopPoint {
  if (typeof window === "undefined") return position;
  const minX = Math.min(0, window.innerWidth - titleBarVisible);
  const maxX = Math.max(0, window.innerWidth - titleBarVisible);
  const minY = 0;
  const maxY = Math.max(0, window.innerHeight - dockSafeArea - titleBarVisible);

  return {
    x: Math.min(Math.max(position.x, minX), Math.max(maxX, window.innerWidth - Math.min(size.width, titleBarVisible))),
    y: Math.min(Math.max(position.y, minY), maxY)
  };
}
