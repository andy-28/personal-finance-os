import { NextResponse } from "next/server";
import { clearRefreshCookie, forwardJson, getRefreshCookie, setRefreshCookie } from "../_shared";
import { isTransientBackendStatus } from "../../_shared/backend-proxy";

export async function POST() {
  const refreshToken = await getRefreshCookie();
  if (!refreshToken) return NextResponse.json({ title: "Unauthorized", detail: "Refresh token is missing." }, { status: 401 });
  const { response, data } = await forwardJson("/api/auth/refresh", { refreshToken });
  if (!response.ok) {
    if (!isTransientBackendStatus(response.status)) await clearRefreshCookie();
    return NextResponse.json(data, { status: response.status });
  }
  await setRefreshCookie(data.refreshToken);
  return NextResponse.json({ user: data.user, accessToken: data.accessToken });
}
