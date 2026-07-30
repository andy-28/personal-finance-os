import { messageFromProblem } from "./error-messages";
import { formatCurrency } from "./formatters";

export type HealthStatus = "Healthy" | "Degraded" | "Unhealthy";
export type HealthCheck = { name: string; status: HealthStatus; duration?: number; description?: string | null; error?: string | null; tags: string[] };
export type HealthResponse = { status: HealthStatus; totalDuration?: number; checks?: HealthCheck[] };
export type UserDto = { id: string; email: string; displayName: string; createdAtUtc: string };
export type AuthResponse = { user: UserDto; accessToken: string; refreshToken?: string };
export type GoalBarColor = "violet" | "cyan" | "emerald" | "amber" | "rose";
export type UserGoalBarDto = { id: string; accountId: string; title: string; targetAmount: number; color: GoalBarColor };
export type UserResourceWidgetDto = { id: string; accountId: string; title: string; description: string; targetAmount: number; accent: GoalBarColor };
export type UserGoalSettingsDto = { goalBars: UserGoalBarDto[]; resourceWidgets: UserResourceWidgetDto[]; collapsed: boolean; displayStyle: string };
export type DashboardProfileImageId = "aether-orb" | "aether-favicon" | "custom";
export type DashboardProfileImageSettingsDto = { imageId: DashboardProfileImageId; customImageUrl: string };
export type UserWorkshopSettingsDto = { faviconAssetId: string; headerDividerEnabled: boolean; dashboardProfileImage: DashboardProfileImageSettingsDto };
export type UserVisualSettingsDto = { headerDividerAssetId: string };
export type UserSettingsDto = {
  id: string;
  userId: string;
  theme: string;
  workshopSettings: UserWorkshopSettingsDto;
  visualSettings: UserVisualSettingsDto;
  goalSettings: UserGoalSettingsDto;
  createdAtUtc: string;
  updatedAtUtc: string;
};
export type UserSettingsPatchRequest = Partial<Pick<UserSettingsDto, "theme" | "workshopSettings" | "visualSettings" | "goalSettings">>;
export type ProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  code?: "BACKEND_UNAVAILABLE" | "BACKEND_TIMEOUT" | string;
  message?: string;
  retryable?: boolean;
  errors?: Array<{ code: string; message: string; type: string }>;
};
export type AccountType = "Cash" | "Checking" | "Savings" | "CreditCard" | "Investment" | "Loan" | "Other";
export type AccountDto = { id: string; name: string; type: AccountType; currencyCode: string; institutionName?: string | null; displayOrder: number; isArchived: boolean; createdAtUtc: string; updatedAtUtc: string; balance: number; balanceLabel: string; hasOpeningBalance: boolean };
export type AccountSummaryCurrencyDto = { currencyCode: string; assetBalance: number; liabilityBalance: number; netBalance: number };
export type AccountSummaryDto = { currencies: AccountSummaryCurrencyDto[] };
export type CategoryType = "Income" | "Expense";
export type CategoryChildDto = { id: string; name: string; type: CategoryType; icon?: string | null; displayOrder: number; isArchived: boolean };
export type CategoryDto = CategoryChildDto & { children: CategoryChildDto[] };
export type CategoryDetailDto = CategoryChildDto & { parentCategoryId?: string | null; createdAtUtc: string; updatedAtUtc: string };
export type TransactionType = "Income" | "Expense" | "Transfer" | "OpeningBalance" | "CreditCardPurchase" | "CreditCardRefund" | "CreditCardPayment";
export type TransactionStatus = "Posted" | "Voided";
export type TransactionEntryDto = { accountId: string; accountName: string; amount: number };
export type TransactionCategoryDto = { id: string; name: string; icon?: string | null; type: CategoryType };
export type TransactionDto = { id: string; type: TransactionType; status: TransactionStatus; transactionDate: string; category?: TransactionCategoryDto | null; payee?: string | null; note?: string | null; displayAmount: number; entries: TransactionEntryDto[]; createdAtUtc: string; updatedAtUtc: string; voidedAtUtc?: string | null };
export type PagedTransactionsDto = { items: TransactionDto[]; page: number; pageSize: number; totalCount: number; totalPages: number };
export type TransactionMutationDto = { accountId?: string | null; categoryId?: string | null; fromAccountId?: string | null; toAccountId?: string | null; amount: number; transactionDate: string; payee?: string | null; note?: string | null };
export type StatementPeriodDto = { startDate: string; endDate: string };
export type CreditCardDto = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  issuerName: string;
  cardName: string;
  lastFourDigits?: string | null;
  creditLimit?: number | null;
  statementClosingDay: number;
  paymentDueDay: number;
  paymentAccountId?: string | null;
  paymentAccountName?: string | null;
  ledgerBalance: number;
  outstandingAmount: number;
  creditBalance: number;
  availableCredit?: number | null;
  creditUtilization?: number | null;
  latestStatementAmount: number;
  billedOutstandingAmount: number;
  unbilledAmount: number;
  currentStatementPeriod: StatementPeriodDto;
  previousStatementPeriod: StatementPeriodDto;
  statementCharges: number;
  statementCredits: number;
  estimatedStatementNet: number;
  estimatedAmountDue: number;
  estimatedStatementAmount: number;
  nextClosingDate: string;
  nextPaymentDueDate: string;
  remainingInstallmentCommitment: number;
};
export type InstallmentScheduleItemDto = { id: string; installmentNumber: number; dueDate: string; amount: number; transactionId?: string | null; status: "Pending" | "Posted" | "Paid" | "Cancelled" };
export type InstallmentPlanDto = {
  id: string;
  creditCardAccountId: string;
  merchant: string;
  description?: string | null;
  purchaseDate: string;
  originalAmount: number;
  installmentCount: number;
  installmentAmount: number;
  firstInstallmentDate: string;
  status: "Pending" | "Active" | "Completed" | "Cancelled";
  remainingCommitmentAmount: number;
  scheduleItems: InstallmentScheduleItemDto[];
};
export type CreditCardDetailDto = { summary: CreditCardDto; recentTransactions: TransactionDto[]; installmentPlans: InstallmentPlanDto[] };
export type StatementImportBatchStatus = "Uploaded" | "Parsed" | "ReviewRequired" | "PartiallyPosted" | "Completed" | "Failed" | "Duplicate" | "Discarded";
export type StatementImportRowType = "Purchase" | "Refund" | "Payment" | "Fee" | "Interest" | "Adjustment" | "Installment" | "Unknown";
export type StatementImportMatchStatus = "New" | "PossibleDuplicate" | "Matched";
export type StatementImportReviewStatus = "New" | "Ignored" | "ReadyToPost" | "Posted" | "Failed";
export type StatementImportRowDto = {
  id: string;
  sourceRowNumber: number;
  transactionDate?: string | null;
  postingDate?: string | null;
  rawDescription: string;
  normalizedDescription: string;
  amount: number;
  currency: string;
  foreignAmount?: number | null;
  foreignCurrency?: string | null;
  type: StatementImportRowType;
  isInstallment: boolean;
  installmentCurrentNumber?: number | null;
  installmentTotalNumber?: number | null;
  rawText?: string | null;
  matchStatus: StatementImportMatchStatus;
  matchedTransactionId?: string | null;
  reviewStatus: StatementImportReviewStatus;
  categoryId?: string | null;
  createdTransactionId?: string | null;
  failureReason?: string | null;
};
export type StatementImportBatchDto = {
  id: string;
  creditCardAccountId: string;
  provider: string;
  originalFileName: string;
  statementPeriodStart?: string | null;
  statementPeriodEnd?: string | null;
  paymentDueDate?: string | null;
  previousBalance?: number | null;
  paymentAmount?: number | null;
  newCharges?: number | null;
  statementAmount?: number | null;
  minimumPayment?: number | null;
  status: StatementImportBatchStatus;
  parserVersion: string;
  createdAtUtc: string;
  parsedAtUtc?: string | null;
  postedAtUtc?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rows: StatementImportRowDto[];
  warnings: string[];
};
export type RecurringFrequency = "Weekly" | "Monthly" | "Yearly";
export type RecurringOccurrenceStatus = "Pending" | "Posted" | "Skipped";
export type RecurringTemplateDto = {
  id: string;
  name: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  sourceAccountId?: string | null;
  sourceAccountName?: string | null;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  merchant?: string | null;
  description?: string | null;
  note?: string | null;
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth?: number | null;
  dayOfWeek?: string | null;
  startDate: string;
  endDate?: string | null;
  nextOccurrenceDate?: string | null;
  isActive: boolean;
};
export type RecurringOccurrenceDto = {
  id: string;
  templateId: string;
  templateName: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  scheduledDate: string;
  status: RecurringOccurrenceStatus;
  postedTransactionId?: string | null;
  sourceAccountId?: string | null;
  sourceAccountName?: string | null;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  merchant?: string | null;
  note?: string | null;
};
export type UpcomingInstallmentDto = { planId: string; itemId: string; creditCardAccountId: string; merchant: string; dueDate: string; amount: number; status: string };
export type CreditCardReminderDto = { accountId: string; accountName: string; kind: "Closing" | "PaymentDue"; date: string };
export type UpcomingDto = { recurringOccurrences: RecurringOccurrenceDto[]; installments: UpcomingInstallmentDto[]; creditCardReminders: CreditCardReminderDto[] };

