import type { DesktopWallpaperId, DesktopWindowDefinition } from "./desktop-types";

export const desktopWallpapers: Array<{ id: DesktopWallpaperId; name: string; description: string }> = [
  { id: "aether-grid", name: "Aether Grid", description: "深色網格與 Aether 能量光暈。" },
  { id: "night-sky", name: "Night Sky", description: "夜空、星點與冷色桌面層次。" },
  { id: "fantasy-field", name: "Fantasy Field", description: "綠色原野與柔和冒險氣氛。" }
];

export const desktopWindows: DesktopWindowDefinition[] = [
  {
    id: "finance-overview",
    title: "Finance Overview",
    icon: "FO",
    defaultPosition: { x: 72, y: 116 },
    size: { width: 360, height: 300 }
  },
  {
    id: "credit-terminal",
    title: "Credit Terminal",
    icon: "CT",
    defaultPosition: { x: 480, y: 132 },
    size: { width: 360, height: 300 }
  },
  {
    id: "recent-activity",
    title: "Recent Activity",
    icon: "RA",
    defaultPosition: { x: 160, y: 446 },
    size: { width: 390, height: 300 }
  },
  {
    id: "mission-board",
    title: "Mission Board",
    icon: "MB",
    defaultPosition: { x: 620, y: 400 },
    size: { width: 380, height: 300 }
  }
];

export const financeOverviewRows = [
  ["Total Assets", "NT$120,000", "success"],
  ["Total Liabilities", "NT$35,000", "danger"],
  ["Net Worth", "NT$85,000", "credit"]
] as const;

export const creditTerminalRows = [
  ["Richart GoGo", "Outstanding NT$4,830"],
  ["Usage", "4.8%"]
] as const;

export const recentActivityRows = [
  ["Coffee", "-NT$120"],
  ["Transfer", "NT$1,000"],
  ["Insurance", "-NT$454"]
] as const;

export const missionBoardRows = [
  "Credit card payment due",
  "Monthly statement review",
  "Travel fund target"
];
