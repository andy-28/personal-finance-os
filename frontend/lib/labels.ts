import type { AccountType, CategoryType, HealthStatus, RecurringFrequency, RecurringOccurrenceStatus, TransactionStatus, TransactionType } from "./api-client";

export const commonLabels = {
  actions: "操作",
  active: "使用中",
  allAccounts: "所有帳戶",
  allCategories: "所有分類",
  allTypes: "所有類型",
  amount: "金額",
  archive: "封存",
  archived: "已封存",
  assetBalance: "資產餘額",
  availableCredit: "可用額度",
  back: "返回",
  cancel: "取消",
  category: "分類",
  close: "關閉",
  create: "新增",
  creditBalance: "溢繳餘額",
  currency: "幣別",
  date: "日期",
  delete: "刪除",
  description: "說明",
  edit: "編輯",
  email: "電子郵件",
  empty: "目前沒有資料",
  institution: "金融機構",
  loading: "載入中...",
  merchant: "商家",
  name: "名稱",
  netWorth: "淨值",
  note: "備註",
  openingBalance: "期初餘額",
  outstanding: "未清償金額",
  password: "密碼",
  payment: "付款",
  post: "入帳",
  refund: "退款",
  restore: "還原",
  save: "儲存",
  saving: "儲存中...",
  showArchived: "顯示封存項目",
  skip: "略過",
  status: "狀態",
  update: "更新"
} as const;

export const accountTypeLabels: Record<AccountType, string> = {
  Cash: "現金",
  Checking: "支票帳戶",
  Savings: "儲蓄帳戶",
  CreditCard: "信用卡",
  Investment: "投資",
  Loan: "貸款",
  Other: "其他"
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  Income: "收入",
  Expense: "支出"
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  OpeningBalance: "期初餘額",
  Income: "收入",
  Expense: "支出",
  Transfer: "轉帳",
  CreditCardPurchase: "信用卡消費",
  CreditCardRefund: "信用卡退款",
  CreditCardPayment: "信用卡付款"
};

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  Posted: "已入帳",
  Voided: "已作廢"
};

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  Weekly: "每週",
  Monthly: "每月",
  Yearly: "每年"
};

export const recurringStatusLabels: Record<RecurringOccurrenceStatus, string> = {
  Pending: "待處理",
  Posted: "已入帳",
  Skipped: "已略過"
};

export const installmentStatusLabels: Record<string, string> = {
  Pending: "待入帳",
  Active: "進行中",
  Posted: "已入帳",
  Paid: "已付款",
  Completed: "已完成",
  Cancelled: "已取消"
};

export const healthStatusLabels: Record<HealthStatus | "Unknown", string> = {
  Healthy: "健康",
  Degraded: "部分異常",
  Unhealthy: "異常",
  Unknown: "未知"
};
