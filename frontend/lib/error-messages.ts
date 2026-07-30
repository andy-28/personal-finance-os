import type { ProblemDetails } from "./api-client";

const statusMessages: Record<number, string> = {
  400: "輸入資料不完整，請確認後再試。",
  401: "登入狀態已過期，請重新登入。",
  403: "你沒有權限執行這個操作。",
  404: "找不到指定的資料。",
  408: "API 回應逾時，請稍後重試。",
  409: "資料狀態已變更，請重新整理後再試。",
  422: "輸入資料未通過驗證，請檢查欄位內容。",
  500: "系統暫時發生問題，請稍後再試。",
  502: "API 服務暫時無法連線，可能正在喚醒中。",
  503: "API 服務暫時無法連線，可能正在喚醒中。",
  504: "API 回應逾時，可能正在喚醒中。"
};

export function messageFromProblem(problem: ProblemDetails | undefined, fallbackStatus?: number) {
  const validation = problem?.errors?.[0]?.message;
  if (validation) return validation;
  if (problem?.code === "BACKEND_TIMEOUT") return "API 回應逾時，Render 服務可能正在喚醒中，請稍後重試。";
  if (problem?.code === "BACKEND_UNAVAILABLE") return "API 服務暫時無法連線，Render 服務可能正在冷啟動，請稍後重試。";
  if (problem?.message) return problem.message;
  if (problem?.detail) return problem.detail;
  if (problem?.status && statusMessages[problem.status]) return statusMessages[problem.status];
  if (fallbackStatus && statusMessages[fallbackStatus]) return statusMessages[fallbackStatus];
  return problem?.title ?? "系統暫時發生問題，請稍後再試。";
}
