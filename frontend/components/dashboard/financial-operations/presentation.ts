import { money } from "@/lib/api-client";
import type { CashFlowItemDto, FinancialEventDto } from "@/lib/api/financial-operations";

export const kindLabels: Record<string, string> = {
  ConfirmedExpense: "已確認支出",
  ConditionalExpense: "條件事件",
  PlannedExpense: "規劃支出",
  ExpectedIncome: "預期收入",
  CardPayment: "信用卡繳款",
  Income: "收入",
  Expense: "支出",
  Transfer: "轉帳",
  OpeningBalance: "期初餘額",
  CreditCardPurchase: "信用卡消費",
  CreditCardRefund: "信用卡退款",
  CreditCardPayment: "信用卡繳款"
};

export const statusLabels: Record<string, string> = {
  Planned: "規劃中",
  Pending: "等待結果",
  Confirmed: "已確認",
  Completed: "已完成",
  Cancelled: "已取消",
  Expected: "預期",
  Projected: "推估",
  Posted: "已入帳"
};

export function displayKey(item: CashFlowItemDto) {
  if (item.financialEventId) return `FIN-${item.financialEventId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  if (item.source === "CreditCard") return "CARD-DUE";
  if (item.source === "Recurring") return "EXPECTED";
  return "SYSTEM";
}

export function amountText(item: CashFlowItemDto) {
  const prefix = item.isConditional ? "? " : item.amount > 0 ? "+" : "−";
  return `${prefix}${money(Math.abs(item.amount), item.currencyCode)}`;
}

export function eventToItem(event: FinancialEventDto): CashFlowItemDto {
  return {
    id: `event:${event.id}`,
    source: "FinancialEvent",
    kind: event.kind,
    status: event.status,
    title: event.name,
    date: event.eventDate,
    cashFlowDate: event.cashFlowDate,
    amount: -event.amount,
    currencyCode: event.currencyCode,
    isConditional: event.kind === "ConditionalExpense" && event.status !== "Confirmed",
    paymentSourceAccountId: event.paymentSourceAccountId,
    paymentSourceName: event.paymentSourceName,
    financialEventId: event.id,
    note: event.note
  };
}