const apiBaseUrl = "";
export const CONNECTION_NOTICE_DELAY_MS = 2_000;
export const COLD_START_NOTICE_DELAY_MS = 5_000;
export const REQUEST_TIMEOUT_MS = 60_000;

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 502 || status === 503 || status === 504;
}

function backendProblem(code: "BACKEND_UNAVAILABLE" | "BACKEND_TIMEOUT", status = code === "BACKEND_TIMEOUT" ? 504 : 503): ProblemDetails {
  return {
    title: code === "BACKEND_TIMEOUT" ? "Backend timeout" : "Backend temporarily unavailable",
    detail: code === "BACKEND_TIMEOUT"
      ? "The API service did not respond in time. It may still be waking up."
      : "The API service is temporarily unavailable. It may be waking up from a cold start.",
    status,
    code,
    message: code === "BACKEND_TIMEOUT" ? "Backend service did not respond in time." : "Backend service is temporarily unavailable.",
    retryable: true
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  constructor(public status: number, public problem: ProblemDetails) {
    super(problem.detail ?? problem.title ?? `Request failed with HTTP ${status}`);
  }
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch("/api/health", { cache: "no-store", signal });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Health check failed with HTTP ${response.status}: expected JSON response.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Health check returned malformed JSON.");
  }

  if (!response.ok) {
    const problem = body && typeof body === "object"
      ? body as ProblemDetails
      : { title: "Health check failed", status: response.status, detail: `Health endpoint returned HTTP ${response.status}.` };
    throw new ApiError(response.status, problem);
  }

  return normalizeHealthResponse(body);
}

