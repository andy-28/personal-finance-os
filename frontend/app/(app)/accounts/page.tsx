"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AetherEmptyState, AetherMetric, AetherPanelHeader, AetherSummaryGrid } from "@/components/ui/aether-management";
import { Card } from "@/components/ui/card";
import { GameInspectPanel, GameInspectRow, GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type AccountSummaryDto, type AccountType, type GoalBarColor, type PagedTransactionsDto, type TransactionDto, type UserGoalBarDto, type UserResourceWidgetDto } from "@/lib/api-client";
import { financeDataChangedEvent } from "@/lib/app-events";
import { todayInputValue } from "@/lib/formatters";
import { accountTypeLabels, commonLabels } from "@/lib/labels";
import { useSettings, type SettingsSyncStatus } from "@/lib/settings/user-settings";
import { useAuth } from "../../auth-context";

const accountTypes: AccountType[] = ["Cash", "Checking", "Savings", "CreditCard", "Investment", "Loan", "Other"];
const emptyForm = { name: "", type: "Cash" as AccountType, currencyCode: "TWD", institutionName: "" };
type FundGoal = UserGoalBarDto;
type ResourceWidget = UserResourceWidgetDto;
const emptyGoalForm = { accountId: "", title: "", targetAmount: "100000", color: "violet" as GoalBarColor };
const emptyResourceWidgetForm = { accountId: "", title: "", description: "", targetAmount: "100000", accent: "cyan" as GoalBarColor };
const goalBarColors: Record<GoalBarColor, { label: string; fill: string; glow: string; border: string; track: string; frameGlow: string }> = {
  violet: { label: "Arcane violet", fill: "linear-gradient(90deg, #6d28d9 0%, #a855f7 55%, #f0abfc 100%)", glow: "0 0 10px rgba(168, 85, 247, 0.75)", border: "#a78bfa", track: "#2b1743", frameGlow: "0 0 16px rgba(124, 58, 237, 0.35)" },
  cyan: { label: "Aether cyan", fill: "linear-gradient(90deg, #0891b2 0%, #22d3ee 55%, #a5f3fc 100%)", glow: "0 0 10px rgba(34, 211, 238, 0.75)", border: "#67e8f9", track: "#0f2f3a", frameGlow: "0 0 16px rgba(34, 211, 238, 0.32)" },
  emerald: { label: "Guild green", fill: "linear-gradient(90deg, #047857 0%, #34d399 55%, #bbf7d0 100%)", glow: "0 0 10px rgba(52, 211, 153, 0.7)", border: "#86efac", track: "#0f3328", frameGlow: "0 0 16px rgba(52, 211, 153, 0.32)" },
  amber: { label: "Quest amber", fill: "linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fde68a 100%)", glow: "0 0 10px rgba(245, 158, 11, 0.72)", border: "#fcd34d", track: "#3b270b", frameGlow: "0 0 16px rgba(245, 158, 11, 0.32)" },
  rose: { label: "Raid rose", fill: "linear-gradient(90deg, #be123c 0%, #fb7185 55%, #fecdd3 100%)", glow: "0 0 10px rgba(251, 113, 133, 0.72)", border: "#fda4af", track: "#3b1220", frameGlow: "0 0 16px rgba(251, 113, 133, 0.32)" }
};

