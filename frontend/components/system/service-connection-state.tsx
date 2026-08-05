import { Button } from "@/components/ui/button";

export type ServiceConnectionStage =
  | "connecting"
  | "waking-api"
  | "loading-data"
  | "ready"
  | "retryable-error"
  | "fatal-error";

type ServiceConnectionStateProps = {
  stage: ServiceConnectionStage;
  elapsedSeconds?: number;
  title?: string;
  detail?: string;
  message?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  compact?: boolean;
};

const stageCopy: Record<ServiceConnectionStage, { title: string; description: string }> = {
  connecting: {
    title: "正在連線",
    description: "正在連線到 PersonalFinanceOS 服務。"
  },
  "waking-api": {
    title: "正在喚醒 API",
    description: "Render 免費服務可能正在冷啟動，通常需要 30～90 秒。"
  },
  "loading-data": {
    title: "正在載入資料",
    description: "API 已回應，正在整理帳戶與交易資料。"
  },
  ready: {
    title: "連線完成",
    description: "服務已可正常使用。"
  },
  "retryable-error": {
    title: "API 暫時無法連線",
    description: "服務可能正在喚醒中，系統會自動重試。"
  },
  "fatal-error": {
    title: "系統發生問題",
    description: "請稍後再試，或檢查服務設定。"
  }
};

export function ServiceConnectionState({
  stage,
  elapsedSeconds,
  title,
  detail,
  message,
  onRetry,
  onCancel,
  compact = false
}: ServiceConnectionStateProps) {
  const copy = stageCopy[stage];
  const showSpinner = stage === "connecting" || stage === "waking-api" || stage === "loading-data";
  const isError = stage === "retryable-error" || stage === "fatal-error";

  return (
    <div
      className={`rounded-ui border ${
        isError ? "border-amber-300/35 bg-amber-950/20" : "border-cyan-400/30 bg-slate-950/55"
      } ${compact ? "p-3" : "p-4"} shadow-[0_0_24px_rgba(66,198,229,0.12)]`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 grid size-8 place-items-center rounded-ui border border-cyan-300/40 bg-cyan-400/10 text-cyan-200">
          {showSpinner ? <span className="size-3 animate-pulse rounded-full bg-cyan-300" /> : <span className="size-2 rounded-full bg-amber-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title ?? copy.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{message ?? detail ?? copy.description}</p>
          {elapsedSeconds !== undefined && elapsedSeconds > 0 && (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-cyan-200/80">已等待 {elapsedSeconds} 秒</p>
          )}
        </div>
      </div>
      {(onRetry || onCancel) && (
        <div className="mt-3 flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              取消
            </Button>
          )}
          {onRetry && (
            <Button type="button" onClick={onRetry}>
              重試
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
