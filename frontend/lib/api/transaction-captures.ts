import { apiFetch } from "@/lib/api-client";

export type TransactionCaptureSource = "Manual" | "IosShortcut";
export type TransactionCaptureStatus = "Pending" | "Dismissed";
export type PaymentInstrumentType = "Account" | "CreditCard";

export type TransactionCaptureDto = {
  id: string;
  source: TransactionCaptureSource;
  amount: number;
  currency: string;
  occurredAt: string;
  capturedAt: string;
  description: string;
  merchantRaw?: string | null;
  paymentInstrumentType: PaymentInstrumentType;
  paymentInstrumentId: string;
  paymentInstrumentName: string;
  status: TransactionCaptureStatus;
  sourceReference?: string | null;
  note?: string | null;
  dismissedAt?: string | null;
  relatedFinancialEvent?: { id: string; name: string; kind: string; status: string } | null;
};

export type CaptureApiTokenDto = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
};

export type CreatedCaptureApiTokenDto = { token: CaptureApiTokenDto; plaintextToken: string };
type SessionRetry = () => Promise<string | null>;

export const transactionCapturesApi = {
  getAll: (token: string | null, retry: SessionRetry) =>
    apiFetch<TransactionCaptureDto[]>("/api/transaction-captures", token, {}, retry),
  getPending: (token: string | null, retry: SessionRetry) =>
    apiFetch<TransactionCaptureDto[]>("/api/transaction-captures?status=Pending", token, {}, retry),
  dismiss: (token: string | null, retry: SessionRetry, id: string) =>
    apiFetch<TransactionCaptureDto>(`/api/transaction-captures/${id}/dismiss`, token, { method: "PATCH" }, retry),
  getTokens: (token: string | null, retry: SessionRetry) =>
    apiFetch<CaptureApiTokenDto[]>("/api/capture-tokens", token, {}, retry),
  createToken: (token: string | null, retry: SessionRetry, name: string) =>
    apiFetch<CreatedCaptureApiTokenDto>("/api/capture-tokens", token, { method: "POST", body: JSON.stringify({ name }) }, retry),
  revokeToken: (token: string | null, retry: SessionRetry, id: string) =>
    apiFetch<void>(`/api/capture-tokens/${id}/revoke`, token, { method: "POST" }, retry)
};