export default function AccountsPage() {
  const { accessToken, refreshSession } = useAuth();
  const { settings, status: settingsStatus, error: settingsError, updateGoalSettings, retry: retrySettings } = useSettings();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [summary, setSummary] = useState<AccountSummaryDto>({ currencies: [] });
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [balanceForm, setBalanceForm] = useState({ targetBalance: "", openingAmount: 0, date: todayInputValue() });
  const [openingTransaction, setOpeningTransaction] = useState<TransactionDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingResourceWidgetId, setEditingResourceWidgetId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isResourceWidgetModalOpen, setIsResourceWidgetModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);
  const [resourceWidgetForm, setResourceWidgetForm] = useState(emptyResourceWidgetForm);
  const goalIdFallbackRef = useRef(0);
  const resourceWidgetIdFallbackRef = useRef(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pointerStartYRef = useRef(0);
  const pointerDraggingRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const dragTargetIdRef = useRef<string | null>(null);
  const suppressNextClickRef = useRef(false);

  async function load() {
    setIsLoading(true);
    try {
      const [nextAccounts, nextSummary] = await Promise.all([
        apiFetch<AccountDto[]>(`/api/accounts?includeArchived=${includeArchived}`, accessToken, {}, refreshSession),
        apiFetch<AccountSummaryDto>("/api/accounts/summary", accessToken, {}, refreshSession)
      ]);
      setAccounts(nextAccounts);
      setSummary(nextSummary);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, includeArchived]);
  useEffect(() => {
    if (!accessToken) return;
    const onFinanceDataChanged = () => { void load(); };
    window.addEventListener(financeDataChangedEvent, onFinanceDataChanged);
    return () => window.removeEventListener(financeDataChangedEvent, onFinanceDataChanged);
  }, [accessToken, includeArchived]);

  useEffect(() => {
    if (!editingId && !isCreateOpen && !isGoalModalOpen && !isResourceWidgetModalOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setEditingId(null);
      setIsCreateOpen(false);
      setIsGoalModalOpen(false);
      setIsResourceWidgetModalOpen(false);
      setEditingGoalId(null);
      setEditingResourceWidgetId(null);
      setForm(emptyForm);
      setGoalForm(emptyGoalForm);
      setResourceWidgetForm(emptyResourceWidgetForm);
    }
    window.addEventListener("keydown", closeOnEscape);

  return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingId, isCreateOpen, isGoalModalOpen, isResourceWidgetModalOpen]);

  async function submit(event: FormEvent, targetId: string | null = editingId) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ ...form, institutionName: form.institutionName || null });
      if (targetId) {
        await apiFetch<AccountDto>(`/api/accounts/${targetId}`, accessToken, { method: "PUT", body }, refreshSession);
        await saveBalanceTarget(targetId);
      } else {
        const createdAccount = await apiFetch<AccountDto>("/api/accounts", accessToken, { method: "POST", body }, refreshSession);
        const openingAmount = Number(balanceForm.targetBalance);
        if (Number.isFinite(openingAmount) && Math.abs(openingAmount) >= 0.005) {
          await apiFetch<TransactionDto>("/api/transactions/opening-balance", accessToken, {
            method: "POST",
            body: JSON.stringify({
              accountId: createdAccount.id,
              amount: openingAmount,
              transactionDate: balanceForm.date || todayInputValue(),
              note: "Opening balance"
            })
          }, refreshSession);
        }
      }
      setForm(emptyForm);
      setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() });
      setOpeningTransaction(null);
      setEditingId(null);
      setIsCreateOpen(false);
      setIsGoalModalOpen(false);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function archive(id: string) { await apiFetch<void>(`/api/accounts/${id}`, accessToken, { method: "DELETE" }, refreshSession); await load(); }
  async function restore(id: string) { await apiFetch<AccountDto>(`/api/accounts/${id}/restore`, accessToken, { method: "POST" }, refreshSession); await load(); }

  async function saveBalanceTarget(accountId: string) {
    const targetBalance = Number(balanceForm.targetBalance);
    if (!Number.isFinite(targetBalance)) return;
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account) return;
    const existingOpeningAmount = openingTransaction?.entries.find((entry) => entry.accountId === accountId)?.amount ?? balanceForm.openingAmount;
    const nonOpeningBalance = account.balance - existingOpeningAmount;
    const nextOpeningAmount = targetBalance - nonOpeningBalance;
    if (Math.abs(nextOpeningAmount - existingOpeningAmount) < 0.005) return;
    if (Math.abs(nextOpeningAmount) < 0.005) {
      if (openingTransaction) await apiFetch<void>(`/api/transactions/${openingTransaction.id}`, accessToken, { method: "DELETE" }, refreshSession);
      return;
    }
    const body = JSON.stringify({ accountId, amount: nextOpeningAmount, transactionDate: balanceForm.date || todayInputValue(), note: "Opening balance adjustment" });
    if (openingTransaction) await apiFetch<TransactionDto>(`/api/transactions/${openingTransaction.id}`, accessToken, { method: "PUT", body }, refreshSession);
    else await apiFetch<TransactionDto>("/api/transactions/opening-balance", accessToken, { method: "POST", body }, refreshSession);
  }

  async function edit(account: AccountDto) {
    setEditingId(account.id);
    setForm({ name: account.name, type: account.type, currencyCode: account.currencyCode, institutionName: account.institutionName ?? "" });
    setBalanceForm({ targetBalance: String(account.balance), openingAmount: 0, date: todayInputValue() });
    setOpeningTransaction(null);
    try {
      const query = new URLSearchParams({ accountId: account.id, type: "OpeningBalance", status: "Posted", page: "1", pageSize: "1" });
      const result = await apiFetch<PagedTransactionsDto>(`/api/transactions?${query}`, accessToken, {}, refreshSession);
      const opening = result.items[0] ?? null;
      setOpeningTransaction(opening);
      const openingAmount = opening?.entries.find((entry) => entry.accountId === account.id)?.amount ?? 0;
      setBalanceForm({ targetBalance: String(account.balance), openingAmount, date: opening?.transactionDate ?? todayInputValue() });
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  function closeGoalModal() {
    setIsGoalModalOpen(false);
    setEditingGoalId(null);
    setGoalForm(emptyGoalForm);
  }

  function openAddFundGoal() {
    setEditingGoalId(null);
    setGoalForm(emptyGoalForm);
    setIsGoalModalOpen(true);
  }

  function openEditFundGoal(goal: FundGoal) {
    setEditingGoalId(goal.id);
    setGoalForm({ accountId: goal.accountId, title: goal.title, targetAmount: String(goal.targetAmount), color: goal.color });
    setIsGoalModalOpen(true);
  }

  function saveFundGoal(event: FormEvent) {
    event.preventDefault();
    const targetAmount = Number(goalForm.targetAmount);
    if (!goalForm.accountId || !Number.isFinite(targetAmount) || targetAmount <= 0) return;
    const account = accounts.find((candidate) => candidate.id === goalForm.accountId);
    const title = goalForm.title.trim() || account?.name || "Resource";
    const nextGoal = {
      id: editingGoalId ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `goal-${goalIdFallbackRef.current++}`),
      accountId: goalForm.accountId,
      title,
      targetAmount,
      color: goalForm.color
    };
    const nextGoals = editingGoalId ? fundGoals.map((goal) => goal.id === editingGoalId ? nextGoal : goal) : [...fundGoals, nextGoal];
    void updateGoalSettings({ ...settings.goalSettings, goalBars: nextGoals });
    closeGoalModal();
  }

  function removeFundGoal(id: string) {
    if (editingGoalId === id) closeGoalModal();
    void updateGoalSettings({ ...settings.goalSettings, goalBars: fundGoals.filter((goal) => goal.id !== id) });
  }

  function closeResourceWidgetModal() {
    setIsResourceWidgetModalOpen(false);
    setEditingResourceWidgetId(null);
    setResourceWidgetForm(emptyResourceWidgetForm);
  }

  function openAddResourceWidget() {
    setEditingResourceWidgetId(null);
    setResourceWidgetForm(emptyResourceWidgetForm);
    setIsResourceWidgetModalOpen(true);
  }

  function openEditResourceWidget(widget: ResourceWidget) {
    setEditingResourceWidgetId(widget.id);
    setResourceWidgetForm({
      accountId: widget.accountId,
      title: widget.title,
      description: widget.description,
      targetAmount: String(widget.targetAmount),
      accent: widget.accent
    });
    setIsResourceWidgetModalOpen(true);
  }

  function saveResourceWidget(event: FormEvent) {
    event.preventDefault();
    const targetAmount = Number(resourceWidgetForm.targetAmount);
    if (!resourceWidgetForm.accountId || !Number.isFinite(targetAmount) || targetAmount < 0) return;
    const account = accounts.find((candidate) => candidate.id === resourceWidgetForm.accountId);
    const title = resourceWidgetForm.title.trim() || `${account?.name ?? "Resource"} 指引`;
    const description = resourceWidgetForm.description.trim() || "確認資料來源後，這裡會以遊戲提示視窗呈現目前進度。";
    const nextWidget = {
      id: editingResourceWidgetId ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `resource-widget-${resourceWidgetIdFallbackRef.current++}`),
      accountId: resourceWidgetForm.accountId,
      title,
      description,
      targetAmount,
      accent: resourceWidgetForm.accent
    };
    const nextWidgets = editingResourceWidgetId ? resourceWidgets.map((widget) => widget.id === editingResourceWidgetId ? nextWidget : widget) : [...resourceWidgets, nextWidget];
    void updateGoalSettings({ ...settings.goalSettings, resourceWidgets: nextWidgets });
    closeResourceWidgetModal();
  }

  function removeResourceWidget(id: string) {
    if (editingResourceWidgetId === id) closeResourceWidgetModal();
    void updateGoalSettings({ ...settings.goalSettings, resourceWidgets: resourceWidgets.filter((widget) => widget.id !== id) });
  }
  function resetDragState() {
    pointerDraggingRef.current = false;
    dragTargetIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
    setDragOffsetY(0);
  }

  function dragTargetFromY(y: number, sourceId: string) {
    const candidates = [...document.querySelectorAll<HTMLElement>("[data-account-id]")]
      .map((element) => ({ id: element.dataset.accountId ?? "", rect: element.getBoundingClientRect() }))
      .filter((candidate) => candidate.id && candidate.id !== sourceId && accounts.some((account) => account.id === candidate.id && !account.isArchived));
    if (candidates.length === 0) return null;
    const containing = candidates.find((candidate) => y >= candidate.rect.top && y <= candidate.rect.bottom);
    if (containing) return containing.id;
    return candidates
      .map((candidate) => ({ ...candidate, distance: Math.abs(y - (candidate.rect.top + candidate.rect.height / 2)) }))
      .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
  }

  async function reorder(sourceId: string, targetId: string) {
    const active = accounts.filter((account) => !account.isArchived);
    const sourceIndex = active.findIndex((account) => account.id === sourceId);
    const targetIndex = active.findIndex((account) => account.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const [source] = active.splice(sourceIndex, 1);
    active.splice(targetIndex, 0, source);
    setAccounts((current) => {
      const nextActive = [...active];
      return current.map((account) => account.isArchived ? account : nextActive.shift() ?? account);
    });
    await apiFetch<void>("/api/accounts/reorder", accessToken, { method: "PUT", body: JSON.stringify({ accountIds: active.map((account) => account.id) }) }, refreshSession);
    await load();
  }

  const fundGoals = settings.goalSettings.goalBars;
  const resourceWidgets = settings.goalSettings.resourceWidgets ?? [];
  const resourceBarsPanel = (
    <ResourceBarsPanel
      goals={fundGoals}
      accounts={accounts}
      onAdd={openAddFundGoal}
      onEdit={openEditFundGoal}
      onRemove={removeFundGoal}
      syncStatus={settingsStatus}
      syncError={settingsError}
      onRetry={retrySettings}
    />
  );
  return (
    <section className="grid gap-8">
      <PageHeader
        title="帳戶"
        description="Ledger 會即時計算每個帳戶餘額，帳戶本身不重複儲存餘額狀態。"
        actions={<label className="flex min-h-10 items-center gap-2 rounded-ui border border-border/70 bg-surface/80 px-3 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> {commonLabels.showArchived}</label>}
      />
      {error && <ErrorState message={error} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)] lg:items-start">
        {summary.currencies.length > 0 && (
          <div className="grid gap-4">
            {summary.currencies.map((row) => (
              <Card key={row.currencyCode}>
                <AetherPanelHeader
                  eyebrow="資源總覽"
                  title={row.currencyCode}
                  subtitle="資產 / 負債"
                  summary={money(row.netBalance, row.currencyCode)}
                />
                <AetherSummaryGrid>
                  <AetherMetric label={commonLabels.assetBalance} value={money(row.assetBalance, row.currencyCode)} tone="success" />
                  <AetherMetric label="負債餘額" value={money(row.liabilityBalance, row.currencyCode)} tone="danger" />
                  <AetherMetric label={commonLabels.netWorth} value={money(row.netBalance, row.currencyCode)} tone={row.netBalance >= 0 ? "primary" : "warning"} />
                </AetherSummaryGrid>
              </Card>
            ))}
          </div>
        )}
        {resourceBarsPanel}
      </div>

      <ResourceWidgetPanel widgets={resourceWidgets} accounts={accounts} onAdd={openAddResourceWidget} onEdit={openEditResourceWidget} onRemove={removeResourceWidget} />

      <SoulWeaponPanel />

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={() => { setIsCreateOpen(false); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); }}>
          <GameWindow title="新增帳戶" description="Account setup" className="w-full max-w-2xl" onRequestClose={() => { setIsCreateOpen(false); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); }} onClick={(event) => event.stopPropagation()}>
            <GameInspectPanel title={form.name || "新帳戶"} subtitle={accountTypeLabels[form.type]} icon={<AccountGlyph type={form.type} />}>
              <form onSubmit={(event) => submit(event, null)} className="grid gap-4 sm:grid-cols-2">
                <label className="ui-label sm:col-span-2">帳戶名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
                <label className="ui-label">帳戶類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
                <label className="ui-label">幣別<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
                <label className="ui-label sm:col-span-2">金融機構<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
                <label className="ui-label">目前餘額<input className="ui-input" type="number" step="0.01" placeholder="0" value={balanceForm.targetBalance} onChange={(e) => setBalanceForm({ ...balanceForm, targetBalance: e.target.value })} /></label>
                <label className="ui-label">調整日期<input className="ui-input" type="date" value={balanceForm.date} onChange={(e) => setBalanceForm({ ...balanceForm, date: e.target.value })} /></label>
                <p className="text-xs text-muted sm:col-span-2">輸入目前餘額會建立期初餘額交易，帳戶餘額仍由 Ledger 即時計算。</p>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); }}>{commonLabels.cancel}</Button>
                  <Button type="submit">{commonLabels.create}</Button>
                </div>
              </form>
            </GameInspectPanel>
          </GameWindow>
        </div>
      )}
      {editingId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={() => { setEditingId(null); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setOpeningTransaction(null); }}>
          <GameWindow title="Inspect Account" description="Account information" className="w-full max-w-2xl" onRequestClose={() => { setEditingId(null); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setOpeningTransaction(null); }} onClick={(event) => event.stopPropagation()}>
            <GameInspectPanel title={form.name || "帳戶"} subtitle={accountTypeLabels[form.type]} icon={<AccountGlyph type={form.type} />}>
              <form onSubmit={(event) => submit(event, editingId)} className="grid gap-4 sm:grid-cols-2">
                <label className="ui-label sm:col-span-2">帳戶名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
                <label className="ui-label">帳戶類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}</select></label>
                <label className="ui-label">幣別<input className="ui-input" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} maxLength={3} /></label>
                <label className="ui-label sm:col-span-2">金融機構<input className="ui-input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></label>
                <label className="ui-label">目標餘額<input className="ui-input" type="number" step="0.01" value={balanceForm.targetBalance} onChange={(e) => setBalanceForm({ ...balanceForm, targetBalance: e.target.value })} /></label>
                <label className="ui-label">調整日期<input className="ui-input" type="date" value={balanceForm.date} onChange={(e) => setBalanceForm({ ...balanceForm, date: e.target.value })} /></label>
                <p className="text-xs text-muted sm:col-span-2">更新目標餘額會透過期初餘額調整交易修正，不會直接覆寫帳戶餘額。</p>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setOpeningTransaction(null); }}>{commonLabels.cancel}</Button>
                  <Button type="submit">{commonLabels.update}</Button>
                </div>
              </form>
            </GameInspectPanel>
          </GameWindow>
        </div>
      )}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={closeGoalModal}>
          <GameWindow title={editingGoalId ? "編輯資源條" : "新增資源條"} description="Resource tracker" className="w-full max-w-xl" onRequestClose={closeGoalModal} onClick={(event) => event.stopPropagation()}>
            <GameInspectPanel title={goalForm.title || "新的目標血條"} subtitle="Account target" icon={<span className="text-sm font-black">HP</span>}>
              <form onSubmit={saveFundGoal} className="grid gap-4 sm:grid-cols-2">
                <label className="ui-label sm:col-span-2">參考帳戶<select className="ui-input" value={goalForm.accountId} onChange={(e) => setGoalForm({ ...goalForm, accountId: e.target.value })} autoFocus>
                  <option value="">選擇帳戶</option>
                  {accounts.filter((account) => !account.isArchived).map((account) => <option key={account.id} value={account.id}>{account.name} / {money(account.balance, account.currencyCode)}</option>)}
                </select></label>
                <label className="ui-label">顯示名稱<input className="ui-input" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="例如：日本基金" /></label>
                <label className="ui-label">目標金額<input className="ui-input" type="number" min="1" step="1" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} /></label>
                <label className="ui-label sm:col-span-2">血條顏色<select className="ui-input" value={goalForm.color} onChange={(e) => setGoalForm({ ...goalForm, color: e.target.value as GoalBarColor })}>
                  {(Object.keys(goalBarColors) as GoalBarColor[]).map((color) => <option key={color} value={color}>{goalBarColors[color].label}</option>)}
                </select></label>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={closeGoalModal}>{commonLabels.cancel}</Button>
                  <Button type="submit">{editingGoalId ? "保存" : "新增"}</Button>
                </div>
              </form>
            </GameInspectPanel>
          </GameWindow>
        </div>
      )}
      {isResourceWidgetModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-lg" onClick={closeResourceWidgetModal}>
          <GameWindow title={editingResourceWidgetId ? "編輯指引視窗" : "新增指引視窗"} description="Enhancement guide" className="w-full max-w-xl" onRequestClose={closeResourceWidgetModal} onClick={(event) => event.stopPropagation()}>
            <GameInspectPanel title={resourceWidgetForm.title || "新的資源指引"} subtitle="Account source" icon={<span className="text-sm font-black">UI</span>}>
              <form onSubmit={saveResourceWidget} className="grid gap-4 sm:grid-cols-2">
                <label className="ui-label sm:col-span-2">資料來源<select className="ui-input" value={resourceWidgetForm.accountId} onChange={(e) => setResourceWidgetForm({ ...resourceWidgetForm, accountId: e.target.value })} autoFocus>
                  <option value="">選擇帳戶</option>
                  {accounts.filter((account) => !account.isArchived).map((account) => <option key={account.id} value={account.id}>{account.name} / {money(account.balance, account.currencyCode)}</option>)}
                </select></label>
                <label className="ui-label">標題<input className="ui-input" value={resourceWidgetForm.title} onChange={(e) => setResourceWidgetForm({ ...resourceWidgetForm, title: e.target.value })} placeholder="例如：復活資金" /></label>
                <label className="ui-label">參考目標<input className="ui-input" type="number" min="0" step="1" value={resourceWidgetForm.targetAmount} onChange={(e) => setResourceWidgetForm({ ...resourceWidgetForm, targetAmount: e.target.value })} /></label>
                <label className="ui-label sm:col-span-2">內容呈現<textarea className="ui-input min-h-20" value={resourceWidgetForm.description} onChange={(e) => setResourceWidgetForm({ ...resourceWidgetForm, description: e.target.value })} placeholder="例如：確認目前帳戶資源是否足以支援下一次任務。" /></label>
                <label className="ui-label sm:col-span-2">視窗色系<select className="ui-input" value={resourceWidgetForm.accent} onChange={(e) => setResourceWidgetForm({ ...resourceWidgetForm, accent: e.target.value as GoalBarColor })}>
                  {(Object.keys(goalBarColors) as GoalBarColor[]).map((color) => <option key={color} value={color}>{goalBarColors[color].label}</option>)}
                </select></label>
                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={closeResourceWidgetModal}>{commonLabels.cancel}</Button>
                  <Button type="submit">{editingResourceWidgetId ? "保存" : "新增"}</Button>
                </div>
              </form>
            </GameInspectPanel>
          </GameWindow>
        </div>
      )}
      <div className="game-section-divider">
        <div className="game-section-title">
          <strong>帳戶欄位</strong>
          <span>{accounts.length} slots loaded</span>
        </div>
      </div>

      {isLoading ? <LoadingState /> : accounts.length === 0 ? <EmptyState title="尚未建立帳戶" description="先建立現金、銀行或信用卡帳戶，再開始新增交易。" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              role="button"
              tabIndex={0}
              data-account-id={account.id}
              aria-label={`Edit ${account.name}`}
              onClick={() => {
                if (suppressNextClickRef.current || pointerMovedRef.current) {
                  suppressNextClickRef.current = false;
                  pointerMovedRef.current = false;
                  return;
                }
                void edit(account);
              }}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void edit(account); } }}
              onPointerDown={(event) => {
                if (account.isArchived) return;
                if (event.button !== 0) return;
                const target = event.target as HTMLElement;
                if (!target.closest("[data-account-drag-handle]")) return;
                pointerStartYRef.current = event.clientY;
                pointerDraggingRef.current = false;
                pointerMovedRef.current = false;
                suppressNextClickRef.current = true;
                setDraggedId(account.id);
                event.currentTarget.setPointerCapture(event.pointerId);
                event.preventDefault();
              }}
              onPointerMove={(event) => {
                if (!draggedId) return;
                const offsetY = event.clientY - pointerStartYRef.current;
                if (Math.abs(offsetY) < 10) return;
                pointerDraggingRef.current = true;
                pointerMovedRef.current = true;
                suppressNextClickRef.current = true;
                setDragOffsetY(offsetY);
                const targetId = dragTargetFromY(event.clientY, draggedId);
                dragTargetIdRef.current = targetId;
                setDragOverId(targetId);
              }}
              onPointerUp={(event) => {
                const sourceId = draggedId;
                const targetId = sourceId ? dragTargetFromY(event.clientY, sourceId) ?? dragTargetIdRef.current : null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                const shouldReorder = Boolean(pointerDraggingRef.current && sourceId && targetId);
                if (pointerDraggingRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  suppressNextClickRef.current = true;
                }
                resetDragState();
                if (sourceId && targetId && shouldReorder) void reorder(sourceId, targetId);
              }}
              onPointerCancel={resetDragState}
              style={draggedId === account.id ? { transform: `translateY(${dragOffsetY}px) scale(1.01)` } : undefined}
              className={`game-item-card game-account-slot cursor-pointer touch-pan-y select-none transition-[transform,filter,opacity,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0 ${draggedId === account.id ? "relative z-10 cursor-grabbing opacity-90 shadow-2xl duration-75" : ""} ${dragOverId === account.id ? "ring-2 ring-primary/70" : ""}`}
            >
              <div className="game-item-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    data-account-drag-handle
                    className="game-slot game-slot-md touch-none cursor-grab transition hover:border-primary/80 hover:text-primary active:cursor-grabbing"
                    aria-label={`拖曳排序 ${account.name}`}
                    title="拖曳排序"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <AccountGlyph type={account.type} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold">{account.name}</h2>
                      <Badge tone={account.isArchived ? "neutral" : "success"}>{account.isArchived ? commonLabels.archived : commonLabels.active}</Badge>
                      {account.hasOpeningBalance && <Badge tone="success">Opening balance</Badge>}
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{accountTypeLabels[account.type]} / {account.currencyCode}{account.institutionName ? ` / ${account.institutionName}` : ""}</p>
                  </div>
                </div>
              </div>
              <div className="game-item-body grid gap-3 sm:grid-cols-2">
                <GameInspectRow label="目前餘額" value={money(account.balance, account.currencyCode)} strong />
                <GameInspectRow label="餘額來源" value={account.balanceLabel} />
                <GameInspectRow label="幣別" value={account.currencyCode} />
              </div>
              <div className="game-item-footer flex flex-wrap justify-end gap-2">
                {account.isArchived
                  ? <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); restore(account.id); }}>{commonLabels.restore}</Button>
                  : <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); archive(account.id); }}>{commonLabels.archive}</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <button
        type="button"
        className="game-floating-add ui-focus"
        aria-label="新增帳戶"
        title="新增帳戶"
        onClick={() => { setForm(emptyForm); setBalanceForm({ targetBalance: "", openingAmount: 0, date: todayInputValue() }); setIsCreateOpen(true); }}
      >
        +
      </button>
    </section>
  );
}

