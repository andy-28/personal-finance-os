import { cookies } from "next/headers";

export const apiBaseUrl = process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const cookieName = "pfos_refresh_token";

export async function setRefreshCookie(refreshToken: string) {
  const jar = await cookies();
  jar.set(cookieName, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function getRefreshCookie() {
  return (await cookies()).get(cookieName)?.value;
}

export async function clearRefreshCookie() {
  (await cookies()).delete(cookieName);
}

export async function forwardJson(path: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
  } catch {
    return {
      response: new Response(null, { status: 503 }),
      data: { title: "API 無法連線", detail: "請確認 Backend API 已啟動，並檢查 BACKEND_API_URL 或 NEXT_PUBLIC_API_URL 設定。" }
    };
  }

  const data = await response.json().catch(() => ({
    title: response.ok ? "API 回應格式錯誤" : "請求失敗",
    detail: response.ok ? "API 回傳的內容不是有效 JSON。" : `API 回傳 HTTP ${response.status}，且沒有有效 JSON 錯誤內容。`
  }));
  return { response, data };
}
