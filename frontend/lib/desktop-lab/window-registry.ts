import type { DesktopWindowDefinition } from "@/components/desktop-lab/desktop-types";

export const desktopWindowRegistry: DesktopWindowDefinition[] = [
  {
    id: "finance-overview",
    title: "Finance Overview",
    icon: "FO",
    defaultPosition: { x: 88, y: 140 },
    size: { width: 380, height: 330 },
    minSize: { width: 320, height: 260 }
  },
  {
    id: "credit-terminal",
    title: "Credit Terminal",
    icon: "CT",
    defaultPosition: { x: 520, y: 150 },
    size: { width: 380, height: 330 },
    minSize: { width: 320, height: 260 }
  },
  {
    id: "recent-activity",
    title: "Recent Activity",
    icon: "RA",
    defaultPosition: { x: 176, y: 470 },
    size: { width: 420, height: 320 },
    minSize: { width: 340, height: 260 }
  },
  {
    id: "mission-board",
    title: "Mission Board",
    icon: "MB",
    defaultPosition: { x: 650, y: 430 },
    size: { width: 400, height: 320 },
    minSize: { width: 320, height: 260 }
  }
];
