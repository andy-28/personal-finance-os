"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import {
  AetherActionBar,
  AetherDefinitionList,
  AetherDefinitionRow,
  AetherListRow,
  AetherPanelHeader,
  AetherSectionHeader,
  AetherStatusIndicator,
  AetherToolbar
} from "@/components/ui/aether-management";
import { getHealth, type HealthCheck, type HealthResponse, type HealthStatus } from "@/lib/api-client";
import { healthStatusLabels } from "@/lib/labels";

type StatusFilter = "All" | "Healthy" | "Warning" | "Error";
type LoadState = {
  isLoading: boolean;
  data?: HealthResponse;
  error?: string;
  lastCheckedAt?: string;
};
type ServiceView = {
  id: string;
  name: string;
  type: string;
  status: HealthStatus | "Checking" | "Unknown";
  endpoint?: string;
  duration?: number;
  message?: string;
  error?: string | null;
  tags?: string[];
};

const productionHealthMessage = "Production health endpoint does not expose detailed checks.";

export default function SystemStatusPage() {
  const [state, setState] = useState<LoadState>({ isLoading: true });
  const [selectedId, setSelectedId] = useState("backend");
  const [filter, setFilter] = useState<StatusFilter>("All");

  async function runCheck(signal?: AbortSignal) {
    setState((current) => ({ ...current, isLoading: true, error: undefined }));
    try {
      const data = await getHealth(signal);
      setState({ isLoading: false, data, lastCheckedAt: new Date().toISOString() });
    } catch (error) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "健康檢查失敗",
        lastCheckedAt: new Date().toISOString()
      }));
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    runCheck(controller.signal);
    return () => controller.abort();
  }, []);

  const services = useMemo(() => buildServices(state), [state]);
  const visibleServices = useMemo(() => services.filter((service) => {
    if (filter === "All") return true;
    if (filter === "Healthy") return service.status === "Healthy";
    if (filter === "Warning") return service.status === "Degraded" || service.status === "Unknown" || service.status === "Checking";
    return service.status === "Unhealthy";
  }), [services, filter]);
  const selectedService = services.find((service) => service.id === selectedId) ?? services[0];
  const summary = useMemo(() => ({
    healthy: services.filter((service) => service.status === "Healthy").length,
    warning: services.filter((service) => service.status === "Degraded" || service.status === "Unknown" || service.status === "Checking").length,
    error: services.filter((service) => service.status === "Unhealthy").length
  }), [services]);

  useEffect(() => {
    if (!services.some((service) => service.id === selectedId) && services[0]) setSelectedId(services[0].id);
  }, [services, selectedId]);

  return (
    <section className="grid gap-6">
      <PageHeader
        title="系統狀態"
        description="檢查前端、API、資料庫與快取服務的連線狀態。"
        actions={<Button type="button" onClick={() => runCheck()} isLoading={state.isLoading}>重新檢查全部</Button>}
      />
      {state.error && <ErrorState message={state.error} />}
      <GameWindow title="Service Checks" description="Aether Diagnostics Window">
        <div className="aether-management-window" aria-busy={state.isLoading}>
          <AetherPanelHeader
            eyebrow="SYSTEM DIAGNOSTICS"
            title="服務狀態"
            subtitle={state.lastCheckedAt ? `最後檢查 ${formatDateTime(state.lastCheckedAt)}` : "等待健康檢查回應"}
            summary={`${summary.healthy} 正常 / ${summary.warning} 警告 / ${summary.error} 錯誤`}
            actions={<Button type="button" variant="outline" onClick={() => runCheck()} isLoading={state.isLoading}>重新檢查</Button>}
          />
          <AetherToolbar role="tablist" ariaLabel="服務狀態篩選">
            {(["All", "Healthy", "Warning", "Error"] as StatusFilter[]).map((nextFilter) => (
              <button
                key={nextFilter}
                type="button"
                role="tab"
                aria-selected={filter === nextFilter}
                className={`aether-filter-tab ${filter === nextFilter ? "aether-filter-tab-active" : ""}`}
                onClick={() => setFilter(nextFilter)}
              >
                {statusFilterLabel(nextFilter)}
              </button>
            ))}
            <div className="aether-status-summary" aria-label="服務摘要">
              <AetherStatusIndicator label={`正常 ${summary.healthy}`} tone="success" />
              <AetherStatusIndicator label={`警告 ${summary.warning}`} tone="warning" />
              <AetherStatusIndicator label={`錯誤 ${summary.error}`} tone="danger" />
            </div>
          </AetherToolbar>

          <div className={`aether-master-detail ${state.isLoading ? "aether-loading-shell" : ""}`}>
            <div className="aether-list-pane" aria-label="服務清單">
              <AetherSectionHeader title="服務清單" meta={state.isLoading ? "檢查中" : `${visibleServices.length} services`} />
              {visibleServices.map((service) => (
                <AetherListRow
                  key={service.id}
                  title={service.name}
                  subtitle={`${statusText(service.status)}${typeof service.duration === "number" ? ` / ${service.duration.toFixed(1)} ms` : ""}`}
                  meta={<AetherStatusIndicator label={statusText(service.status)} tone={statusTone(service.status)} />}
                  isActive={selectedService?.id === service.id}
                  onClick={() => setSelectedId(service.id)}
                />
              ))}
            </div>

            <div className="aether-detail-pane">
              {selectedService && (
                <div className="aether-detail-scroll">
                  <AetherSectionHeader title={selectedService.name} meta={selectedService.type} />
                  <div className="flex flex-wrap items-center gap-2">
                    <AetherStatusIndicator label={statusText(selectedService.status)} tone={statusTone(selectedService.status)} />
                    {state.isLoading && <AetherStatusIndicator label="檢查中" tone="credit" />}
                  </div>

                  <AetherDefinitionList>
                    <AetherDefinitionRow label="Service" value={selectedService.name} />
                    <AetherDefinitionRow label="Type" value={selectedService.type} />
                    <AetherDefinitionRow label="狀態" value={statusText(selectedService.status)} />
                    <AetherDefinitionRow label="Endpoint" value={selectedService.endpoint ?? "目前程式未提供"} />
                    <AetherDefinitionRow label="回應時間" value={typeof selectedService.duration === "number" ? `${selectedService.duration.toFixed(1)} ms` : "未提供"} />
                    <AetherDefinitionRow label="最後檢查" value={state.lastCheckedAt ? formatDateTime(state.lastCheckedAt) : "尚未完成"} />
                    <AetherDefinitionRow label="Tags" value={selectedService.tags?.join(", ") || "未提供"} />
                    <AetherDefinitionRow label="訊息" value={selectedService.message ?? "沒有額外訊息"} />
                    {selectedService.error && <AetherDefinitionRow label="錯誤訊息" value={<span className="text-danger">{selectedService.error}</span>} className="md:col-span-2" />}
                    {selectedService.status === "Unhealthy" && <AetherDefinitionRow label="建議" value={serviceGuidance(selectedService)} className="md:col-span-2" />}
                  </AetherDefinitionList>

                  <AetherActionBar>
                    <Button type="button" variant="outline" onClick={() => runCheck()} isLoading={state.isLoading}>重新檢查此服務</Button>
                  </AetherActionBar>
                </div>
              )}
            </div>
          </div>
        </div>
      </GameWindow>
    </section>
  );
}

