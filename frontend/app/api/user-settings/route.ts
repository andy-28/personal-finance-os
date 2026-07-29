const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:5000";

const responseHeadersToStrip = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

function buildForwardHeaders(request: Request, hasBody: boolean) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");

  headers.set("Accept", accept ?? "application/json");
  if (authorization) headers.set("Authorization", authorization);
  if (hasBody) headers.set("Content-Type", contentType ?? "application/json");
  return headers;
}

async function proxyUserSettings(request: Request) {
  const requestUrl = new URL(request.url);
  const targetUrl = new URL("/api/user-settings/", backendApiUrl);
  targetUrl.search = requestUrl.search;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const headers = buildForwardHeaders(request, hasBody);
  const body = hasBody ? await request.text() : undefined;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual"
    });
  } catch (error) {
    console.error("Failed to proxy user settings request", error);
    return Response.json(
      { title: "API unavailable", detail: "Check whether BACKEND_API_URL points to a reachable backend service." },
      { status: 503 }
    );
  }

  const responseHeaders = new Headers(backendResponse.headers);
  for (const header of responseHeadersToStrip) responseHeaders.delete(header);
  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders
  });
}

export const dynamic = "force-dynamic";
export const GET = proxyUserSettings;
export const PUT = proxyUserSettings;
export const PATCH = proxyUserSettings;
