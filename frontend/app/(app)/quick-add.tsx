"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch, problemMessage, type AccountDto, type CategoryDto, type CreditCardDto, type TransactionType } from "@/lib/api-client";
import { useAuth } from "../auth-context";

type QuickType = Extract<TransactionType, "Income" | "Expense" | "Transfer" | "CreditCardPurchase" | "CreditCardPayment">;
const types: QuickType[] = ["Expense", "Income", "Transfer", "CreditCardPurchase", "CreditCardPayment"];
const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function QuickAdd() {
  const { accessToken, refreshSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<QuickType>("Expense");
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cards, setCards] = useState<CreditCardDto[]>([]);
  const [form, setForm] = useState({ amount: "", accountId: "", fromAccountId: "", toAccountId: "", categoryId: "", creditCardAccountId: "", paymentAccountId: "", date: today(), merchant: "", note: "" });
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
    const activePaymentAccounts = activeAccounts.filter((account) => account.type !== "CreditCard");
    const activeCategories = nextCategories.filter((category) => !category.isArchived);
    const activeCardIds = new Set(activeAccounts.filter((account) => account.type === "CreditCard").map((account) => account.id));
    const visibleCards = nextCards.filter((card) => activeCardIds.has(card.accountId));
    setAccounts(activeAccounts);
    setCategories(activeCategories);
    setCards(visibleCards);
    const storedExpenseAccountId = localStorage.getItem("pfos:lastExpenseAccountId");
    const storedExpenseCategoryId = localStorage.getItem("pfos:lastExpenseCategoryId");
    const storedCreditCardAccountId = localStorage.getItem("pfos:lastCreditCardAccountId");
    const storedPaymentAccountId = localStorage.getItem("pfos:lastPaymentAccountId");
    setForm((current) => ({
      ...current,
      accountId: activePaymentAccounts.some((account) => account.id === current.accountId) ? current.accountId : (activePaymentAccounts.some((account) => account.id === storedExpenseAccountId) ? storedExpenseAccountId ?? "" : activePaymentAccounts[0]?.id ?? ""),
      categoryId: activeCategories.some((category) => category.id === current.categoryId) ? current.categoryId : (activeCategories.some((category) => category.id === storedExpenseCategoryId) ? storedExpenseCategoryId ?? "" : activeCategories.find((category) => category.type === "Expense")?.id ?? ""),
      creditCardAccountId: visibleCards.some((card) => card.accountId === current.creditCardAccountId) ? current.creditCardAccountId : (visibleCards.some((card) => card.accountId === storedCreditCardAccountId) ? storedCreditCardAccountId ?? "" : visibleCards[0]?.accountId ?? ""),
      paymentAccountId: activePaymentAccounts.some((account) => account.id === current.paymentAccountId) ? current.paymentAccountId : (activePaymentAccounts.some((account) => account.id === storedPaymentAccountId) ? storedPaymentAccountId ?? "" : activePaymentAccounts[0]?.id ?? "")
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
      localStorage.setItem("pfos:lastExpenseAccountId", form.accountId);
      localStorage.setItem("pfos:lastExpenseCategoryId", form.categoryId);
      localStorage.setItem("pfos:lastCreditCardAccountId", form.creditCardAccountId);
      localStorage.setItem("pfos:lastPaymentAccountId", form.paymentAccountId);
      setMessage("Saved.");
      setForm((current) => ({ ...current, amount: "", merchant: "", note: "", date: today() }));
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const expenseCategories = categories.filter((category) => category.type === (type === "Income" ? "Income" : "Expense") && !category.isArchived);
  const paymentAccounts = accounts.filter((account) => !account.isArchived && account.type !== "CreditCard");

  return (
    <>
      <button className="rounded bg-stone-950 px-3 py-2 text-sm text-white" onClick={() => { setError(null); setMessage(null); setIsOpen(true); }}>Quick Add</button>
      {isOpen && <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-3 sm:place-items-center">
        <form onSubmit={submit} className="w-full max-w-2xl rounded border border-stone-300 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Quick Add</h2>
            <button type="button" className="rounded border px-2 py-1 text-sm" onClick={close}>Close</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="rounded border px-3 py-2" value={type} onChange={(e) => setType(e.target.value as QuickType)}>{types.map((item) => <option key={item}>{item}</option>)}</select>
            <input ref={amountRef} className="rounded border px-3 py-2" placeholder="Amount" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            {(type === "Expense" || type === "Income") && <AccountSelect accounts={paymentAccounts} value={form.accountId} onChange={(value) => setForm({ ...form, accountId: value })} />}
            {type === "Transfer" && <><AccountSelect accounts={paymentAccounts} value={form.fromAccountId || form.accountId} onChange={(value) => setForm({ ...form, fromAccountId: value, accountId: value })} /><AccountSelect accounts={paymentAccounts} value={form.toAccountId} onChange={(value) => setForm({ ...form, toAccountId: value })} /></>}
            {(type === "CreditCardPurchase" || type === "CreditCardPayment") && <select className="rounded border px-3 py-2" value={form.creditCardAccountId} onChange={(e) => setForm({ ...form, creditCardAccountId: e.target.value })}><option value="">Credit card</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select>}
            {type === "CreditCardPayment" && <AccountSelect accounts={paymentAccounts} value={form.paymentAccountId} onChange={(value) => setForm({ ...form, paymentAccountId: value })} />}
            {type !== "Transfer" && type !== "CreditCardPayment" && <select className="rounded border px-3 py-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Category</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
            <input className="rounded border px-3 py-2" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            {type !== "Transfer" && type !== "CreditCardPayment" && <input className="rounded border px-3 py-2" placeholder="Merchant / Description" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />}
            <input className="rounded border px-3 py-2 sm:col-span-2" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {message && <p className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-800">{message}</p>}
          {error && <p className="mt-3 rounded border border-rose-300 bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
          <button className="mt-4 w-full rounded bg-stone-950 px-4 py-2 text-white disabled:opacity-60" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
        </form>
      </div>}
    </>
  );
}

function AccountSelect({ accounts, value, onChange }: { accounts: AccountDto[]; value: string; onChange: (value: string) => void }) {
  return <select className="rounded border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>;
}
