"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { AccountDto, UserGoalBarDto } from "@/lib/api-client";
import { availableHudWidgetDefinitions, getHudWidgetDefinition } from "./hud-widget-registry";
import { createHudWidgetId } from "./hud-storage";
import type {
  HudConfigField,
  HudDataSourceBinding,
  HudDataSourceType,
  HudWidgetConfig,
  HudWidgetDefinition,
  HudWidgetInstance,
  HudWidgetType
} from "./hud-widget-types";
import { HudWidgetRenderer } from "./hud-widget-renderer";

type SheetStep = "select" | "source" | "configure" | "preview";
type SourceAvailability = "available" | "selected" | "unavailable" | "coming-later";

const steps: SheetStep[] = ["select", "source", "configure", "preview"];
const stepTitles: Record<SheetStep, string> = {
  select: "選擇介面",
  source: "選擇資料",
  configure: "設定顯示",
  preview: "確認預覽"
};

const stepPurpose: Record<SheetStep, string> = {
  select: "先挑一個要裝備到 Personal HUD 的介面。",
  source: "這個介面要追蹤哪一項財務資訊？",
  configure: "調整顯示文字與可見資訊。",
  preview: "確認加入後會出現在你的 HUD。"
};

const nextLabels: Record<SheetStep, string> = {
  select: "下一步：選擇資料",
  source: "下一步：設定顯示",
  configure: "下一步：確認預覽",
  preview: "加入我的介面"
};

const stepHeightMode: Record<SheetStep, "large" | "medium" | "content"> = {
  select: "large",
  source: "large",
  configure: "medium",
  preview: "large"
};

function statusLabel(status: HudWidgetDefinition["status"]) {
  if (status === "stable") return "STABLE";
  if (status === "experimental") return "EXPERIMENTAL · 實驗中";
  return "WORKSHOP ONLY";
}

function createDefaultConfig(definition: HudWidgetDefinition | undefined, goal: UserGoalBarDto | undefined): HudWidgetConfig {
  const config: HudWidgetConfig = {
    schemaVersion: 1,
    title: goal?.title ?? definition?.name ?? "個人介面"
  };
  definition?.configurableFields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      config[field.key] = field.defaultValue as never;
      return;
    }
    if (field.type === "boolean") config[field.key] = true as never;
  });
  return config;
}

