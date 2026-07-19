"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type CreditCardDto, type RecurringFrequency, type RecurringTemplateDto, type TransactionType } from "@/lib/api-client";
import { useAuth } from "../../auth-context";

const today = () => new Date().toISOString().slice(0, 10);
const supported: TransactionType[] = ["Income", "Expense", "Transfer", "CreditCardPurchase", "CreditCardPayment"];
const frequencies: RecurringFrequency[] = ["Weekly", "Monthly", "Yearly"];
const emptyForm = { name: "", transactionType: "Expense" as TransactionType, amount: "", currency: "TWD", sourceAccountId: "", destinationAccountId: "", categoryId: "", merchant: "", description: "", note: "", frequency: "Monthly" as RecurringFrequency, interval: 1, dayOfMonth: 1, dayOfWeek: "Monday", startDate: today(), endDate: "" };

export default function RecurringTransactionsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [templates, setTemplates] = useState<RecurringTemplateDto[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cards, setCards] = useState<CreditCardDto[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const [nextTemplates, nextAccounts, nextCategories, nextCards] = await Promise.all([
        apiFetch<RecurringTemplateDto[]>(`/api/recurring-transactions?includeArchived=${includeArchived}`, accessToken, {}, refreshSession),
        apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories", accessToken, {}, refreshSession),
        apiFetch<CreditCardDto[]>("/api/credit-cards", accessToken, {}, refreshSession)
      ]);
      setTemplates(nextTemplates);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setCards(nextCards);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, includeArchived]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const type = form.transactionType;
      const sourceAccountId = type === "CreditCardPurchase" ? form.sourceAccountId || cards[0]?.accountId || null : form.sourceAccountId || null;
      const destinationAccountId = type === "CreditCardPayment" ? form.destinationAccountId || cards[0]?.accountId || null : form.destinationAccountId || null;
      const body = JSON.stringify({
        ...form,
        amount: Number(form.amount),
        interval: Number(form.interval),
        dayOfMonth: form.frequency === "Monthly" || form.frequency === "Yearly" ? Number(form.dayOfMonth) : null,
        dayOfWeek: form.frequency === "Weekly" ? form.dayOfWeek : null,
        sourceAccountId,
        destinationAccountId,
        categoryId: type === "Transfer" || type === "CreditCardPayment" ? null : form.categoryId || null,
        merchant: form.merchant || null,
        description: form.description || null,
        note: form.note || null,
        endDate: form.endDate || null
      });
      if (editingId) await apiFetch<RecurringTemplateDto>(`/api/recurring-transactions/${editingId}`, accessToken, { method: "PUT", body }, refreshSession);
      else await apiFetch<RecurringTemplateDto>("/api/recurring-transactions", accessToken, { method: "POST", body }, refreshSession);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function archive(id: string) { await apiFetch<void>(`/api/recurring-transactions/${id}/archive`, accessToken, { method: "POST" }, refreshSession); await load(); }
  async function restore(id: string) { await apiFetch<RecurringTemplateDto>(`/api/recurring-transactions/${id}/restore`, accessToken, { method: "POST" }, refreshSession); await load(); }
  const activeAccounts = accounts.filter((account) => !account.isArchived && account.type !== "CreditCard");
  const categoryType = form.transactionType === "Income" ? "Income" : "Expense";
  const filteredCategories = categories.filter((category) => category.type === categoryType);

  return <section className="grid gap-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-semibold">Recurring Transactions</h1><p className="text-stone-600">Templates create pending occurrences; posting is always user-confirmed.</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived</label>
    </header>
    {error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded border border-stone-300 bg-white p-4 md:grid-cols-4">
      <h2 className="font-semibold md:col-span-4">{editingId ? "Edit template" : "New template"}</h2>
      <input className="rounded border px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select className="rounded border px-3 py-2" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as TransactionType })}>{supported.map((type) => <option key={type}>{type}</option>)}</select>
      <input className="rounded border px-3 py-2" placeholder="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <select className="rounded border px-3 py-2" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}>{frequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}</select>
      <input className="rounded border px-3 py-2" type="number" min="1" value={form.interval} onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })} />
      {form.frequency === "Weekly" ? <select className="rounded border px-3 py-2" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day) => <option key={day}>{day}</option>)}</select> : <input className="rounded border px-3 py-2" type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })} />}
      <input className="rounded border px-3 py-2" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      <input className="rounded border px-3 py-2" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
      {(form.transactionType === "CreditCardPurchase") ? <CardSelect cards={cards} value={form.sourceAccountId} onChange={(value) => setForm({ ...form, sourceAccountId: value })} /> : <AccountSelect accounts={activeAccounts} value={form.sourceAccountId} onChange={(value) => setForm({ ...form, sourceAccountId: value })} />}
      {(form.transactionType === "Transfer" || form.transactionType === "CreditCardPayment") && (form.transactionType === "CreditCardPayment" ? <CardSelect cards={cards} value={form.destinationAccountId} onChange={(value) => setForm({ ...form, destinationAccountId: value })} /> : <AccountSelect accounts={activeAccounts} value={form.destinationAccountId} onChange={(value) => setForm({ ...form, destinationAccountId: value })} />)}
      {form.transactionType !== "Transfer" && form.transactionType !== "CreditCardPayment" && <select className="rounded border px-3 py-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Category</option>{filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
      <input className="rounded border px-3 py-2" placeholder="Merchant / Description" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
      <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <button className="rounded bg-stone-950 px-4 py-2 text-white">{editingId ? "Update" : "Create"}</button>
    </form>
    {isLoading ? <p>Loading...</p> : templates.length === 0 ? <p className="rounded border bg-white p-5 text-stone-600">No templates yet.</p> : <div className="grid gap-3">{templates.map((template) => <article key={template.id} className="rounded border border-stone-300 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{template.name}</h2><p className="text-sm text-stone-600">{template.transactionType} / {template.frequency} every {template.interval} / next {template.nextOccurrenceDate ?? "-"} / {template.isActive ? "Active" : "Archived"}</p><p className="mt-1 text-sm">{money(template.amount, template.currency)} {template.sourceAccountName ?? ""}{template.destinationAccountName ? ` -> ${template.destinationAccountName}` : ""}</p></div><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-1 text-sm" onClick={() => { setEditingId(template.id); setForm({ name: template.name, transactionType: template.transactionType, amount: String(template.amount), currency: template.currency, sourceAccountId: template.sourceAccountId ?? "", destinationAccountId: template.destinationAccountId ?? "", categoryId: template.categoryId ?? "", merchant: template.merchant ?? "", description: template.description ?? "", note: template.note ?? "", frequency: template.frequency, interval: template.interval, dayOfMonth: template.dayOfMonth ?? 1, dayOfWeek: template.dayOfWeek ?? "Monday", startDate: template.startDate, endDate: template.endDate ?? "" }); }}>Edit</button>{template.isActive ? <button className="rounded border px-3 py-1 text-sm" onClick={() => archive(template.id)}>Archive</button> : <button className="rounded border px-3 py-1 text-sm" onClick={() => restore(template.id)}>Restore</button>}</div></div></article>)}</div>}
  </section>;
}

function AccountSelect({ accounts, value, onChange }: { accounts: AccountDto[]; value: string; onChange: (value: string) => void }) {
  return <select className="rounded border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>;
}
function CardSelect({ cards, value, onChange }: { cards: CreditCardDto[]; value: string; onChange: (value: string) => void }) {
  return <select className="rounded border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Credit card</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select>;
}
