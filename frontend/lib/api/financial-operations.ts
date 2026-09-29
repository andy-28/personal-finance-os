import { apiFetch } from "@/lib/api-client";

export type FinancialEventKind = "ConfirmedExpense" | "ConditionalExpense" | "PlannedExpense";
export type FinancialEventStatus = "Planned" | "Pending" | "Confirmed" | "Completed" | "Cancelled";

export type FinancialEventDto = {
  id: string;
  name: string;
  kind: FinancialEventKind;
  status: FinancialEventStatus;
  amount: number;
  currencyCode: string;
  eventDate: string;
  cashFlowDate: string;
  resultDate?: string | null;
  paymentSourceAccountId?: string | null;
  paymentSourceName?: string | null;
  relatedTransactionId?: string | null;
  relatedTransaction?: RelatedLedgerTransactionDto | null;
  isCashFlowRealized: boolean;
  note?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  needsAction: boolean;
  checklist: FinancialEventChecklistItemDto[];
  relatedCaptures: RelatedCaptureDto[];
  activity: FinancialEventActivityDto[];
};

export type RelatedLedgerTransactionDto = { id: string; key: string; title: string; type: string; status: string; amount: number; currencyCode: string; transactionDate: string; paymentSourceAccountId?: string | null; paymentSourceName?: string | null };

export type FinancialEventChecklistItemDto = { id: string; text: string; isCompleted: boolean; sortOrder: number; createdAtUtc: string; completedAtUtc?: string | null };
export type RelatedCaptureDto = { id: string; description: string; amount: number; currencyCode: string; paymentInstrumentName: string; status: string; capturedAtUtc: string };
export type FinancialEventActivityDto = { id: string; type: string; description: string; occurredAtUtc: string };

export type CashFlowItemDto = {
  id: string;
  source: "FinancialEvent" | "Recurring" | "CreditCard";
  kind: string;
  status: string;
  title: string;
  date: string;
  cashFlowDate: string;
  amount: number;
  currencyCode: string;
  isConditional: boolean;
  paymentSourceAccountId?: string | null;
  paymentSourceName?: string | null;
  financialEventId?: string | null;
  note?: string | null;
};

export type LiquidityPointDto = { date: string; baselineLiquidity: number; conditionalLiquidity: number };
export type LiquidityGapDto = { startDate: string; endDate?: string | null; lowestLiquidity: number; nextExpectedIncomeDate?: string | null };
export type LiquidityProjectionDto = {
  currencyCode: string;
  horizonDays: number;
  currentLiquidity: number;
  projectedLowestLiquidity: number;
  projectedLowestLiquidityDate: string;
  conditionalLowestLiquidity: number;
  conditionalLowestLiquidityDate: string;
  confirmedOutflow: number;
  conditionalExposure: number;
  nextExpectedIncome?: number | null;
  nextExpectedIncomeDate?: string | null;
  eventCount: number;
  pendingCount: number;
  points: LiquidityPointDto[];
  gaps: LiquidityGapDto[];
};
export type FinancialOperationsWorkspaceDto = {
  asOfDate: string;
  throughDate: string;
  financialEvents: FinancialEventDto[];
  timeline: CashFlowItemDto[];
  operations: OperationalItemDto[];
  needsActionCount: number;
  projection: LiquidityProjectionDto;
};
export type OperationalItemDto = {
  id: string;
  key: string;
  recordType: "UserWorkItem" | "SystemDerived" | "CapturedInput" | "LedgerActivity";
  source: string;
  kind: string;
  status: string;
  title: string;
  description?: string | null;
  financialDate: string;
  secondaryDate?: string | null;
  amount: number;
  currencyCode: string;
  isConditional: boolean;
  needsAction: boolean;
  paymentSourceAccountId?: string | null;
  paymentSourceName?: string | null;
  financialEventId?: string | null;
  transactionCaptureId?: string | null;
  transactionId?: string | null;
  relatedFinancialEventId?: string | null;
  relatedFinancialEventName?: string | null;
};
export type FinancialEventRequest = {
  name: string;
  kind: FinancialEventKind;
  amount: number;
  currencyCode: string;
  eventDate: string;
  resultDate?: string | null;
  paymentSourceAccountId?: string | null;
  relatedTransactionId?: string | null;
  note?: string | null;
};
export type PromoteTransactionRequest = { name: string; kind: FinancialEventKind; amount: number; currencyCode: string; eventDate: string; paymentSourceAccountId?: string | null; note?: string | null };

type SessionRetry = () => Promise<string | null>;

export const financialOperationsApi = {
  getWorkspace: (token: string | null, retry: SessionRetry, days = 45) =>
    apiFetch<FinancialOperationsWorkspaceDto>(`/api/financial-operations?days=${days}`, token, {}, retry),
  createEvent: (token: string | null, retry: SessionRetry, request: FinancialEventRequest) =>
    apiFetch<FinancialEventDto>("/api/financial-events", token, { method: "POST", body: JSON.stringify(request) }, retry),
  promoteTransaction: (token: string | null, retry: SessionRetry, transactionId: string, request: PromoteTransactionRequest) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/from-transaction/${transactionId}`, token, { method: "POST", body: JSON.stringify(request) }, retry),
  setStatus: (token: string | null, retry: SessionRetry, id: string, status: FinancialEventStatus) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/status`, token, { method: "PATCH", body: JSON.stringify({ status }) }, retry),
  addChecklistItem: (token: string | null, retry: SessionRetry, id: string, text: string) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/checklist`, token, { method: "POST", body: JSON.stringify({ text }) }, retry),
  setChecklistItem: (token: string | null, retry: SessionRetry, id: string, itemId: string, isCompleted: boolean) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/checklist/${itemId}`, token, { method: "PATCH", body: JSON.stringify({ isCompleted }) }, retry),
  linkCapture: (token: string | null, retry: SessionRetry, id: string, captureId: string) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/captures/${captureId}`, token, { method: "POST" }, retry),
  unlinkCapture: (token: string | null, retry: SessionRetry, id: string, captureId: string) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/captures/${captureId}`, token, { method: "DELETE" }, retry),
  linkTransaction: (token: string | null, retry: SessionRetry, id: string, transactionId: string) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/transactions/${transactionId}`, token, { method: "POST" }, retry),
  unlinkTransaction: (token: string | null, retry: SessionRetry, id: string, transactionId: string) =>
    apiFetch<FinancialEventDto>(`/api/financial-events/${id}/transactions/${transactionId}`, token, { method: "DELETE" }, retry)
};