export function normalizeHealthResponse(body: unknown): HealthResponse {
  if (!body || typeof body !== "object") {
    return { status: "Unhealthy", checks: [] };
  }

  const payload = body as Record<string, unknown>;
  const checks = Array.isArray(payload.checks)
    ? payload.checks.map(normalizeHealthCheck).filter((check): check is HealthCheck => check !== null)
    : [];

  return {
    status: normalizeHealthStatus(payload.status),
    totalDuration: typeof payload.totalDuration === "number" && Number.isFinite(payload.totalDuration) ? payload.totalDuration : undefined,
    checks
  };
}

function normalizeHealthCheck(body: unknown): HealthCheck | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "";
  if (!name) return null;

  return {
    name,
    status: normalizeHealthStatus(payload.status),
    duration: typeof payload.duration === "number" && Number.isFinite(payload.duration) ? payload.duration : undefined,
    description: typeof payload.description === "string" ? payload.description : null,
    error: typeof payload.error === "string" ? payload.error : null,
    tags: Array.isArray(payload.tags) ? payload.tags.filter((tag): tag is string => typeof tag === "string") : []
  };
}

function normalizeHealthStatus(value: unknown): HealthStatus {
  return value === "Healthy" || value === "Degraded" || value === "Unhealthy" ? value : "Unhealthy";
}

export async function apiFetch<T>(path: string, accessToken: string | null, init: RequestInit = {}, retry?: () => Promise<string | null>): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(`${apiBaseUrl}${path}`, { ...init, headers, cache: "no-store" });
  } catch (error) {
    throw new ApiError(isAbortError(error) ? 504 : 503, backendProblem(isAbortError(error) ? "BACKEND_TIMEOUT" : "BACKEND_UNAVAILABLE"));
  }

  if (response.status === 401 && retry) {
    const refreshed = await retry();
    if (refreshed && refreshed !== accessToken) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      try {
        response = await fetchWithTimeout(`${apiBaseUrl}${path}`, { ...init, headers, cache: "no-store" });
      } catch (error) {
        throw new ApiError(isAbortError(error) ? 504 : 503, backendProblem(isAbortError(error) ? "BACKEND_TIMEOUT" : "BACKEND_UNAVAILABLE"));
      }
    }
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : undefined;
  if (isRetryableStatus(response.status) && !body) throw new ApiError(response.status, backendProblem("BACKEND_UNAVAILABLE", response.status));
  if (!response.ok) throw new ApiError(response.status, body ?? { title: "Request failed", status: response.status });
  return body as T;
}

export function problemMessage(error: unknown): string {
  if (error instanceof ApiError) return messageFromProblem(error.problem, error.status);
  if (error && typeof error === "object") {
    const problem = error as ProblemDetails;
    return messageFromProblem(problem);
  }
  return error instanceof Error ? error.message : "Unexpected error occurred.";
}

export function money(value: number, currency = "TWD") {
  return formatCurrency(value, currency);
}
