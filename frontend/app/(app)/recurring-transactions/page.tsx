"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  apiFetch,
  money,
  problemMessage,
  type AccountDto,
  type CategoryDto,
  type CreditCardDto,
  type RecurringFrequency,
  type RecurringTemplateDto,
  type TransactionType
} from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { recurringFrequencyLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

type RecurringFilter = "All" | "Income" | "Expense" | "Transfer" | "CreditCard" | "Archived";
type FormState = typeof emptyForm;

const supportedTypes: TransactionType[] = ["Income", "Expense", "Transfer", "CreditCardPurchase", "CreditCardPayment"];
const frequencies: RecurringFrequency[] = ["Weekly", "Monthly", "Yearly"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekdayLabels: Record<string, string> = {
  Sunday: "週日",
  Monday: "週一",
  Tuesday: "週二",
  Wednesday: "週三",
  Thursday: "週四",
  Friday: "週五",
  Saturday: "週六"
};

const emptyForm = {
  name: "",
  transactionType: "Expense" as TransactionType,
  amount: "",
  currency: "TWD",
  sourceAccountId: "",
  destinationAccountId: "",
  categoryId: "",
  merchant: "",
  description: "",
  note: "",
  frequency: "Monthly" as RecurringFrequency,
  interval: 1,
  dayOfMonth: 1,
  dayOfWeek: "Monday",
  startDate: todayInputValue(),
  endDate: ""
};

export default function RecurringTransactionsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [templates, setTemplates] = useState<RecurringTemplateDto[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cards, setCards] = useState<CreditCardDto[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [filter, setFilter] = useState<RecurringFilter>("All");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      if (!selectedId && nextTemplates.length > 0) setSelectedId(nextTemplates[0].id);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, includeArchived]);

  const flatCategories = useMemo(() => categories.flatMap((category) => [category, ...category.children]), [categories]);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedId) ?? null, [templates, selectedId]);
  const visibleTemplates = useMemo(() => templates.filter((template) => {
    if (filter === "Archived") return !template.isActive;
    if (!includeArchived && !template.isActive) return false;
    if (filter === "All") return true;
    if (filter === "CreditCard") return template.transactionType === "CreditCardPurchase" || template.transactionType === "CreditCardPayment";
    return template.transactionType === filter;
  }), [templates, filter, includeArchived]);

  function resetForm(nextType: TransactionType = "Expense") {
    setForm({ ...emptyForm, transactionType: nextType, startDate: todayInputValue() });
    setEditingId(null);
  }

  function startCreate(nextType: TransactionType = "Expense") {
    resetForm(nextType);
    setIsCreating(true);
    setSelectedId(null);
  }

  function startEdit(template: RecurringTemplateDto) {
    setForm({
      name: template.name,
      transactionType: template.transactionType,
      amount: String(template.amount),
      currency: template.currency,
      sourceAccountId: template.sourceAccountId ?? "",
      destinationAccountId: template.destinationAccountId ?? "",
      categoryId: template.categoryId ?? "",
      merchant: template.merchant ?? "",
      description: template.description ?? "",
      note: template.note ?? "",
      frequency: template.frequency,
      interval: template.interval,
      dayOfMonth: template.dayOfMonth ?? 1,
      dayOfWeek: template.dayOfWeek ?? "Monday",
      startDate: template.startDate.slice(0, 10),
      endDate: template.endDate?.slice(0, 10) ?? ""
    });
    setEditingId(template.id);
    setSelectedId(template.id);
    setIsCreating(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const body = JSON.stringify({
        name: form.name,
        transactionType: form.transactionType,
        amount: Number(form.amount),
        currency: form.currency,
        sourceAccountId: form.sourceAccountId || null,
        destinationAccountId: form.destinationAccountId || null,
        categoryId: form.categoryId || null,
        merchant: form.merchant || null,
        description: form.description || null,
        note: form.note || null,
        frequency: form.frequency,
        interval: Number(form.interval),
        dayOfMonth: form.frequency === "Monthly" ? Number(form.dayOfMonth) : null,
        dayOfWeek: form.frequency === "Weekly" ? form.dayOfWeek : null,
        startDate: form.startDate,
        endDate: form.endDate || null
      });
      const saved = editingId
        ? await apiFetch<RecurringTemplateDto>(`/api/recurring-transactions/${editingId}`, accessToken, { method: "PUT", body }, refreshSession)
        : await apiFetch<RecurringTemplateDto>("/api/recurring-transactions", accessToken, { method: "POST", body }, refreshSession);
      resetForm(form.transactionType);
      setIsCreating(false);
      setSelectedId(saved.id);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function archive(id: string) {
    await apiFetch<void>(`/api/recurring-transactions/${id}/archive`, accessToken, { method: "POST" }, refreshSession);
    await load();
  }

  async function restore(id: string) {
    await apiFetch<void>(`/api/recurring-transactions/${id}/restore`, accessToken, { method: "POST" }, refreshSession);
    await load();
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        title="固定交易"
        description="Recurring Templates"
        actions={<Button type="button" onClick={() => startCreate()}>新增固定交易</Button>}
      />
      {error && <ErrorState message={error} />}
      <GameWindow title="固定交易" description="Aether Management Window">
        <div className="aether-management-window">
          <div className="aether-toolbar">
            {(["All", "Income", "Expense", "Transfer", "CreditCard", "Archived"] as RecurringFilter[]).map((nextFilter) => (
              <button key={nextFilter} type="button" className={`aether-filter-tab ${filter === nextFilter ? "aether-filter-tab-active" : ""}`} onClick={() => setFilter(nextFilter)}>
                {filterLabel(nextFilter)}
              </button>
            ))}
            <label className="aether-toolbar-check">
              <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
              顯示封存項目
            </label>
          </div>
          <div className={`aether-master-detail ${isLoading ? "aether-loading-shell" : ""}`}>
            <div className="aether-list-pane" aria-label="固定交易清單">
              <AetherSectionHeader title="任務模板" meta={isLoading ? "載入中" : `${visibleTemplates.length} 筆`} />
              {isLoading ? (
                <LoadingState label="載入固定交易..." />
              ) : visibleTemplates.length === 0 ? (
                <EmptyState title="沒有固定交易" description="建立薪資、房租、訂閱或信用卡提醒，之後可以在任務視窗追蹤。" />
              ) : visibleTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`aether-list-row ${selectedId === template.id ? "aether-list-row-active" : ""}`}
                    onClick={() => { setSelectedId(template.id); setIsCreating(false); setEditingId(null); }}
                  >
                    <span className="min-w-0">
                      <strong>{template.name}</strong>
                      <small>{transactionTypeLabels[template.transactionType]} / {recurringFrequencyLabels[template.frequency]}</small>
                    </span>
                    <span className="text-right">
                      <strong>{money(template.amount, template.currency)}</strong>
                      <small>{template.nextOccurrenceDate ? formatDate(template.nextOccurrenceDate) : "未排程"}</small>
                    </span>
                  </button>
              ))}
            </div>
            <div className="aether-detail-pane">
              {isLoading ? (
                <div className="aether-empty-panel">
                  <p>正在同步固定交易模板...</p>
                </div>
              ) : isCreating || editingId ? (
                  <RecurringForm
                    form={form}
                    setForm={setForm}
                    accounts={accounts}
                    cards={cards}
                    categories={flatCategories}
                    isSaving={isSaving}
                    onSubmit={submit}
                    onCancel={() => { resetForm(); setIsCreating(false); }}
                    editingId={editingId}
                  />
              ) : selectedTemplate ? (
                <RecurringDetail template={selectedTemplate} onEdit={() => startEdit(selectedTemplate)} onArchive={() => archive(selectedTemplate.id)} onRestore={() => restore(selectedTemplate.id)} />
              ) : (
                <div className="aether-empty-panel">
                  <p>選擇左側固定交易查看內容，或新增一筆固定交易。</p>
                  <Button type="button" onClick={() => startCreate()}>新增固定交易</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </GameWindow>
    </section>
  );
}