function AccountGlyph({ type }: { type: AccountType }) {
  const labels: Record<AccountType, string> = {
    Cash: "CA",
    Checking: "BK",
    Savings: "SV",
    CreditCard: "CR",
    Investment: "IV",
    Loan: "LN",
    Other: "OS"
  };
  return <span className="text-sm font-black tracking-[0.08em]">{labels[type]}</span>;
}

function ResourceBarsPanel({ goals, accounts, onAdd, onEdit, onRemove, syncStatus, syncError, onRetry }: { goals: FundGoal[]; accounts: AccountDto[]; onAdd: () => void; onEdit: (goal: FundGoal) => void; onRemove: (id: string) => void; syncStatus: SettingsSyncStatus; syncError: string; onRetry: () => void }) {
  return (
    <section className="grid min-h-[180px] w-full gap-3 self-stretch rounded-[8px] border border-primary/35 bg-[#10141f]/80 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.7),0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Resource Bars</p>
          <h2 className="text-lg font-bold text-foreground">Goal Bars</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{goalSyncText(syncStatus, syncError)}</span>
            {syncStatus === "error" && <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={onRetry}>重試</button>}
          </div>
        </div>
        <button type="button" className="ui-focus grid h-10 w-10 place-items-center rounded-full border border-[#93f5a1] bg-[#5dbb41] text-xl font-black text-[#10210d] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_12px_rgba(93,187,65,0.45)] transition hover:brightness-110" onClick={onAdd} aria-label="Add goal bar">+</button>
      </div>
      {goals.length === 0 ? (
        <AetherEmptyState title="尚未建立目標血條" description="點擊右上角 +，選擇參考帳戶與目標金額，建立像遊戲血條一樣的資金進度。" />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {goals.map((goal) => <FundGoalBar key={goal.id} goal={goal} account={accounts.find((account) => account.id === goal.accountId)} onEdit={() => onEdit(goal)} onRemove={() => onRemove(goal.id)} />)}
        </div>
      )}
    </section>
  );
}

