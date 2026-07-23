import type { AccountType, CategoryType, HealthStatus, RecurringFrequency, RecurringOccurrenceStatus, StatementImportBatchStatus, StatementImportMatchStatus, StatementImportReviewStatus, StatementImportRowType, TransactionStatus, TransactionType } from "./api-client";
import { t } from "./i18n";

export const commonLabels = {
  actions: t("actions"),
  active: t("active"),
  allAccounts: t("allAccounts"),
  allCategories: t("allCategories"),
  allTypes: t("allTypes"),
  amount: t("amount"),
  archive: t("archive"),
  archived: t("archived"),
  assetBalance: "資產餘額",
  availableCredit: t("availableCredit"),
  back: "返回",
  cancel: t("cancel"),
  category: t("category"),
  close: t("close"),
  create: t("add"),
  creditBalance: t("creditBalance"),
  currency: "幣別",
  date: t("date"),
  delete: t("delete"),
  description: t("description"),
  edit: t("edit"),
  email: t("email"),
  empty: "尚無資料",
  institution: "金融機構",
  loading: t("loading"),
  merchant: t("merchant"),
  name: t("name"),
  netWorth: "淨值",
  note: t("note"),
  openingBalance: t("openingBalance"),
  outstanding: t("outstanding"),
  password: t("password"),
  payment: t("payment"),
  post: t("post"),
  refund: t("refund"),
  restore: t("restore"),
  save: t("save"),
  saving: "儲存中...",
  showArchived: "顯示封存項目",
  skip: t("ignore"),
  status: "狀態",
  update: t("update")
} as const;

export const accountTypeLabels: Record<AccountType, string> = {
  Cash: t("cash"),
  Checking: t("checking"),
  Savings: t("savings"),
  CreditCard: t("creditCards"),
  Investment: t("investment"),
  Loan: t("loan"),
  Other: t("other")
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  Income: t("incomeCategory"),
  Expense: t("expenseCategoryType")
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  OpeningBalance: t("openingBalance"),
  Income: t("income"),
  Expense: t("expense"),
  Transfer: t("transfer"),
  CreditCardPurchase: t("creditCardPurchase"),
  CreditCardRefund: t("creditCardRefund"),
  CreditCardPayment: t("creditCardPayment")
};

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  Posted: t("posted"),
  Voided: t("voided")
};

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  Weekly: t("weekly"),
  Monthly: t("monthly"),
  Yearly: t("yearly")
};

export const recurringStatusLabels: Record<RecurringOccurrenceStatus, string> = {
  Pending: t("pending"),
  Posted: t("posted"),
  Skipped: t("skipped")
};

export const installmentStatusLabels: Record<string, string> = {
  Pending: t("pending"),
  Active: t("active"),
  Posted: t("posted"),
  Paid: t("paid"),
  Completed: t("completed"),
  Cancelled: t("cancelled")
};

export const healthStatusLabels: Record<HealthStatus | "Unknown", string> = {
  Healthy: t("healthy"),
  Degraded: t("degraded"),
  Unhealthy: t("unhealthy"),
  Unknown: t("statusUnknown")
};

export const statementImportBatchStatusLabels: Record<StatementImportBatchStatus, string> = {
  Uploaded: t("uploaded"),
  Parsed: t("parsed"),
  ReviewRequired: t("reviewRequired"),
  PartiallyPosted: t("partiallyPosted"),
  Completed: t("completed"),
  Failed: t("failed"),
  Duplicate: t("duplicate"),
  Discarded: t("discard")
};

export const statementImportReviewStatusLabels: Record<StatementImportReviewStatus, string> = {
  New: t("new"),
  Ignored: t("ignore"),
  ReadyToPost: t("ready"),
  Posted: t("posted"),
  Failed: t("failed")
};

export const statementImportMatchStatusLabels: Record<StatementImportMatchStatus, string> = {
  New: t("new"),
  PossibleDuplicate: t("possibleDuplicate"),
  Matched: t("matched")
};

export const statementImportRowTypeLabels: Record<StatementImportRowType, string> = {
  Purchase: t("purchase"),
  Refund: t("refund"),
  Payment: t("payment"),
  Fee: t("fee"),
  Interest: t("interest"),
  Adjustment: t("adjustment"),
  Installment: t("installment"),
  Unknown: t("unknown")
};
