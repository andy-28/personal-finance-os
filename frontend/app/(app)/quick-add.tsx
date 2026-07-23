"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { apiFetch, problemMessage, type AccountDto, type CategoryDto, type CreditCardDto, type TransactionType } from "@/lib/api-client";
import { commonLabels, transactionTypeLabels } from "@/lib/labels";
import { t } from "@/lib/i18n";
import { todayInputValue } from "@/lib/formatters";
import { useAuth } from "../auth-context";

type QuickType = Extract<TransactionType, "Income" | "Expense" | "Transfer" | "CreditCardPurchase" | "CreditCardPayment">;
const types: QuickType[] = ["Expense", "Income", "Transfer", "CreditCardPurchase", "CreditCardPayment"];

export function QuickAdd() {
  const { accessToken, refreshSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<QuickType>("Expense");
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cards, setCards] = useState<CreditCardDto[]>([]);
  const [form, setForm] = useState({ amount: "", accountId: "", fromAccountId: "", toAccountId: "", categoryId: "", creditCardAccountId: "", paymentAccountId: "", date: todayInputValue(), merchant: "", note: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  function close() {
    setError(null);
    setMessage(null);
    setIsOpen(false);
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
    load().catch((err) => setError(problemMessage(err)));
    setTimeout(() => amountRef.current?.focus(), 0);
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, accessToken]);

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
      setMessage(t("saved"));
      setForm((current) => ({ ...current, amount: "", merchant: "", note: "", date: todayInputValue() }));
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCategories = categories.filter((category) => category.type === (type === "Income" ? "Income" : "Expense") && !category.isArchived);
  const paymentAccounts = accounts.filter((account) => !account.isArchived && account.type !== "CreditCard");

  return (
    <>
      <Button size="sm" onClick={() => { setError(null); setMessage(null); setIsOpen(true); }}>{t("quickAdd")}</Button>
      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-background/70 p-3 backdrop-blur-lg sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
          <form onSubmit={submit} className="game-window w-full max-w-2xl p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 id="quick-add-title" className="font-semibold">{t("quickAdd")}</h2>
                <p className="text-sm text-muted">{t("quickAddDescription")}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={close}>{t("close")}</Button>
            </div>
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
            {message && <p className="mt-3 rounded-ui border border-success/30 bg-success/10 p-2 text-sm text-success">{message}</p>}
            {error && <div className="mt-3"><ErrorState message={error} /></div>}
            <Button type="submit" className="mt-4 w-full" isLoading={isSubmitting}>{commonLabels.save}</Button>
          </form>
        </div>
      )}
    </>
  );
}

function AccountSelect({ accounts, value, onChange, label = t("account") }: { accounts: AccountDto[]; value: string; onChange: (value: string) => void; label?: string }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{t("selectAccount")}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>;
}