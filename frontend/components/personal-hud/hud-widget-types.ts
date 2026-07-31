import type { ComponentType } from "react";

export type HudWidgetType = "resource-guide" | "soul-interface" | "goal-bar" | "game-number" | "game-gauge";
export type HudWidgetCategory = "goal" | "status" | "number" | "gauge";
export type HudWidgetStatus = "stable" | "experimental" | "workshop-only";
export type HudWidgetSize = "compact" | "standard" | "wide";
export type HudDataSourceType = "goal" | "account" | "finance-summary" | "static-preview";
export type HudWidgetDisplayMode = "gallery" | "preview" | "canvas" | "compact";

export type HudConfigField =
  | {
      type: "text";
      key: keyof HudWidgetConfig;
      label: string;
      placeholder?: string;
      required?: boolean;
      maxLength?: number;
      defaultValue?: string;
    }
  | {
      type: "boolean";
      key: keyof HudWidgetConfig;
      label: string;
      description?: string;
      defaultValue?: boolean;
    }
  | {
      type: "select";
      key: keyof HudWidgetConfig;
      label: string;
      options: Array<{ label: string; value: string }>;
      defaultValue?: string;
    };

export type HudWidgetConfig = {
  schemaVersion?: 1;
  title?: string;
  subtitle?: string;
  variant?: "cyan" | "aether" | "warning" | "adventure" | "quest";
  showCurrent?: boolean;
  showMaximum?: boolean;
  showRemaining?: boolean;
  showPercentage?: boolean;
  actionLabel?: string;
  bonusLabel?: string;
  numberStyle?: "default" | "aether" | "damage";
  showSlots?: boolean;
  showStateBadge?: boolean;
  valueMode?: "current" | "maximum" | "remaining" | "percentage";
  prefix?: string;
  suffix?: string;
  barStyle?: "cyan" | "aether" | "warning";
  gaugeVariant?: "cyan" | "purple" | "yellow";
};

export type HudDataSourceBinding =
  | { type: "goal"; goalId: string }
  | { type: "account"; accountId: string }
  | { type: "finance-summary"; metric: "net-worth" | "total-assets" | "total-liabilities" | "monthly-income" | "monthly-expense" }
  | { type: "static-preview" };

export type HudWidgetInstance = {
  schemaVersion: 1;
  id: string;
  widgetType: HudWidgetType;
  title: string;
  dataSource: HudDataSourceBinding;
  config: HudWidgetConfig;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type HudWidgetPreviewProps = {
  displayMode: HudWidgetDisplayMode;
};

export type HudWidgetDefinition = {
  type: HudWidgetType;
  name: string;
  description: string;
  category: HudWidgetCategory;
  supportedDataSources: HudDataSourceType[];
  layout: {
    supportedSizes: HudWidgetSize[];
    defaultSize: HudWidgetSize;
    fullWidth?: boolean;
  };
  preview: {
    aspectRatio?: string;
    minHeight: number;
    preferredWidth?: number;
  };
  configurableFields: HudConfigField[];
  status: HudWidgetStatus;
  galleryPreviewComponent?: ComponentType<HudWidgetPreviewProps>;
};
