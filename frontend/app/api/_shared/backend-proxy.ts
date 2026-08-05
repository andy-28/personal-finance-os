export const REQUEST_TIMEOUT_MS = 120_000;

export type BackendProblemCode = "BACKEND_UNAVAILABLE" | "BACKEND_TIMEOUT";

export type BackendProblem = {
  title: string;
  detail: string;
  status: number;
  code: BackendProblemCode;
  message: string;
  retryable: true;
};

export function isTransientBackendStatus(status: number) {
  return status === 408 || status === 502 || status === 503 || status === 504;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function backendProblem(code: BackendProblemCode, status = code === "BACKEND_TIMEOUT" ? 504 : 503): BackendProblem {
  if (code === "BACKEND_TIMEOUT") {
    return {
      title: "Backend timeout",
      detail: "The API service did not respond in time. It may still be waking up.",
      status,
      code,
      message: "Backend service did not respond in time.",
      retryable: true
    };
  }

  return {
    title: "Backend temporarily unavailable",
    detail: "The API service is temporarily unavailable. It may be waking up from a cold start.",
    status,
    code,
    message: "Backend service is temporarily unavailable.",
    retryable: true
  };
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
