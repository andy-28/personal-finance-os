import { cookies } from "next/headers";

export const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:5000";
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
      data: { title: "API unavailable", detail: "Check whether BACKEND_API_URL points to a reachable backend service." }
    };
  }

  const data = await response.json().catch(() => ({
    title: response.ok ? "Invalid API response" : "Request failed",
    detail: response.ok ? "The API response was not valid JSON." : `The API returned HTTP ${response.status} without a JSON error body.`
  }));
  return { response, data };
}
