export type HealthStatus = "Healthy" | "Degraded" | "Unhealthy";
export type HealthCheck = { name: string; status: HealthStatus; duration: number; description?: string | null; error?: string | null; tags: string[] };
export type HealthResponse = { status: HealthStatus; totalDuration: number; checks: HealthCheck[] };
export type UserDto = { id: string; email: string; displayName: string; createdAtUtc: string };
export type AuthResponse = { user: UserDto; accessToken: string; refreshToken?: string };
export type ProblemDetails = { title?: string; detail?: string; status?: number; errors?: Array<{ code: string; message: string; type: string }> };
export type AccountType = "Cash" | "Checking" | "Savings" | "CreditCard" | "Investment" | "Loan" | "Other";
export type AccountDto = { id: string; name: string; type: AccountType; currencyCode: string; institutionName?: string | null; displayOrder: number; isArchived: boolean; createdAtUtc: string; updatedAtUtc: string; balance: number; balanceLabel: string; hasOpeningBalance: boolean };
export type AccountSummaryCurrencyDto = { currencyCode: string; assetBalance: number; liabilityBalance: number; netBalance: number };
export type AccountSummaryDto = { currencies: AccountSummaryCurrencyDto[] };
export type CategoryType = "Income" | "Expense";
export type CategoryChildDto = { id: string; name: string; type: CategoryType; icon?: string | null; displayOrder: number; isArchived: boolean };
export type CategoryDto = CategoryChildDto & { children: CategoryChildDto[] };
export type CategoryDetailDto = CategoryChildDto & { parentCategoryId?: string | null; createdAtUtc: string; updatedAtUtc: string };
export type TransactionType = "Income" | "Expense" | "Transfer" | "OpeningBalance";
export type TransactionStatus = "Posted" | "Voided";
export type TransactionEntryDto = { accountId: string; accountName: string; amount: number };
export type TransactionCategoryDto = { id: string; name: string; icon?: string | null; type: CategoryType };
export type TransactionDto = { id: string; type: TransactionType; status: TransactionStatus; transactionDate: string; category?: TransactionCategoryDto | null; payee?: string | null; note?: string | null; displayAmount: number; entries: TransactionEntryDto[]; createdAtUtc: string; updatedAtUtc: string; voidedAtUtc?: string | null };
export type PagedTransactionsDto = { items: TransactionDto[]; page: number; pageSize: number; totalCount: number; totalPages: number };
export type TransactionMutationDto = { accountId?: string | null; categoryId?: string | null; fromAccountId?: string | null; toAccountId?: string | null; amount: number; transactionDate: string; payee?: string | null; note?: string | null };

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  constructor(public status: number, public problem: ProblemDetails) {
    super(problem.detail ?? problem.title ?? `Request failed with HTTP ${status}`);
  }
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store", signal });
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json() as Promise<HealthResponse>;
  throw new Error(`Health check failed with HTTP ${response.status}`);
}

export async function apiFetch<T>(path: string, accessToken: string | null, init: RequestInit = {}, retry?: () => Promise<string | null>): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, cache: "no-store" });
  if (response.status === 401 && retry) {
    const refreshed = await retry();
    if (refreshed && refreshed !== accessToken) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, cache: "no-store" });
    }
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : undefined;
  if (!response.ok) throw new ApiError(response.status, body ?? { title: "Request failed", status: response.status });
  return body as T;
}

export function problemMessage(error: unknown): string {
  if (error instanceof ApiError) return error.problem.errors?.[0]?.message ?? error.message;
  if (error && typeof error === "object") {
    const problem = error as ProblemDetails;
    return problem.errors?.[0]?.message ?? problem.detail ?? problem.title ?? "Unexpected error";
  }
  return error instanceof Error ? error.message : "Unexpected error";
}

export function money(value: number, currency = "TWD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
