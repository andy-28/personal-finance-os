import { NextResponse } from "next/server";
import { forwardJson, setRefreshCookie } from "../_shared";

export async function POST(request: Request) {
  const body = await request.json();
  const { response, data } = await forwardJson("/api/auth/register", body);
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  await setRefreshCookie(data.refreshToken);
  return NextResponse.json({ user: data.user, accessToken: data.accessToken }, { status: 201 });
}
