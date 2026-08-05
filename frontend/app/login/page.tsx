"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ServiceConnectionState } from "@/components/system/service-connection-state";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { getHealth, isRetryableApiError, problemMessage } from "@/lib/api-client";
import type { ServiceConnectionStage } from "@/components/system/service-connection-state";
import { useAuth } from "../auth-context";

const HEALTH_RETRY_DELAY_MS = 5_000;
const LOGIN_RETRY_DELAY_MS = 5_000;
const MAX_LOGIN_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStage, setApiStage] = useState<ServiceConnectionStage>("connecting");
  const [apiMessage, setApiMessage] = useState("正在確認 API 是否已就緒。");
  const [warmupStartedAt, setWarmupStartedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loginAttempt, setLoginAttempt] = useState(0);
  const apiStageRef = useRef<ServiceConnectionStage>("connecting");
  const warmupPromiseRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    apiStageRef.current = apiStage;
  }, [apiStage]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (apiStage === "ready") return;
    const timer = setInterval(() => setElapsedSeconds(Math.max(1, Math.round((Date.now() - warmupStartedAt) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [apiStage, warmupStartedAt]);

  const runWarmup = useCallback(() => {
    if (apiStageRef.current === "ready") return Promise.resolve(true);
    if (warmupPromiseRef.current) return warmupPromiseRef.current;

    setWarmupStartedAt(Date.now());
    setElapsedSeconds(0);
    setApiStage("connecting");
    setApiMessage("正在確認 API 是否已就緒。");

    warmupPromiseRef.current = (async () => {
      while (mountedRef.current) {
        try {
          const health = await getHealth();
          if (health.status === "Healthy" || health.status === "Degraded") {
          if (mountedRef.current) {
            setApiStage("ready");
            setElapsedSeconds(0);
            setApiMessage("API 已就緒，可以登入。");
          }
            return true;
          }
          if (mountedRef.current) {
            setApiStage("retryable-error");
            setApiMessage("API health 尚未就緒，正在重新檢查。");
          }
        } catch (err) {
          if (!isRetryableApiError(err)) {
            if (mountedRef.current) {
              setApiStage("fatal-error");
              setApiMessage(problemMessage(err));
            }
            return false;
          }
          if (mountedRef.current) {
            setApiStage("waking-api");
            setApiMessage("Render 免費服務可能正在冷啟動，系統會自動重新檢查。");
          }
        }

        await sleep(HEALTH_RETRY_DELAY_MS);
      }
      return false;
    })().finally(() => {
      warmupPromiseRef.current = null;
    });

    return warmupPromiseRef.current;
  }, []);

  useEffect(() => {
    void runWarmup();
  }, [runWarmup]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setLoginAttempt(0);
    try {
      const isReady = await runWarmup();
      if (!isReady) return;

      for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt += 1) {
        setLoginAttempt(attempt);
        try {
          await login(email, password);
          router.replace("/accounts");
          return;
        } catch (err) {
          if (!isRetryableApiError(err) || attempt === MAX_LOGIN_ATTEMPTS) {
            setError(problemMessage(err));
            return;
          }
          setApiStage("waking-api");
          setApiMessage(`登入請求遇到 API 冷啟動，${LOGIN_RETRY_DELAY_MS / 1000} 秒後自動重試（${attempt + 1}/${MAX_LOGIN_ATTEMPTS}）。`);
          await sleep(LOGIN_RETRY_DELAY_MS);
          await runWarmup();
        }
      }
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsSubmitting(false);
      setLoginAttempt(0);
    }
  }

  const isApiReady = apiStage === "ready";
  const buttonLabel = isSubmitting
    ? loginAttempt > 1
      ? `登入中（第 ${loginAttempt} 次）...`
      : "登入中..."
    : isApiReady
      ? "登入"
      : "正在喚醒 API...";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-ui border bg-surface p-6 shadow-panel">
        <p className="text-sm font-medium text-muted">PersonalFinanceOS</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">登入</h1>
        <p className="mt-1 text-sm text-muted">管理你的帳戶、交易與信用卡待辦。</p>
        <label className="ui-label mt-6">
          電子郵件
          <input className="ui-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="ui-label mt-4">
          密碼
          <input className="ui-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {apiStage !== "ready" && (
          <div className="mt-4">
            <ServiceConnectionState
              stage={apiStage}
              elapsedSeconds={elapsedSeconds}
              message={apiMessage}
              onRetry={apiStage === "fatal-error" ? () => void runWarmup() : undefined}
              compact
            />
          </div>
        )}
        {isSubmitting && apiStage === "ready" && (
          <div className="mt-4">
            <ServiceConnectionState stage="loading-data" message={loginAttempt > 1 ? `正在重新送出登入請求（${loginAttempt}/${MAX_LOGIN_ATTEMPTS}）。` : "正在登入，請稍候。"} compact />
          </div>
        )}
        {error && (
          <div className="mt-4">
            <ErrorState message={error} />
          </div>
        )}
        <Button type="submit" className="mt-5 w-full" isLoading={isSubmitting} disabled={isSubmitting || !isApiReady}>
          {buttonLabel}
        </Button>
        <p className="mt-4 text-sm text-muted">
          還沒有帳號？ <Link className="font-medium text-foreground underline" href="/register">建立帳號</Link>
        </p>
      </form>
    </main>
  );
}