function goalSyncText(status: SettingsSyncStatus, error: string) {
  if (status === "saving") return "正在同步目標血條...";
  if (status === "saved") return "已同步到 User Settings";
  if (status === "error") return error || "目標血條同步失敗";
  if (status === "loading") return "正在讀取目標血條...";
  return "由 User Settings 保存";
}

function FundGoalBar({ goal, account, onEdit, onRemove }: { goal: FundGoal; account?: AccountDto; onEdit: () => void; onRemove: () => void }) {
  const balance = account?.balance ?? 0;
  const currency = account?.currencyCode ?? "TWD";
  const percent = Math.max(0, Math.min(100, (balance / goal.targetAmount) * 100));
  const color = goalBarColors[goal.color];

  return (
    <article className="ui-focus relative cursor-pointer rounded-[7px] border-2 bg-[#12131b] p-2 shadow-[0_0_0_2px_rgba(0,0,0,0.7)] transition hover:brightness-110" style={{ borderColor: color.border, boxShadow: `0 0 0 2px rgba(0,0,0,0.7), ${color.frameGlow}` }} role="button" tabIndex={0} onClick={onEdit} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(); } }} aria-label={`編輯 ${goal.title}`}>
      <button type="button" className="absolute right-3 top-[3px] z-10 grid h-4 w-4 place-items-center rounded-full border border-white/45 bg-[#313447] text-[10px] leading-none text-white hover:bg-danger/70" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label="Remove goal bar">x</button>
      <span className="absolute right-8 top-[5px] z-10 h-3 w-3 rounded-full border border-[#c8ffb8] bg-[#74d957] shadow-[0_0_8px_rgba(116,217,87,0.7)]" aria-hidden="true" />
      <div className="mb-1 flex items-center pr-10 pl-2 text-[11px] font-black tracking-[0.08em] text-[#f7d24b]">
        <span className="truncate">{goal.title}</span>
      </div>
      <div className="relative h-6 overflow-hidden rounded-[5px] border p-[3px] shadow-[inset_0_0_8px_rgba(0,0,0,0.85)]" style={{ borderColor: color.border, backgroundColor: color.track }}>
        <div className="h-full rounded-[3px] transition-[width] duration-300" style={{ width: `${percent}%`, background: color.fill, boxShadow: color.glow }} />
        <div className="absolute inset-0 grid place-items-center text-[11px] font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
          {money(Math.max(0, balance), currency)} / {money(goal.targetAmount, currency)}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between px-1 text-[10px] font-semibold text-muted">
        <span className="truncate">{account ? account.name : "Missing account"}</span>
        <span>{percent.toFixed(1)}%</span>
      </div>
    </article>
  );
}
function ResourceWidgetPanel({ widgets, accounts, onAdd, onEdit, onRemove }: { widgets: ResourceWidget[]; accounts: AccountDto[]; onAdd: () => void; onEdit: (widget: ResourceWidget) => void; onRemove: (id: string) => void }) {
  return (
    <section className="rounded-[8px] border border-primary/35 bg-[#071a24]/80 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.7),0_18px_40px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Enhancement Guides</p>
          <h2 className="text-lg font-bold text-foreground">資源指引</h2>
          <p className="text-xs text-muted">用帳戶資料來源生成像遊戲提示視窗一樣的資源狀態。</p>
        </div>
        <button type="button" className="ui-focus grid h-10 w-10 place-items-center rounded-full border border-[#93f5a1] bg-[#5dbb41] text-xl font-black text-[#10210d] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_12px_rgba(93,187,65,0.45)] transition hover:brightness-110" onClick={onAdd} aria-label="新增資源指引">+</button>
      </div>
      {widgets.length === 0 ? (
        <AetherEmptyState title="尚未建立資源指引" description="點擊右上角 +，選擇資料來源與內容呈現，建立像遊戲提示窗的資源摘要。" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {widgets.map((widget) => <ResourceGuideCard key={widget.id} widget={widget} account={accounts.find((account) => account.id === widget.accountId)} onEdit={() => onEdit(widget)} onRemove={() => onRemove(widget.id)} />)}
        </div>
      )}
    </section>
  );
}