function RecurringForm({ form, setForm, accounts, cards, categories, isSaving, editingId, onSubmit, onCancel }: {
  form: FormState;
  setForm: (form: FormState) => void;
  accounts: AccountDto[];
  cards: CreditCardDto[];
  categories: (CategoryDto | CategoryDto["children"][number])[];
  isSaving: boolean;
  editingId: string | null;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const categoryType = form.transactionType === "Income" ? "Income" : "Expense";
  const categoryOptions = categories.filter((category) => category.type === categoryType && !category.isArchived);
  const needsCategory = form.transactionType === "Income" || form.transactionType === "Expense" || form.transactionType === "CreditCardPurchase";

  return (
    <form onSubmit={onSubmit} className="aether-detail-scroll">
      <AetherSectionHeader title={editingId ? "編輯模板" : "建立模板"} meta="Template Setup" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="ui-label md:col-span-2">名稱<input className="ui-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="ui-label">交易類型<select className="ui-input" value={form.transactionType} onChange={(event) => setForm({ ...form, transactionType: event.target.value as TransactionType, categoryId: "", sourceAccountId: "", destinationAccountId: "" })}>{supportedTypes.map((type) => <option key={type} value={type}>{transactionTypeLabels[type]}</option>)}</select></label>
        <label className="ui-label">金額<input className="ui-input" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
        <label className="ui-label">頻率<select className="ui-input" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as RecurringFrequency })}>{frequencies.map((frequency) => <option key={frequency} value={frequency}>{recurringFrequencyLabels[frequency]}</option>)}</select></label>
        <label className="ui-label">間隔<input className="ui-input" type="number" min="1" value={form.interval} onChange={(event) => setForm({ ...form, interval: Number(event.target.value) })} /></label>
        {form.frequency === "Weekly" && <label className="ui-label">星期<select className="ui-input" value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}>{weekdays.map((day) => <option key={day} value={day}>{weekdayLabels[day]}</option>)}</select></label>}
        {form.frequency === "Monthly" && <label className="ui-label">每月日期<input className="ui-input" type="number" min="1" max="31" value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: Number(event.target.value) })} /></label>}
        <label className="ui-label">開始日<input className="ui-input" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
        <label className="ui-label">結束日<input className="ui-input" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
        {(form.transactionType === "Income" || form.transactionType === "Expense" || form.transactionType === "Transfer") && <AccountSelect label={form.transactionType === "Income" ? "入帳帳戶" : "來源帳戶"} value={form.sourceAccountId} accounts={accounts} onChange={(value) => setForm({ ...form, sourceAccountId: value })} />}
        {form.transactionType === "Transfer" && <AccountSelect label="目標帳戶" value={form.destinationAccountId} accounts={accounts} onChange={(value) => setForm({ ...form, destinationAccountId: value })} />}
        {form.transactionType === "CreditCardPurchase" && <CardSelect label="信用卡" value={form.sourceAccountId} cards={cards} onChange={(value) => setForm({ ...form, sourceAccountId: value })} />}
        {form.transactionType === "CreditCardPayment" && <CardSelect label="信用卡" value={form.destinationAccountId} cards={cards} onChange={(value) => setForm({ ...form, destinationAccountId: value })} />}
        {form.transactionType === "CreditCardPayment" && <AccountSelect label="付款帳戶" value={form.sourceAccountId} accounts={accounts} onChange={(value) => setForm({ ...form, sourceAccountId: value })} />}
        {needsCategory && <label className="ui-label">分類<select className="ui-input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">未分類</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
        <label className="ui-label">商家<input className="ui-input" value={form.merchant} onChange={(event) => setForm({ ...form, merchant: event.target.value })} /></label>
        <label className="ui-label md:col-span-2">備註<textarea className="ui-input min-h-24" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
      </div>
      <div className="aether-action-bar">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit" isLoading={isSaving}>{editingId ? "更新" : "建立"}</Button>
      </div>
    </form>
  );
}

