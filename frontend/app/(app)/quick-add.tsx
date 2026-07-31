"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { apiFetch, problemMessage, type AccountDto, type CategoryDto, type CreditCardDto, type TransactionType } from "@/lib/api-client";
import { notifyFinanceDataChanged } from "@/lib/app-events";
import { commonLabels, transactionTypeLabels } from "@/lib/labels";
import { t } from "@/lib/i18n";
import { todayInputValue } from "@/lib/formatters";
import { useAuth } from "../auth-context";

type QuickType = Extract<TransactionType, "Income" | "Expense" | "Transfer" | "CreditCardPurchase" | "CreditCardPayment">;
const types: QuickType[] = ["Expense", "Income", "Transfer", "CreditCardPurchase", "CreditCardPayment"];

export function QuickAdd({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { accessToken, refreshSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<QuickType>("Expense");
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cards, setCards] = useState<CreditCardDto[]>([]);
  const [form, setForm] = useState({ amount: "", accountId: "", fromAccountId: "", toAccountId: "", categoryId: "", creditCardAccountId: "", paymentAccountId: "", date: todayInputValue(), merchant: "", note: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSummoning, setIsSummoning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const summonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function close() {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setError(null);
      setMessage(null);
      setIsOpen(false);
      setIsClosing(false);
      setShowMoreOptions(false);
    }, 180);
  }

  function openQuickAdd() {
    if (isOpen || isSummoning) return;
    setError(null);
    setMessage(null);
    setIsClosing(false);
    setShowMoreOptions(false);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsOpen(true);
      return;
    }

    setIsSummoning(true);
    summonTimeoutRef.current = setTimeout(() => {
      setIsSummoning(false);
      setIsOpen(true);
    }, 560);
  }

  async function load() {
    if (!accessToken) return;
    const [nextAccounts, nextCategories, nextCards] = await Promise.all([
      apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
      apiFetch<CategoryDto[]>("/api/categories", accessToken, {}, refreshSession),
      apiFetch<CreditCardDto[]>("/api/credit-cards", accessToken, {}, refreshSession)
    ]);
    const activeAccounts = nextAccounts.filter((account) => !account.isArchived);
    const paymentAccounts = activeAccounts.filter((account) => account.type !== "CreditCard");
    const activeCategories = nextCategories.filter((category) => !category.isArchived);
    const activeCardIds = new Set(activeAccounts.filter((account) => account.type === "CreditCard").map((account) => account.id));
    const visibleCards = nextCards.filter((card) => activeCardIds.has(card.accountId));
    setAccounts(activeAccounts);
    setCategories(activeCategories);
    setCards(visibleCards);
    setForm((current) => ({
      ...current,
      accountId: current.accountId || paymentAccounts[0]?.id || "",
      fromAccountId: current.fromAccountId || paymentAccounts[0]?.id || "",
      toAccountId: current.toAccountId || paymentAccounts[1]?.id || paymentAccounts[0]?.id || "",
      categoryId: current.categoryId || activeCategories.find((category) => category.type === "Expense")?.id || "",
      creditCardAccountId: current.creditCardAccountId || visibleCards[0]?.accountId || "",
      paymentAccountId: current.paymentAccountId || paymentAccounts[0]?.id || ""
    }));
  }

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    load().catch((err) => setError(problemMessage(err)));
    setTimeout(() => amountRef.current?.focus(), 0);
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, accessToken]);

  useEffect(() => {
    return () => {
      if (summonTimeoutRef.current) clearTimeout(summonTimeoutRef.current);
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const amount = Number(form.amount);
      let path = "/api/transactions/expense";
      let body: Record<string, unknown> = {};
      if (type === "Expense") body = { accountId: form.accountId, categoryId: form.categoryId, amount, transactionDate: form.date, payee: form.merchant || null, note: form.note || null };
      if (type === "Income") { path = "/api/transactions/income"; body = { accountId: form.accountId, categoryId: form.categoryId, amount, transactionDate: form.date, payee: form.merchant || null, note: form.note || null }; }
      if (type === "Transfer") { path = "/api/transactions/transfer"; body = { fromAccountId: form.fromAccountId || form.accountId, toAccountId: form.toAccountId, amount, transactionDate: form.date, note: form.note || null }; }
      if (type === "CreditCardPurchase") { path = "/api/credit-cards/purchase"; body = { creditCardAccountId: form.creditCardAccountId, categoryId: form.categoryId, amount, purchaseDate: form.date, postedDate: null, merchant: form.merchant || null, note: form.note || null }; }
      if (type === "CreditCardPayment") { path = "/api/credit-cards/payment"; body = { creditCardAccountId: form.creditCardAccountId, paymentAccountId: form.paymentAccountId || null, amount, paymentDate: form.date, note: form.note || null }; }
      await apiFetch(path, accessToken, { method: "POST", body: JSON.stringify(body) }, refreshSession);
      notifyFinanceDataChanged();
      setForm((current) => ({ ...current, amount: "", merchant: "", note: "", date: todayInputValue() }));
      close();
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCategories = categories.filter((category) => category.type === (type === "Income" ? "Income" : "Expense") && !category.isArchived);
  const paymentAccounts = accounts.filter((account) => !account.isArchived && account.type !== "CreditCard");
  const modalRoot = typeof document === "undefined" ? null : document.body;
  const summonEffect = (
    <div className="pointer-events-none fixed inset-0 z-[65] grid place-items-center bg-background/20 backdrop-blur-[2px]" aria-hidden="true">
      <div className="grid place-items-center rounded-full">
        <img
          src="/aether/effects/ancient-burst-effect-transparent.webp"
          alt=""
          className="h-auto w-[min(560px,86vw)] scale-125 object-contain mix-blend-screen opacity-85 drop-shadow-[0_0_34px_rgba(168,85,247,0.8)]"
          decoding="async"
        />
      </div>
    </div>
  );
  const isMobileSheet = variant === "mobile";
  const primaryQuickAddFields = (
    <>
      <label className="ui-label">{t("transactionKind")}<select className="ui-input" value={type} onChange={(e) => setType(e.target.value as QuickType)}>{types.map((item) => <option key={item} value={item}>{transactionTypeLabels[item]}</option>)}</select></label>
      <label className="ui-label">{t("amount")}<input ref={amountRef} className="ui-input" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
      {(type === "Expense" || type === "Income") && <AccountSelect accounts={paymentAccounts} value={form.accountId} onChange={(value) => setForm({ ...form, accountId: value })} />}
      {type === "Transfer" && <><AccountSelect label={t("fromAccount")} accounts={paymentAccounts} value={form.fromAccountId || form.accountId} onChange={(value) => setForm({ ...form, fromAccountId: value, accountId: value })} /><AccountSelect label={t("toAccount")} accounts={paymentAccounts} value={form.toAccountId} onChange={(value) => setForm({ ...form, toAccountId: value })} /></>}
      {(type === "CreditCardPurchase" || type === "CreditCardPayment") && <label className="ui-label">{t("creditCards")}<select className="ui-input" value={form.creditCardAccountId} onChange={(e) => setForm({ ...form, creditCardAccountId: e.target.value })}><option value="">{t("selectCreditCard")}</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select></label>}
      {type === "CreditCardPayment" && <AccountSelect label={t("paymentAccount")} accounts={paymentAccounts} value={form.paymentAccountId} onChange={(value) => setForm({ ...form, paymentAccountId: value })} />}
      {type !== "Transfer" && type !== "CreditCardPayment" && <label className="ui-label">{t("category")}<select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">{t("selectCategory")}</option>{filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
      {type !== "Transfer" && type !== "CreditCardPayment" && <label className="ui-label">{t("merchantOrDescription")}<input className="ui-input" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></label>}
    </>
  );
  const advancedQuickAddFields = (
    <>
      <label className="ui-label">{t("date")}<input className="ui-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label className="ui-label">{t("note")}<input className="ui-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
    </>
  );
  const quickAddDialog = (
    <div className={`game-dialog-backdrop ${isMobileSheet ? "mobile-quick-add-backdrop" : "p-3 sm:p-6"} ${isClosing ? "mobile-overlay-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="quick-add-title" onClick={close}>
      <form onSubmit={submit} className={`game-window flex flex-col shadow-panel ${isMobileSheet ? "mobile-quick-add-sheet" : "max-h-[calc(100dvh-1.5rem)] w-[min(calc(100vw-1.5rem),44rem)] sm:max-h-[calc(100dvh-3rem)]"} ${isClosing ? "mobile-sheet-closing" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="game-window-titlebar">
          <div className="min-w-0">
            <h2 id="quick-add-title" className="game-window-title-text">{t("quickAdd")}</h2>
            <p className="text-sm text-muted">{t("quickAddDescription")}</p>
          </div>
          <button type="button" className="game-window-close ui-focus" aria-label={t("close")} title={t("close")} onClick={close}>
            ×
          </button>
        </div>
        <div className="game-window-body min-h-0 flex-1 overflow-y-auto">
          {isMobileSheet ? (
            <div className="mobile-quick-add-fields">
              {primaryQuickAddFields}
              <button type="button" className="mobile-more-options-toggle ui-focus" onClick={() => setShowMoreOptions((current) => !current)} aria-expanded={showMoreOptions}>
                <span>更多選項</span>
                <strong aria-hidden="true">{showMoreOptions ? "−" : "+"}</strong>
              </button>
              {showMoreOptions && <div className="mobile-more-options-panel">{advancedQuickAddFields}</div>}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ui-label">{t("transactionKind")}<select className="ui-input" value={type} onChange={(e) => setType(e.target.value as QuickType)}>{types.map((item) => <option key={item} value={item}>{transactionTypeLabels[item]}</option>)}</select></label>
              <label className="ui-label">{t("amount")}<input ref={amountRef} className="ui-input" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
              {(type === "Expense" || type === "Income") && <AccountSelect accounts={paymentAccounts} value={form.accountId} onChange={(value) => setForm({ ...form, accountId: value })} />}
              {type === "Transfer" && <><AccountSelect label={t("fromAccount")} accounts={paymentAccounts} value={form.fromAccountId || form.accountId} onChange={(value) => setForm({ ...form, fromAccountId: value, accountId: value })} /><AccountSelect label={t("toAccount")} accounts={paymentAccounts} value={form.toAccountId} onChange={(value) => setForm({ ...form, toAccountId: value })} /></>}
              {(type === "CreditCardPurchase" || type === "CreditCardPayment") && <label className="ui-label">{t("creditCards")}<select className="ui-input" value={form.creditCardAccountId} onChange={(e) => setForm({ ...form, creditCardAccountId: e.target.value })}><option value="">{t("selectCreditCard")}</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select></label>}
              {type === "CreditCardPayment" && <AccountSelect label={t("paymentAccount")} accounts={paymentAccounts} value={form.paymentAccountId} onChange={(value) => setForm({ ...form, paymentAccountId: value })} />}
              {type !== "Transfer" && type !== "CreditCardPayment" && <label className="ui-label">{t("category")}<select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">{t("selectCategory")}</option>{filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
              <label className="ui-label">{t("date")}<input className="ui-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              {type !== "Transfer" && type !== "CreditCardPayment" && <label className="ui-label">{t("merchantOrDescription")}<input className="ui-input" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></label>}
              <label className="ui-label sm:col-span-2">{t("note")}<input className="ui-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            </div>
          )}
          {message && <p className="mt-3 rounded-ui border border-success/30 bg-success/10 p-2 text-sm text-success">{message}</p>}
          {error && <div className="mt-3"><ErrorState message={error} /></div>}
        </div>
        <div className="game-dialog-footer">
          <Button type="submit" className="w-full sm:w-auto sm:min-w-40" isLoading={isSubmitting}>{commonLabels.save}</Button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {variant === "mobile" ? (
        <button type="button" className="mobile-bottom-nav-add" onClick={openQuickAdd} disabled={isSummoning} aria-label={t("quickAdd")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      ) : (
        <Button size="sm" onClick={openQuickAdd} disabled={isSummoning}>{t("quickAdd")}</Button>
      )}
      {isSummoning && modalRoot && createPortal(summonEffect, modalRoot)}
      {isOpen && modalRoot && createPortal(quickAddDialog, modalRoot)}
    </>
  );
}

function AccountSelect({ accounts, value, onChange, label = t("account") }: { accounts: AccountDto[]; value: string; onChange: (value: string) => void; label?: string }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{t("selectAccount")}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>;
}
