import { backendProblem, fetchWithTimeout, isAbortError, isTransientBackendStatus } from "../_shared/backend-proxy";

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:5000";

type ProxyContext = { params: Promise<{ backend: string[] }> };

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

function buildBackendUrl(request: Request, segments: string[]) {
  const requestUrl = new URL(request.url);
  const path = segments.join("/");
  const backendPath = path === "health" ? "/health" : `/api/${path}`;
  const targetUrl = new URL(backendPath, backendApiUrl);
  targetUrl.search = requestUrl.search;
  return targetUrl;
}

function buildForwardHeaders(request: Request) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!hopByHopHeaders.has(normalizedKey) && normalizedKey !== "cookie") {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxyBackend(request: Request, context: ProxyContext) {
  const params = await context.params;
  const targetUrl = buildBackendUrl(request, params.backend);
  const headers = buildForwardHeaders(request);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let backendResponse: Response;
  try {
    backendResponse = await fetchWithTimeout(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual"
    });
  } catch (error) {
    const problem = backendProblem(isAbortError(error) ? "BACKEND_TIMEOUT" : "BACKEND_UNAVAILABLE");
    return Response.json(problem, { status: problem.status });
  }

  if (isTransientBackendStatus(backendResponse.status)) {
    const problem = backendProblem("BACKEND_UNAVAILABLE", backendResponse.status);
    return Response.json(problem, { status: backendResponse.status });
  }

  const responseHeaders = new Headers(backendResponse.headers);
  for (const header of hopByHopHeaders) responseHeaders.delete(header);
  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders
  });
}

export const dynamic = "force-dynamic";
export const GET = proxyBackend;
export const POST = proxyBackend;
export const PUT = proxyBackend;
export const PATCH = proxyBackend;
export const DELETE = proxyBackend;
export const OPTIONS = proxyBackend;
