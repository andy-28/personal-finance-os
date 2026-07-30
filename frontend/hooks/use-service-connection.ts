"use client";

import { useEffect, useState } from "react";
import { COLD_START_NOTICE_DELAY_MS, CONNECTION_NOTICE_DELAY_MS } from "@/lib/api-client";
import type { ServiceConnectionStage } from "@/components/system/service-connection-state";

export function useServiceConnection(isPending: boolean, hasRetryableError = false) {
  const [noticeStage, setNoticeStage] = useState<ServiceConnectionStage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (hasRetryableError || !isPending) return;

    const startedAt = Date.now();
    const resetTimer = setTimeout(() => {
      setNoticeStage(null);
      setElapsedSeconds(0);
    }, 0);
    const connectionTimer = setTimeout(() => setNoticeStage("loading-data"), CONNECTION_NOTICE_DELAY_MS);
    const coldStartTimer = setTimeout(() => setNoticeStage("waking-api"), COLD_START_NOTICE_DELAY_MS);
    const elapsedTimer = setInterval(() => setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000))), 1000);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(connectionTimer);
      clearTimeout(coldStartTimer);
      clearInterval(elapsedTimer);
    };
  }, [hasRetryableError, isPending]);

  const stage: ServiceConnectionStage = hasRetryableError ? "retryable-error" : isPending ? noticeStage ?? "connecting" : "ready";

  return { stage, elapsedSeconds };
}
