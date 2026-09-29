"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, money, problemMessage, type AccountDto, type PagedTransactionsDto, type TransactionDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { financialOperationsApi, type FinancialEventDto, type FinancialOperationsWorkspaceDto, type OperationalItemDto } from "@/lib/api/financial-operations";
import { transactionCapturesApi, type TransactionCaptureDto } from "@/lib/api/transaction-captures";
import { CaptureTokenDialog } from "./financial-operations/capture-token-dialog";
import { FinancialEventDialog } from "./financial-operations/financial-event-dialog";
import { FinancialOperationsSummary } from "./financial-operations/financial-operations-summary";
import { FinancialOperationsToolbar, type FinancialOperationsFilters } from "./financial-operations/financial-operations-toolbar";
import { FinancialTimeline } from "./financial-operations/financial-timeline";
import { OperationsNavigator } from "./financial-operations/operations-navigator";
import { TransactionPromotionDialog } from "./financial-operations/transaction-promotion-dialog";
import { WorkItemDetail } from "./financial-operations/work-item-detail";

type View = "overview" | "timeline" | "all" | "pending";
type Props = { accessToken: string | null; refreshSession: () => Promise<string | null>; accounts: AccountDto[] };
const initialFilters: FinancialOperationsFilters = { query: "", type: "", status: "", source: "", date: "45" };