function SoulWeaponPanel() {
  return (
    <section className="rounded-[8px] border border-primary/35 bg-[#071a24]/80 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.7),0_18px_40px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Soul Interface</p>
          <h2 className="text-lg font-bold text-foreground">靈魂儀表</h2>
          <p className="text-xs text-muted">用小型能力視窗呈現可累積的資源狀態。</p>
        </div>
      </div>
      <SoulWeaponCard />
    </section>
  );
}

function SoulWeaponCard() {
  const value = 615;
  const max = 1000;
  const percent = (value / max) * 100;
  const slots = ["◇", "◆", "⌂", "⌂", "商"];

  return (
    <article className="w-full max-w-[260px] rounded-[10px] border-2 border-[#bfc2ce] bg-[#222832] p-[5px] text-white shadow-[0_0_0_2px_rgba(0,0,0,0.9),0_10px_24px_rgba(0,0,0,0.42)]">
      <div className="flex h-5 items-center justify-between rounded-t-[7px] border border-[#4d5662] bg-[#2d2438] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
        <span className="text-[8px] font-black uppercase tracking-[0.08em] text-[#ffe85b]">Soul Weapon</span>
        <span className="flex items-center gap-1 text-[10px] font-black leading-none">
          <span className="grid h-3 w-3 place-items-center rounded-full bg-[#bdf759] text-[#244300]">-</span>
          <span className="grid h-3 w-3 place-items-center rounded-full border border-white/45 text-white">x</span>
        </span>
      </div>
      <div className="rounded-b-[8px] border border-[#747985] bg-[#44515d] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-12px_20px_rgba(0,0,0,0.22)]">
        <div className="grid grid-cols-[1fr_48px] items-center gap-2">
          <div className="flex items-end gap-1">
            <strong className="text-[32px] font-black leading-none text-[#c44cff] [text-shadow:0_2px_0_#fff,0_0_8px_rgba(196,76,255,0.9)]">{value}</strong>
            <span className="pb-1 text-sm font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">/ {max}</span>
          </div>
          <button type="button" className="h-10 rounded-[8px] border border-[#e5ff88] bg-[#83d751] text-[10px] font-black leading-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_0_rgba(0,0,0,0.45)]">
            全靈魂<br />填滿
          </button>
        </div>
        <div className="mt-2 h-[15px] rounded-[3px] border border-[#11151a] bg-[#14181e] p-[2px] shadow-[inset_0_0_6px_rgba(0,0,0,0.85)]">
          <div className="h-full rounded-[2px] bg-[linear-gradient(90deg,#6724ff,#ba43ff,#f1a6ff)] shadow-[0_0_8px_rgba(186,67,255,0.72)]" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between border-y border-white/15 py-1 text-[11px] font-bold">
          <span className="text-slate-100">攻擊力</span>
          <strong className="text-white">+20</strong>
        </div>
        <div className="mt-2 flex items-center gap-1">
          {slots.map((slot, index) => (
            <span key={`${slot}-${index}`} className="grid h-7 w-7 place-items-center rounded-[5px] border border-[#aeb8c8] bg-[#edf6ff] text-[13px] font-black text-[#4e6172] shadow-[inset_0_-4px_8px_rgba(86,100,115,0.35)]">
              {slot}
            </span>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <span className="rounded-full border border-[#cfff66] bg-[#6bd13d] px-2 py-[1px] text-[9px] font-black text-white shadow-[0_0_8px_rgba(107,209,61,0.55)]">OFF</span>
        </div>
      </div>
    </article>
  );
}

function ResourceGuideCard({ widget, account, onEdit, onRemove }: { widget: ResourceWidget; account?: AccountDto; onEdit: () => void; onRemove: () => void }) {
  const color = goalBarColors[widget.accent] ?? goalBarColors.cyan;
  const current = Math.max(0, account?.balance ?? 0);
  const target = Math.max(0, widget.targetAmount);
  const percent = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 100;
  const currency = account?.currencyCode ?? "TWD";

  return (
    <article className="ui-focus relative cursor-pointer overflow-hidden rounded-[18px] border-2 border-[#7df9ff]/80 bg-[#1bb9d0] p-3 text-white shadow-[0_0_0_2px_rgba(0,0,0,0.72),0_0_20px_rgba(34,211,238,0.38)] transition hover:brightness-105" role="button" tabIndex={0} onClick={onEdit} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(); } }} aria-label={`編輯 ${widget.title}`}>
      <button type="button" className="absolute right-3 top-3 z-10 grid h-5 w-5 place-items-center rounded-full border border-white/45 bg-[#163446]/70 text-[11px] leading-none text-white hover:bg-danger/70" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label="移除資源指引">x</button>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_46%,rgba(0,62,92,0.18))] opacity-70" aria-hidden="true" />
      <div className="relative grid gap-3 rounded-[14px] border border-white/35 bg-[#23bfd4]/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-14px_24px_rgba(0,79,111,0.2)] sm:grid-cols-[64px_minmax(0,1fr)]">
        <div className="grid h-14 w-14 place-items-center rounded-[8px] border border-white/45 bg-[#e9f6ef]/90 text-2xl shadow-[inset_0_-8px_16px_rgba(0,0,0,0.18)]" aria-hidden="true">▣</div>
        <div className="min-w-0 pr-6">
          <h3 className="text-base font-black text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.45)]">{widget.title}</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-cyan-50">{widget.description}</p>
        </div>
        <div className="sm:col-span-2 rounded-[10px] border border-[#66c7df]/70 bg-[#1577a0] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_16px_rgba(0,43,68,0.32),0_1px_0_rgba(255,255,255,0.08)]">
          <p className="mb-2 text-xs font-bold text-cyan-50">{account ? `${account.name} 目前資源` : "找不到資料來源"}</p>
          <div className="relative h-5 overflow-hidden rounded-[4px] border border-[#0c2635] bg-[#07303f] shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
            <div className="h-full rounded-[3px] bg-gradient-to-r from-[#ffb703] via-[#ffe066] to-[#fff4a3] shadow-[0_0_12px_rgba(255,224,102,0.8)] transition-[width] duration-300" style={{ width: `${percent}%` }} />
            <div className="absolute inset-0 grid place-items-center text-[11px] font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{money(current, currency)} / {target > 0 ? money(target, currency) : "自由值"}</div>
          </div>
          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-xs font-black text-[#fff200]">
            <span>NPC/確認</span>
            <div className="h-2 overflow-hidden rounded-full bg-[#044059] shadow-[inset_0_0_5px_rgba(0,0,0,0.75)]">
              <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color.fill, boxShadow: color.glow }} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-cyan-50">
            <span>{account ? account.institutionName || account.name : "未連結"}</span>
            <span>{percent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </article>
  );
}