function buildServices(state: LoadState): ServiceView[] {
  const data = state.data;
  const postgres = findCheck(data, "postgresql");
  const redis = findCheck(data, "redis");
  const hasDetailedChecks = Boolean(data?.checks?.length);

  return [
    {
      id: "frontend",
      name: "Frontend",
      type: "Next.js Client",
      status: "Healthy",
      endpoint: "目前頁面",
      message: "前端頁面已成功載入。"
    },
    {
      id: "backend",
      name: "Backend API",
      type: "Health Endpoint",
      status: state.isLoading && !data ? "Checking" : state.error && !data ? "Unhealthy" : data?.status ?? "Unknown",
      endpoint: "/health",
      duration: data?.totalDuration,
      message: data
        ? hasDetailedChecks
          ? "API service reachable."
          : data.status === "Healthy"
            ? "Backend API: Healthy. Production health endpoint does not expose detailed checks."
            : "API service reachable, but detailed dependency checks are unavailable."
        : undefined,
      error: state.error
    },
    normalizeHealthCheck(postgres, "postgresql", "PostgreSQL", "Database", "postgresql", data && !hasDetailedChecks ? productionHealthMessage : undefined),
    normalizeHealthCheck(redis, "redis", "Redis", "Cache", "redis", data && !hasDetailedChecks ? productionHealthMessage : undefined)
  ];
}

function findCheck(data: HealthResponse | undefined, name: string) {
  return data?.checks?.find((check) => check.name === name);
}

function normalizeHealthCheck(check: HealthCheck | undefined, id: string, name: string, type: string, tag: string, fallbackMessage?: string): ServiceView {
  if (!check) {
    return {
      id,
      name,
      type,
      status: "Unknown",
      duration: undefined,
      message: fallbackMessage ?? "API 尚未回傳此服務狀態。",
      error: null,
      tags: [tag]
    };
  }

  return {
    id,
    name,
    type,
    status: check.status,
    duration: check.duration,
    message: check.description ?? undefined,
    error: check.error,
    tags: check.tags ?? []
  };
}

function StatusBadgeStatus(status: ServiceView["status"]) {
  return status;
}

function statusText(status: ServiceView["status"]) {
  if (status === "Checking") return "檢查中";
  if (status === "Unknown") return "未知";
  return healthStatusLabels[status];
}

function statusTone(status: ServiceView["status"]) {
  const normalized = StatusBadgeStatus(status);
  if (normalized === "Healthy") return "success";
  if (normalized === "Degraded" || normalized === "Checking" || normalized === "Unknown") return "warning";
  return "danger";
}

function statusFilterLabel(filter: StatusFilter) {
  const labels: Record<StatusFilter, string> = {
    All: "全部",
    Healthy: "正常",
    Warning: "警告",
    Error: "錯誤"
  };
  return labels[filter];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function serviceGuidance(service: ServiceView) {
  if (service.id === "backend") return "確認 Backend API 是否已啟動，並檢查 Next.js 伺服器端 BACKEND_API_URL 是否指向正確服務。";
  if (service.id === "postgresql") return "確認 PostgreSQL container 是否正在執行，連線字串與 port 是否正確。";
  if (service.id === "redis") return "確認 Redis container 是否正在執行，快取連線設定是否正確。";
  return "請確認此服務是否已啟動。";
}
