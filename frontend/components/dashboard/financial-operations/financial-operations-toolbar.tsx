import { statusLabels } from "./presentation";

export type FinancialOperationsFilters = { query: string; type: string; status: string; source: string; date: string };

type FilterableItem = { recordType: string; kind: string; status: string; source: string; paymentSourceName?: string | null };

export function FinancialOperationsToolbar({ filters, items, onChange }: { filters: FinancialOperationsFilters; items: FilterableItem[]; onChange: (filters: FinancialOperationsFilters) => void }) {
  const types = [...new Set(items.map((item) => item.recordType))];
  const statuses = [...new Set(items.map((item) => item.status))];
  const sources = [...new Set(items.map((item) => item.source).filter(Boolean))];
  return <div className="financial-ops-toolbar" aria-label="事件篩選工具列">
    <label className="financial-ops-search"><span className="sr-only">搜尋事件</span><input value={filters.query} onChange={(event) => onChange({ ...filters, query: event.target.value })} placeholder="搜尋事件、Key、付款來源…" /></label>
    <select aria-label="事件類型" value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value })}><option value="">所有類型</option>{types.map((type) => <option key={type} value={type}>{recordTypeLabels[type] ?? type}</option>)}</select>
    <select aria-label="事件狀態" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}><option value="">所有狀態</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status] ?? status}</option>)}</select>
    <select aria-label="資料來源" value={filters.source} onChange={(event) => onChange({ ...filters, source: event.target.value })}><option value="">所有來源</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}</select>
    <select aria-label="日期範圍" value={filters.date} onChange={(event) => onChange({ ...filters, date: event.target.value })}><option value="all">所有日期</option><option value="7">7 天</option><option value="30">30 天</option><option value="45">45 天</option></select>
  </div>;
}

const recordTypeLabels: Record<string, string> = { UserWorkItem: "Financial Work Item", CapturedInput: "Captured Input", LedgerActivity: "Ledger Activity", SystemDerived: "System Derived" };