function RecurringDetail({ template, onEdit, onArchive, onRestore }: { template: RecurringTemplateDto; onEdit: () => void; onArchive: () => void; onRestore: () => void }) {
  return (
    <div className="aether-detail-scroll">
      <AetherSectionHeader title={template.name} meta={template.isActive ? "Active Template" : "Archived Template"} />
      <div className="flex flex-wrap gap-2">
        <Badge tone={template.isActive ? "success" : "neutral"}>{template.isActive ? "啟用中" : "已封存"}</Badge>
        <Badge tone="credit">{transactionTypeLabels[template.transactionType]}</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Definition label="金額" value={money(template.amount, template.currency)} />
        <Definition label="頻率" value={`${recurringFrequencyLabels[template.frequency]} / 每 ${template.interval} 次`} />
        <Definition label="下次發生" value={template.nextOccurrenceDate ? formatDate(template.nextOccurrenceDate) : "未排程"} />
        <Definition label="分類" value={template.categoryName ?? "未分類"} />
        <Definition label="來源" value={template.sourceAccountName ?? "未設定"} />
        <Definition label="目標" value={template.destinationAccountName ?? "未設定"} />
        <Definition label="商家" value={template.merchant ?? "未設定"} />
        <Definition label="期間" value={`${formatDate(template.startDate)} - ${template.endDate ? formatDate(template.endDate) : "持續"}`} />
        <Definition label="備註" value={template.note ?? "無"} className="md:col-span-2" />
      </div>
      <div className="aether-action-bar">
        <Button type="button" variant="outline" onClick={onEdit}>編輯</Button>
        {template.isActive ? <Button type="button" variant="danger" onClick={onArchive}>封存</Button> : <Button type="button" variant="outline" onClick={onRestore}>還原</Button>}
      </div>
    </div>
  );
}

function AccountSelect({ label, value, accounts, onChange }: { label: string; value: string; accounts: AccountDto[]; onChange: (value: string) => void }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">選擇帳戶</option>{accounts.filter((account) => !account.isArchived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>;
}

function CardSelect({ label, value, cards, onChange }: { label: string; value: string; cards: CreditCardDto[]; onChange: (value: string) => void }) {
  return <label className="ui-label">{label}<select className="ui-input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">選擇信用卡</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select></label>;
}

function AetherSectionHeader({ title, meta }: { title: string; meta?: string }) {
  return <div className="aether-section-header"><h2>{title}</h2>{meta && <span>{meta}</span>}</div>;
}

function Definition({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`aether-definition ${className}`}><span>{label}</span><strong>{value}</strong></div>;
}

function filterLabel(filter: RecurringFilter) {
  const labels: Record<RecurringFilter, string> = { All: "全部", Income: "收入", Expense: "支出", Transfer: "轉帳", CreditCard: "信用卡", Archived: "封存" };
  return labels[filter];
}
