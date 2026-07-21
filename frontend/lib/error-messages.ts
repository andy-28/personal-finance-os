import type { ProblemDetails } from "./api-client";

const statusMessages: Record<number, string> = {
  400: "輸入資料格式不正確，請檢查欄位後再試。",
  401: "登入狀態已失效，請重新登入。",
  403: "你沒有權限執行這個操作。",
  404: "找不到指定的資料。",
  409: "資料狀態衝突，請重新整理後再試。",
  500: "系統暫時發生問題，請稍後再試。",
  503: "API 服務目前無法連線，請確認後端已啟動。"
};

export function messageFromProblem(problem: ProblemDetails | undefined, fallbackStatus?: number) {
  const validation = problem?.errors?.[0]?.message;
  if (validation) return validation;
  if (problem?.detail) return problem.detail;
  if (problem?.status && statusMessages[problem.status]) return statusMessages[problem.status];
  if (fallbackStatus && statusMessages[fallbackStatus]) return statusMessages[fallbackStatus];
  return problem?.title ?? "發生未預期的錯誤，請稍後再試。";
}
