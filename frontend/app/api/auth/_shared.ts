import { cookies } from "next/headers";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
