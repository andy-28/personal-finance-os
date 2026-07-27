export const financeDataChangedEvent = "personal-finance-os:finance-data-changed";

export function notifyFinanceDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(financeDataChangedEvent));
}
