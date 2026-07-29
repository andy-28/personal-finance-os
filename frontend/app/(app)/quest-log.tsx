"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AetherActionBar, AetherEmptyState } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { GameWindow } from "@/components/ui/game-theme";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type UpcomingDto } from "@/lib/api-client";
import { financeDataChangedEvent } from "@/lib/app-events";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { installmentStatusLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../auth-context";

type QuestCategory = "全部" | "信用卡" | "固定支出" | "分期" | "收入" | "提醒" | "已完成";
type ActiveQuestCategory = Exclude<QuestCategory, "全部" | "已完成">;

type QuestItem = {
  id: string;
  category: ActiveQuestCategory;
  date: string;
  title: string;
  amount: number;
  currency: string;
  description: string;
  detail: string;
  actionLabel: string;
  secondaryLabel?: string;
  href?: string;
  action?: () => Promise<void>;
  secondaryAction?: () => Promise<void>;
};

const categories: QuestCategory[] = ["全部", "信用卡", "固定支出", "分期", "收入", "提醒", "已完成"];

export function QuestLog() {
  const { accessToken, refreshSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<UpcomingDto>({ recurringOccurrences: [], installments: [], creditCardReminders: [] });
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const modalRoot = typeof document === "undefined" ? null : document.body;

  async function load(options: { quiet?: boolean } = {}) {
    if (!accessToken) return;
    if (!options.quiet) setIsLoading(true);
    try {
      setData(await apiFetch<UpcomingDto>("/api/recurring-transactions/upcoming", accessToken, {}, refreshSession));
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      if (!options.quiet) setIsLoading(false);
    }
  }

  async function runAction(id: string, action: () => Promise<unknown>) {
    if (pendingActionId) return;
    setPendingActionId(id);
    setError(null);
    try {
      await action();
      await load({ quiet: true });
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

  useEffect(() => {
    if (accessToken) void load({ quiet: true });
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const onFinanceDataChanged = () => { void load({ quiet: true }); };
    window.addEventListener(financeDataChangedEvent, onFinanceDataChanged);
    return () => window.removeEventListener(financeDataChangedEvent, onFinanceDataChanged);
  }, [accessToken]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const quests = useMemo<QuestItem[]>(() => {
    const recurring = data.recurringOccurrences.map((item) => {
      const isIncome = item.transactionType === "Income";
      return {
        id: item.id,
        category: isIncome ? "收入" : "固定支出",
        date: item.scheduledDate,
        title: item.templateName,
        amount: item.amount,
        currency: item.currency,
        description: `${transactionTypeLabels[item.transactionType]} / ${item.sourceAccountName ?? ""}${item.destinationAccountName ? ` -> ${item.destinationAccountName}` : ""}`,
        detail: "完成後會依照固定交易模板建立正式交易。略過則只跳過這次任務。",
        actionLabel: "完成任務",
        secondaryLabel: "略過",
        href: "/recurring-transactions",
        action: () => runAction(item.id, () => apiFetch(`/api/recurring-transactions/occurrences/${item.id}/post`, accessToken, { method: "POST" }, refreshSession)),
        secondaryAction: () => runAction(item.id, () => apiFetch<void>(`/api/recurring-transactions/occurrences/${item.id}/skip`, accessToken, { method: "POST" }, refreshSession))
      } satisfies QuestItem;
    });

    const installments = data.installments.map((item) => ({
      id: item.itemId,
      category: "分期",
      date: item.dueDate,
      title: item.merchant,
      amount: item.amount,
      currency: "TWD",
      description: `分期付款 / ${installmentStatusLabels[item.status] ?? item.status}`,
      detail: "完成後會將此期分期入帳，信用卡負債會同步更新。",
      actionLabel: "入帳分期",
      href: "/credit-cards",
      action: () => runAction(item.itemId, () => apiFetch(`/api/credit-cards/installments/${item.planId}/schedule-items/${item.itemId}/post`, accessToken, { method: "POST", body: JSON.stringify({ postingDate: null, categoryId: null, note: null }) }, refreshSession))
    } satisfies QuestItem));

    const reminders = data.creditCardReminders.map((item) => ({
      id: `${item.accountId}-${item.kind}-${item.date}`,
      category: item.kind === "PaymentDue" ? "信用卡" : "提醒",
      date: item.date,
      title: item.accountName,
      amount: 0,
      currency: "TWD",
      description: item.kind === "Closing" ? "信用卡結帳日" : "信用卡繳款截止日",
      detail: item.kind === "Closing" ? "這張卡即將結帳，適合檢查未出帳消費。" : "這張卡即將到繳款日，請到信用卡頁確認應繳金額並建立付款交易。",
      actionLabel: "前往信用卡",
      href: "/credit-cards"
    } satisfies QuestItem));

    return [...recurring, ...installments, ...reminders].sort((a, b) => a.date.localeCompare(b.date));
  }, [data, pendingActionId]);

  const visibleQuests = quests.filter((quest) => activeCategory === "全部" || activeCategory === "已完成" ? activeCategory === "全部" : quest.category === activeCategory);
  const selected = visibleQuests.find((quest) => quest.id === selectedId) ?? visibleQuests[0] ?? null;
  const questCount = quests.length;

  function dueBadge(date: string) {
    const today = todayInputValue();
    const diff = Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
    if (diff < 0) return "已逾期";
    if (diff === 0) return "今天";
    if (diff === 1) return "明天";
    return `${diff} 天後`;
  }

  const dialog = (
    <div className="game-dialog-backdrop p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="quest-log-title" onClick={() => setIsOpen(false)}>
      <GameWindow title="財務任務" description="Quest log" className="quest-log-window w-[min(calc(100vw-1.5rem),60rem)]" onRequestClose={() => setIsOpen(false)} onClick={(event) => event.stopPropagation()}>
        <div className="quest-window-layout">
          <div className="quest-tabs-bar">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`quest-tab ui-focus ${activeCategory === category ? "quest-tab-active" : ""}`}
                onClick={() => {
                  setActiveCategory(category);
                  setSelectedId(null);
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <aside className="quest-list-panel">
            {isLoading ? <LoadingState label="讀取任務中..." /> : visibleQuests.length === 0 ? (
              <AetherEmptyState title="沒有符合的任務" description="切換分類或等待下一個財務提醒產生。" />
            ) : (
              <div className="grid gap-1.5">
                {visibleQuests.map((quest) => (
                  <button
                    key={quest.id}
                    type="button"
                    className={`quest-list-item ui-focus ${selected?.id === quest.id ? "quest-list-item-active" : ""}`}
                    onClick={() => setSelectedId(quest.id)}
                  >
                    <span className="quest-pill">{quest.category}</span>
                    <span className="min-w-0 flex-1 truncate text-left">{quest.title}</span>
                    <span className="quest-list-date">{dueBadge(quest.date)}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="quest-info-panel">
            {error && <ErrorState message={error} />}
            {!error && selected && (
              <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] gap-3">
                <div className="quest-info-hero">
                  <div className="min-w-0">
                    <span className="quest-pill">{selected.category}</span>
                    <h3 className="mt-2 truncate text-xl font-black text-foreground">{selected.title}</h3>
                    <p className="mt-1 text-sm text-muted">{selected.description}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-muted">{formatDate(selected.date)}</p>
                    <p className="font-bold text-primary">{dueBadge(selected.date)}</p>
                  </div>
                </div>

                <div className="quest-info-body">
                  <QuestInfoSection title="內容">
                    <p>{selected.detail}</p>
                  </QuestInfoSection>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <QuestInfoSection title="日期">
                      <strong>{formatDate(selected.date)}</strong>
                    </QuestInfoSection>
                    <QuestInfoSection title="狀態">
                      <strong>待完成</strong>
                    </QuestInfoSection>
                    {selected.amount > 0 && (
                      <QuestInfoSection title="金額" strong>
                        <strong>{money(selected.amount, selected.currency)}</strong>
                      </QuestInfoSection>
                    )}
                  </div>
                </div>

                <AetherActionBar className="quest-info-actions">
                  {selected.href && <Link href={selected.href} onClick={() => setIsOpen(false)}><Button variant="outline">前往頁面</Button></Link>}
                  {selected.secondaryAction && <Button variant="ghost" onClick={selected.secondaryAction} disabled={pendingActionId !== null}>{selected.secondaryLabel}</Button>}
                  {selected.action && <Button onClick={selected.action} isLoading={pendingActionId === selected.id} disabled={pendingActionId !== null}>{selected.actionLabel}</Button>}
                </AetherActionBar>
              </div>
            )}
            {!error && !selected && !isLoading && (
              <AetherEmptyState title="沒有待完成任務" description="目前沒有到期、提醒或固定交易待處理。" />
            )}
          </section>
        </div>
      </GameWindow>
    </div>
  );

  return (
    <>
      <Button variant="outline" size="sm" className="relative" onClick={() => setIsOpen(true)}>
        任務{questCount > 0 ? ` ${questCount}` : ""}
        {questCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-background bg-danger" />}
      </Button>
      {isOpen && modalRoot && createPortal(dialog, modalRoot)}
    </>
  );
}

function QuestInfoSection({ title, strong, children }: { title: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <section className={`quest-info-section ${strong ? "quest-info-section-strong" : ""}`}>
      <h4>{title}</h4>
      <div>{children}</div>
    </section>
  );
}