export function FinancialOperationsWorkspace({ accessToken, refreshSession, accounts }: Props) {
  const initialUrl = typeof window === "undefined" ? { view: "overview" as View, item: null } : readUrlState();
  const [data, setData] = useState<FinancialOperationsWorkspaceDto | null>(null);
  const [captures, setCaptures] = useState<TransactionCaptureDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [view, setView] = useState<View>(initialUrl.view);
  const [selectedId, setSelectedId] = useState<string | null>(initialUrl.item);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialUrl.item));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [filters, setFilters] = useState({ ...initialFilters, date: initialUrl.view === "all" || initialUrl.view === "pending" ? "all" : "45" });
  const [promotionItem, setPromotionItem] = useState<OperationalItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [workspace, allCaptures, recentTransactions] = await Promise.all([
        financialOperationsApi.getWorkspace(accessToken, refreshSession),
        transactionCapturesApi.getAll(accessToken, refreshSession),
        apiFetch<PagedTransactionsDto>("/api/transactions?status=Posted&page=1&pageSize=50", accessToken, {}, refreshSession)
      ]);
      setData(workspace);
      setCaptures(allCaptures);
      setTransactions(recentTransactions.items);
      const visibleOperations = itemsForView(workspace.operations, view, workspace.asOfDate);
      setSelectedId((current) => current && visibleOperations.some((item) => item.id === current) ? current : visibleOperations[0]?.id ?? null);
      setError(null);
    } catch (reason) { setError(problemMessage(reason)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [accessToken]);
  useEffect(() => {
    const onPopState = () => { const state = readUrlState(); setView(state.view); setSelectedId(state.item); setDetailOpen(Boolean(state.item)); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const viewOperations = useMemo(() => data ? itemsForView(data.operations, view, data.asOfDate) : [], [data, view]);
  const filteredOperations = useMemo(() => filterOperations(viewOperations, filters, data?.asOfDate), [viewOperations, filters, data?.asOfDate]);
  const fallbackId = filteredOperations[0]?.id;
  const selected = filteredOperations.find((item) => item.id === selectedId) ?? filteredOperations.find((item) => item.id === fallbackId) ?? null;
  const selectedEvent = selected?.financialEventId ? data?.financialEvents.find((event) => event.id === selected.financialEventId) : undefined;
  const selectedCapture = selected?.transactionCaptureId ? captures.find((capture) => capture.id === selected.transactionCaptureId) : undefined;
  const projection = data?.projection;

  function updateUrl(nextView: View, item: string | null, mode: "push" | "replace" = "push") {
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    if (item) url.searchParams.set("workItem", item); else url.searchParams.delete("workItem");
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
  }
  function selectItem(id: string) { setSelectedId(id); setDetailOpen(true); updateUrl(view, id); }
  function changeView(next: View) {
    const nextFilters = { ...filters, date: next === "all" || next === "pending" ? "all" : "45" };
    const first = data ? filterOperations(itemsForView(data.operations, next, data.asOfDate), nextFilters, data.asOfDate)[0]?.id ?? null : null;
    setView(next);
    setFilters(nextFilters);
    setSelectedId(first);
    setDetailOpen(false);
    updateUrl(next, first);
  }
  function closeDetail() { setDetailOpen(false); updateUrl(view, null, "replace"); }
  async function mutate(action: () => Promise<unknown>) { try { await action(); await load(); } catch (reason) { setError(problemMessage(reason)); } }

  return <section className="financial-operations-workbench" aria-labelledby="financial-operations-title">
    <header className="financial-ops-workspace-header">
      <div><span>FINANCIAL OPERATIONS</span><h2 id="financial-operations-title">財務作戰區</h2><p>Finance Work Items、系統推估與 Captured Inputs 的統一工作區；Ledger 仍是唯一 Financial Truth。</p></div>
      <div className="financial-ops-header-actions"><Button size="sm" variant="outline" onClick={() => setTokenDialogOpen(true)}>Shortcut 設定</Button><Button size="sm" onClick={() => setDialogOpen(true)}>＋ 新增財務事項</Button></div>
    </header>

    {error && <div className="financial-ops-alert"><strong>API ERROR</strong><span>{error}</span><button type="button" onClick={() => void load()}>重試</button></div>}
    {loading && !data ? <div className="financial-ops-loading"><span /><strong>LOADING FINANCIAL OPERATIONS</strong><small>正在同步 Work Items、Captures 與 Projection…</small></div> : data && projection && <>
      <FinancialOperationsSummary projection={projection} needsActionCount={data.needsActionCount} />
      {projection.gaps.length > 0 && <div className="financial-ops-gap"><strong>資金缺口</strong><span>{formatDate(projection.gaps[0].startDate)} → {projection.gaps[0].endDate ? formatDate(projection.gaps[0].endDate) : "尚未回正"}</span><b>最低 {money(projection.gaps[0].lowestLiquidity, projection.currencyCode)}</b>{projection.gaps[0].nextExpectedIncomeDate && <small>下一筆收入 {formatDate(projection.gaps[0].nextExpectedIncomeDate)}</small>}</div>}
      <div className="financial-ops-navigation-row">
        <div className="financial-ops-tabs" role="tablist" aria-label="財務作戰區檢視">{(["overview", "timeline", "all", "pending"] as View[]).map((item) => <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => changeView(item)}>{item === "overview" ? "總覽" : item === "timeline" ? "時間軸" : item === "all" ? "所有事項" : <>待處理 <b>{data.needsActionCount}</b></>}</button>)}</div>
        <span>{view === "all" ? "UNIFIED OPERATIONS" : view === "timeline" ? "FINANCIAL CHRONOLOGY" : view === "pending" ? "NEEDS USER ACTION" : "ACTIVE OPERATIONS"}</span>
      </div>
      <FinancialOperationsToolbar filters={filters} items={viewOperations} onChange={setFilters} />
      <div className="financial-ops-work-area">
        {view === "timeline" ? <FinancialTimeline items={filteredOperations} selectedId={selected?.id ?? null} onSelect={selectItem} /> : <OperationsNavigator items={filteredOperations} selectedId={selected?.id ?? null} rangeLabel={view === "all" ? "WORK MANAGEMENT" : `${formatDate(data.asOfDate)}—${formatDate(data.throughDate)}`} onSelect={selectItem} />}
        <WorkItemDetail item={selected} event={selectedEvent} capture={selectedCapture} captures={captures} transactions={transactions} events={data.financialEvents} projection={projection} open={detailOpen} onClose={closeDetail}
          onStatus={(eventId, status) => mutate(() => financialOperationsApi.setStatus(accessToken, refreshSession, eventId, status))}
          onAddChecklist={(eventId, text) => mutate(() => financialOperationsApi.addChecklistItem(accessToken, refreshSession, eventId, text))}
          onToggleChecklist={(eventId, itemId, completed) => mutate(() => financialOperationsApi.setChecklistItem(accessToken, refreshSession, eventId, itemId, completed))}
          onLinkCapture={(eventId, captureId) => mutate(() => financialOperationsApi.linkCapture(accessToken, refreshSession, eventId, captureId))}
          onUnlinkCapture={(eventId, captureId) => mutate(() => financialOperationsApi.unlinkCapture(accessToken, refreshSession, eventId, captureId))}
          onPromoteTransaction={(item) => setPromotionItem(item)}
          onLinkTransaction={(eventId, transactionId) => mutate(() => financialOperationsApi.linkTransaction(accessToken, refreshSession, eventId, transactionId))}
          onUnlinkTransaction={(eventId, transactionId) => mutate(() => financialOperationsApi.unlinkTransaction(accessToken, refreshSession, eventId, transactionId))}
          onViewFinancialEvent={(eventId) => { const id = `event:${eventId}`; setView("all"); setFilters((current) => ({ ...current, date: "all" })); setSelectedId(id); setDetailOpen(true); updateUrl("all", id); }}
          onDismissCapture={(capture) => mutate(() => transactionCapturesApi.dismiss(accessToken, refreshSession, capture.id))} />
      </div>
    </>}
    {dialogOpen && <FinancialEventDialog accounts={accounts} accessToken={accessToken} refreshSession={refreshSession} onClose={() => setDialogOpen(false)} onSaved={async () => { setDialogOpen(false); await load(); }} />}
    {promotionItem && <TransactionPromotionDialog item={promotionItem} accounts={accounts} accessToken={accessToken} refreshSession={refreshSession} onClose={() => setPromotionItem(null)} onPromoted={async (created: FinancialEventDto) => { setPromotionItem(null); await load(); const id = `event:${created.id}`; setView("all"); setFilters((current) => ({ ...current, date: "all" })); setSelectedId(id); setDetailOpen(true); updateUrl("all", id); }} />}
    {tokenDialogOpen && <CaptureTokenDialog accounts={accounts} accessToken={accessToken} refreshSession={refreshSession} onClose={() => setTokenDialogOpen(false)} />}
  </section>;
}

function itemsForView(items: OperationalItemDto[], view: View, asOfDate?: string) {
  if (view === "pending") return items.filter((item) => item.needsAction);
  if (view === "overview") return items.filter((item) => {
    if (item.recordType === "LedgerActivity") return false;
    return item.status !== "Completed" && item.status !== "Cancelled" && (item.recordType !== "CapturedInput" || item.status === "Pending");
  }).concat(items.filter((item) => item.recordType === "LedgerActivity" && asOfDate && item.financialDate >= addDays(asOfDate, -7) && item.financialDate <= asOfDate).sort((left, right) => right.financialDate.localeCompare(left.financialDate)).slice(0, 5)).sort((left, right) => left.financialDate.localeCompare(right.financialDate));
  if (view === "all") return items.filter((item) => item.recordType !== "LedgerActivity");
  return items;
}
function filterOperations(items: OperationalItemDto[], filters: FinancialOperationsFilters, asOfDate?: string) {
  const query = filters.query.trim().toLocaleLowerCase();
  const cutoff = filters.date !== "all" && asOfDate ? addDays(asOfDate, Number(filters.date)) : null;
  const start = filters.date !== "all" && asOfDate ? addDays(asOfDate, -Number(filters.date)) : null;
  return items.filter((item) => (!query || `${item.key} ${item.title} ${item.description ?? ""} ${item.paymentSourceName ?? ""}`.toLocaleLowerCase().includes(query)) && (!filters.type || item.recordType === filters.type) && (!filters.status || item.status === filters.status) && (!filters.source || item.paymentSourceName === filters.source || item.source === filters.source) && (!start || item.financialDate >= start) && (!cutoff || item.financialDate <= cutoff));
}
function readUrlState(): { view: View; item: string | null } { const params = new URLSearchParams(window.location.search); const raw = params.get("view"); const view: View = raw === "timeline" || raw === "all" || raw === "pending" ? raw : raw === "events" ? "all" : raw === "inbox" ? "pending" : "overview"; return { view, item: params.get("workItem") }; }
function addDays(value: string, days: number) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