function fieldValue(config: HudWidgetConfig, field: HudConfigField) {
  const value = config[field.key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  return "";
}

function configSummary(definition: HudWidgetDefinition | undefined, config: HudWidgetConfig) {
  if (!definition) return [];
  return definition.configurableFields
    .map((field) => {
      const value = fieldValue(config, field);
      if (field.type === "boolean") return value ? field.label : "";
      if (field.type === "select") return field.options.find((option) => option.value === value)?.label ?? "";
      return typeof value === "string" && value.trim() ? `${field.label}：${value.trim()}` : "";
    })
    .filter(Boolean);
}

function validateConfig(definition: HudWidgetDefinition | undefined, config: HudWidgetConfig, selectedGoal: UserGoalBarDto | undefined) {
  const errors: Record<string, string> = {};
  if (!definition) return { errors: { definition: "找不到這個介面定義。" }, reason: "找不到這個介面定義。" };
  if (!selectedGoal) return { errors: { binding: "請先選擇可使用的財務目標。" }, reason: "請先選擇可使用的財務目標。" };

  definition.configurableFields.forEach((field) => {
    const value = fieldValue(config, field);
    if (field.type === "text") {
      const text = String(value);
      if (field.required && !text.trim()) errors[field.key] = "這個欄位不能空白。";
      if (field.maxLength && text.length > field.maxLength) errors[field.key] = `最多 ${field.maxLength} 個字。`;
      return;
    }
    if (field.type === "select" && typeof value === "string" && !field.options.some((option) => option.value === value)) {
      errors[field.key] = "這個選項目前不支援。";
    }
  });

  const firstError = Object.values(errors)[0] ?? "";
  return { errors, reason: firstError };
}

export function HudWidgetConfigSheet({
  goals,
  accounts,
  existing,
  nextPosition,
  onClose,
  onSave
}: {
  goals: UserGoalBarDto[];
  accounts: AccountDto[];
  existing?: HudWidgetInstance | null;
  nextPosition: number;
  onClose: () => void;
  onSave: (widget: HudWidgetInstance) => void;
}) {
  const definitions = availableHudWidgetDefinitions();
  const [step, setStep] = useState<SheetStep>(existing ? "configure" : "select");
  const [widgetType, setWidgetType] = useState<HudWidgetType>(existing?.widgetType ?? "resource-guide");
  const definition = getHudWidgetDefinition(widgetType);
  const existingGoalId = existing?.dataSource.type === "goal" ? existing.dataSource.goalId : "";
  const initialGoal = existingGoalId ? goals.find((goal) => goal.id === existingGoalId) : goals[0];
  const [binding, setBinding] = useState<HudDataSourceBinding>(existing?.dataSource ?? (initialGoal ? { type: "goal", goalId: initialGoal.id } : { type: "static-preview" }));
  const [sourceChoice, setSourceChoice] = useState<HudDataSourceType>(existing?.dataSource.type ?? "goal");
  const [successMessage, setSuccessMessage] = useState("");
  const [config, setConfig] = useState<HudWidgetConfig>(existing?.config ?? createDefaultConfig(definition, initialGoal));

  const stepIndex = steps.indexOf(step);
  const selectedGoal = binding.type === "goal" ? goals.find((goal) => goal.id === binding.goalId) : undefined;
  const validation = validateConfig(definition, config, selectedGoal);
  const canContinueSource = sourceChoice === "goal" && binding.type === "goal" && Boolean(selectedGoal);
  const canSave = Boolean(definition && canContinueSource && !validation.reason);
  const sourceReason = canContinueSource ? "" : goals.length > 0 ? "請先選擇可使用的財務目標。" : "目前沒有可用的財務目標。請先到帳戶頁建立目標血條。";
  const activeHeightMode = stepHeightMode[step];
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const portalRoot = typeof document === "undefined" ? null : document.body;

  const previewWidget = useMemo<HudWidgetInstance>(() => {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      id: existing?.id ?? "hud-preview",
      widgetType,
      title: config.title?.trim() || selectedGoal?.title || definition?.name || "個人介面",
      dataSource: binding,
      config,
      position: existing?.position ?? nextPosition,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  }, [binding, config, definition?.name, existing, nextPosition, selectedGoal?.title, widgetType]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [onClose]);

  function selectWidget(nextType: HudWidgetType) {
    const nextDefinition = getHudWidgetDefinition(nextType);
    setWidgetType(nextType);
    setConfig(createDefaultConfig(nextDefinition, selectedGoal ?? goals[0]));
    setStep("source");
  }

  function chooseSource(nextSource: HudDataSourceType) {
    if (nextSource !== "goal") return;
    setSourceChoice(nextSource);
    if (goals[0]) setBinding({ type: "goal", goalId: binding.type === "goal" ? binding.goalId : goals[0].id });
  }

  function goBack() {
    if (stepIndex <= 0) return;
    setStep(steps[stepIndex - 1]);
  }

  function goNext() {
    if (step === "source" && !canContinueSource) return;
    if (step === "configure" && validation.reason) return;
    if (stepIndex >= steps.length - 1) return;
    setStep(steps[stepIndex + 1]);
  }

  function save() {
    if (!canSave) return;
    const now = new Date().toISOString();
    setSuccessMessage(existing ? "已儲存介面變更" : "已加入我的介面");
    onSave({
      ...previewWidget,
      id: existing?.id ?? createHudWidgetId(),
      title: previewWidget.title,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
  }

  function updateConfig(field: HudConfigField, value: string | boolean) {
    setConfig((current) => ({ ...current, [field.key]: value }));
  }

  const sourceOptions: Array<{
    type: HudDataSourceType;
    title: string;
    description: string;
    badge: string;
    availability: SourceAvailability;
  }> = [
    {
      type: "goal",
      title: "財務目標",
      description: goals.length > 0 ? "追蹤一個已建立的目標血條。" : "目前尚未建立可使用的目標。",
      badge: goals.length > 0 ? "AVAILABLE" : "UNAVAILABLE",
      availability: goals.length > 0 ? (sourceChoice === "goal" && canContinueSource ? "selected" : "available") : "unavailable"
    },
    {
      type: "account",
      title: "帳戶餘額",
      description: "未來可顯示現金、銀行帳戶與其他帳戶餘額。",
      badge: "COMING LATER",
      availability: "coming-later"
    },
    {
      type: "finance-summary",
      title: "財務摘要",
      description: "未來可顯示淨值、總資產、總負債與 Cash Flow。",
      badge: "COMING LATER",
      availability: "coming-later"
    }
  ];

  const sheet = (
    <div className="hud-config-backdrop" role="dialog" aria-modal="true" aria-labelledby="hud-config-title" onClick={onClose}>
      <div className="game-window hud-config-sheet shadow-panel" data-step={step} data-height-mode={activeHeightMode} onClick={(event) => event.stopPropagation()}>
        <div className="hud-config-titlebar">
          <div className="hud-config-title-copy">
            <p className="mobile-section-eyebrow">PERSONAL HUD</p>
            <h2 id="hud-config-title" className="hud-config-heading">{existing ? "編輯介面" : "新增介面"}</h2>
            <p className="hud-step-chip">步驟 {stepIndex + 1} / {steps.length} · {stepTitles[step]}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="game-window-close ui-focus" aria-label="關閉新增介面" onClick={onClose}>×</button>
        </div>

        <div className="hud-config-body">
          <section className="hud-step-intro" aria-label={stepTitles[step]}>
            <span>{stepTitles[step]}</span>
            <p>{stepPurpose[step]}</p>
          </section>

          {step === "select" && (
            <div className="hud-gallery-list" role="listbox" aria-label="選擇介面">
              {definitions.map((item) => {
                const Preview = item.galleryPreviewComponent;
                return (
                  <article key={item.type} role="option" aria-selected={widgetType === item.type} className={`hud-widget-option ${widgetType === item.type ? "hud-widget-option-active" : ""}`}>
                    <span className="hud-widget-option-preview" style={{ minHeight: item.preview.minHeight }}>{Preview && <Preview displayMode="gallery" />}</span>
                    <span className="hud-widget-option-copy">
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                      <em>{statusLabel(item.status)} · 財務目標</em>
                      <button type="button" className="hud-widget-select-label ui-focus" onClick={() => selectWidget(item.type)} aria-label={`選擇${item.name}`}>選擇</button>
                    </span>
                  </article>
                );
              })}
            </div>
          )}

          {step === "source" && (
            <div className="hud-source-panel" role="radiogroup" aria-label="選擇資料來源">
              {sourceOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className={`hud-source-option hud-source-option-${option.availability}`}
                  aria-checked={option.availability === "selected"}
                  aria-disabled={option.availability === "coming-later" || option.availability === "unavailable"}
                  role="radio"
                  disabled={option.availability === "coming-later"}
                  onClick={() => chooseSource(option.type)}
                >
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                  <em>{option.badge}</em>
                </button>
              ))}

              {goals.length > 0 ? (
                <label className="ui-label hud-goal-picker">選擇目標<select className="ui-input" value={binding.type === "goal" ? binding.goalId : ""} onChange={(event) => setBinding({ type: "goal", goalId: event.target.value })}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
              ) : (
                <div className="hud-source-notice" role="status">
                  <strong>目前沒有可用的財務目標。</strong>
                  <small>請先到帳戶頁建立目標血條，再回來裝備到 Personal HUD。</small>
                  <Link className="hud-inline-cta ui-focus" href="/accounts" onClick={onClose}>前往建立目標</Link>
                </div>
              )}

              {!canContinueSource && goals.length > 0 && <p className="hud-source-notice" role="status">{sourceReason}</p>}
            </div>
          )}

          {step === "configure" && definition && (
            <div className="hud-config-fields">
              {definition.configurableFields.map((field) => {
                const error = validation.errors[field.key];
                const value = fieldValue(config, field);
                const errorId = `hud-field-${field.key}-error`;
                if (field.type === "boolean") {
                  return (
                    <label key={field.key} className="hud-check-row">
                      <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateConfig(field, event.target.checked)} />
                      <span><strong>{field.label}</strong>{field.description && <small>{field.description}</small>}</span>
                    </label>
                  );
                }
                if (field.type === "select") {
                  return (
                    <label key={field.key} className="ui-label">{field.label}
                      <select className="ui-input" value={String(value || field.defaultValue || field.options[0]?.value || "")} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => updateConfig(field, event.target.value)}>
                        {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      {error && <span id={errorId} className="hud-field-error">{error}</span>}
                    </label>
                  );
                }
                return (
                  <label key={field.key} className="ui-label">{field.label}
                    <input className="ui-input" value={String(value)} placeholder={field.placeholder} maxLength={field.maxLength ? field.maxLength + 4 : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => updateConfig(field, event.target.value)} />
                    {error ? <span id={errorId} className="hud-field-error">{error}</span> : field.maxLength && <small>{String(value).length} / {field.maxLength}</small>}
                  </label>
                );
              })}
              {validation.reason && <p className="hud-source-notice" role="status">{validation.reason}</p>}
            </div>
          )}

          {step === "preview" && definition && (
            <div className="hud-final-preview">
              <div className="hud-config-preview" aria-label={`${definition.name} 預覽`}>
                {binding.type === "goal" && selectedGoal ? <HudWidgetRenderer widget={previewWidget} goals={goals} accounts={accounts} displayMode="preview" /> : <p>目前沒有可用的財務目標。</p>}
              </div>
              <dl className="hud-preview-summary">
                <div><dt>介面資訊</dt><dd>{definition.name} · {statusLabel(definition.status)}</dd></div>
                <div><dt>資料來源</dt><dd>{selectedGoal ? `財務目標 · ${selectedGoal.title}` : "目前沒有可用資料來源"}</dd></div>
                <div><dt>顯示設定</dt><dd>{configSummary(definition, config).join(" / ") || "使用預設設定"}</dd></div>
                {definition.status === "experimental" && <div><dt>實驗中</dt><dd>此介面的設定格式未來可能調整。</dd></div>}
              </dl>
            </div>
          )}
        </div>

        <div className="hud-config-footer">
          <div className="hud-config-live" aria-live="polite">{successMessage || (step === "source" && !canContinueSource ? sourceReason : step === "configure" ? validation.reason : "")}</div>
          <div className="hud-config-actions">
            {step !== "select" && <Button type="button" variant="outline" onClick={goBack}>上一步</Button>}
            {step !== "preview" && <Button type="button" onClick={goNext} disabled={(step === "source" && !canContinueSource) || (step === "configure" && Boolean(validation.reason))}>{nextLabels[step]}</Button>}
            {step === "preview" && <Button type="button" onClick={save} disabled={!canSave}>{existing ? "儲存變更" : nextLabels.preview}</Button>}
          </div>
        </div>
      </div>
    </div>
  );

  return portalRoot ? createPortal(sheet, portalRoot) : null;
}
