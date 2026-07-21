export const locale = "zh-TW";
export const timeZone = "Asia/Taipei";

export function formatCurrency(value: number, currency = "TWD") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseLocalDate(value) : value;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(date);
}

export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? parseLocalDate(value) : value;
  return new Intl.DateTimeFormat(locale, { month: "2-digit", day: "2-digit", timeZone }).format(date);
}

export function formatPercentage(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value);
}

export function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  if (!value.includes("-")) return new Date(value);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
