import { NextResponse } from "next/server";
import { clearRefreshCookie, forwardJson, getRefreshCookie } from "../_shared";

export async function POST() {
  const refreshToken = await getRefreshCookie();
  if (refreshToken) await forwardJson("/api/auth/logout", { refreshToken });
  await clearRefreshCookie();
  return new NextResponse(null, { status: 204 });
}
