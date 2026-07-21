"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type CreditCardDto, type RecurringFrequency, type RecurringTemplateDto, type TransactionType } from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { commonLabels, recurringFrequencyLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

const supported: TransactionType[] = ["Income", "Expense", "Transfer", "CreditCardPurchase", "CreditCardPayment"];
const frequencies: RecurringFrequency[] = ["Weekly", "Monthly", "Yearly"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekdayLabels: Record<string, string> = { Sunday: "星期日", Monday: "星期一", Tuesday: "星期二", Wednesday: "星期三", Thursday: "星期四", Friday: "星期五", Saturday: "星期六" };
const emptyForm = { name: "", transactionType: "Expense" as TransactionType, amount: "", currency: "TWD", sourceAccountId: "", destinationAccountId: "", categoryId: "", merchant: "", description: "", note: "", frequency: "Monthly" as RecurringFrequency, interval: 1, dayOfMonth: 1, dayOfWeek: "Monday", startDate: todayInputValue(), endDate: "" };

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
      const body = JSON.stringify({ ...form, amount: Number(form.amount), interval: Number(form.interval), dayOfMonth: form.frequency === "Monthly" || form.frequency === "Yearly" ? Number(form.dayOfMonth) : null, dayOfWeek: form.frequency === "Weekly" ? form.dayOfWeek : null, sourceAccountId, destinationAccountId, categoryId: type === "Transfer" || type === "CreditCardPayment" ? null : form.categoryId || null, merchant: form.merchant || null, description: form.description || null, note: form.note || null, endDate: form.endDate || null });
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

  return (
    <section className="grid gap-6">
      <PageHeader title="循環交易" description="樣板只產生待處理 occurrences；每次入帳仍需要使用者確認。" actions={<label className="flex min-h-10 items-center gap-2 rounded-ui border bg-surface px-3 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> {commonLabels.showArchived}</label>} />
      {error && <ErrorState message={error} />}
      <Card>
        <CardTitle title={editingId ? "編輯樣板" : "新增樣板"} description="設定頻率、日期與帳戶後，系統會產生待入帳項目。" />
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="ui-label">名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="ui-label">交易類型<select className="ui-input" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as TransactionType })}>{supported.map((type) => <option key={type} value={type}>{transactionTypeLabels[type]}</option>)}</select></label>
          <label className="ui-label">金額<input className="ui-input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label className="ui-label">頻率<select className="ui-input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}>{frequencies.map((frequency) => <option key={frequency} value={frequency}>{recurringFrequencyLabels[frequency]}</option>)}</select></label>
          <label className="ui-label">間隔<input className="ui-input" type="number" min="1" value={form.interval} onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })} /></label>
          {form.frequency === "Weekly" ? <label className="ui-label">星期<select className="ui-input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>{weekdays.map((day) => <option key={day} value={day}>{weekdayLabels[day]}</option>)}</select></label> : <label className="ui-label">每月日期<input className="ui-input" type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })} /></label>}
          <label className="ui-label">開始日期<input className="ui-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
          <label className="ui-label">結束日期<input className="ui-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
          {form.transactionType === "CreditCardPurchase" ? <CardSelect cards={cards} value={form.sourceAccountId} onChange={(value) => setForm({ ...form, sourceAccountId: value })} /> : <AccountSelect accounts={activeAccounts} value={form.sourceAccountId} onChange={(value) => setForm({ ...form, sourceAccountId: value })} />}
          {(form.transactionType === "Transfer" || form.transactionType === "CreditCardPayment") && (form.transactionType === "CreditCardPayment" ? <CardSelect label="信用卡帳戶" cards={cards} value={form.destinationAccountId} onChange={(value) => setForm({ ...form, destinationAccountId: value })} /> : <AccountSelect label="轉入帳戶" accounts={activeAccounts} value={form.destinationAccountId} onChange={(value) => setForm({ ...form, destinationAccountId: value })} />)}
          {form.transactionType !== "Transfer" && form.transactionType !== "CreditCardPayment" && <label className="ui-label">分類<select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">選擇分類</option>{filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
          <label className="ui-label">商家 / 說明<input className="ui-input" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></label>
          <label className="ui-label md:col-span-2">備註<input className="ui-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div className="flex items-end"><Button type="submit" className="w-full">{editingId ? commonLabels.update : commonLabels.create}</Button></div>
        </form>
      </Card>
      {isLoading ? <LoadingState /> : templates.length === 0 ? <EmptyState title="尚未建立循環交易樣板" description="建立樣板後，即將發生頁會顯示待處理項目。" /> : <div className="grid gap-3">{templates.map((template) => <Card key={template.id}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{template.name}</h2><Badge tone={template.isActive ? "success" : "neutral"}>{template.isActive ? commonLabels.active : commonLabels.archived}</Badge></div><p className="mt-1 text-sm text-muted">{transactionTypeLabels[template.transactionType]} / {recurringFrequencyLabels[template.frequency]}，每 {template.interval} 次 / 下次 {template.nextOccurrenceDate ? formatDate(template.nextOccurrenceDate) : "-"}</p><p className="mt-1 text-sm">{money(template.amount, template.currency)} {template.sourceAccountName ?? ""}{template.destinationAccountName ? ` -> ${template.destinationAccountName}` : ""}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setEditingId(template.id); setForm({ name: template.name, transactionType: template.transactionType, amount: String(template.amount), currency: template.currency, sourceAccountId: template.sourceAccountId ?? "", destinationAccountId: template.destinationAccountId ?? "", categoryId: template.categoryId ?? "", merchant: template.merchant ?? "", description: template.description ?? "", note: template.note ?? "", frequency: template.frequency, interval: template.interval, dayOfMonth: template.dayOfMonth ?? 1, dayOfWeek: template.dayOfWeek ?? "Monday", startDate: template.startDate, endDate: template.endDate ?? "" }); }}>編輯</Button>{template.isActive ? <Button variant="outline" size="sm" onClick={() => archive(template.id)}>封存</Button> : <Button variant="outline" size="sm" onClick={() => restore(template.id)}>還原</Button>}</div></div></Card>)}</div>}
    </section>
  );
}

function AccountSelect({ accounts, value, onChange, label = "帳戶" }: { accounts: AccountDto[]; value: string; onChange: (value: string) => void; label?: string }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">選擇帳戶</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>;
}

function CardSelect({ cards, value, onChange, label = "信用卡" }: { cards: CreditCardDto[]; value: string; onChange: (value: string) => void; label?: string }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">選擇信用卡</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select></label>;
}
