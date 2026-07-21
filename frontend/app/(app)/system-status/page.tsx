"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { getHealth, type HealthCheck, type HealthResponse, type HealthStatus } from "@/lib/api-client";
import { healthStatusLabels } from "@/lib/labels";

type LoadState = { kind: "loading" } | { kind: "ready"; data: HealthResponse } | { kind: "error"; message: string };

export default function SystemStatusPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal).then((data) => setState({ kind: "ready", data })).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ kind: "error", message: error instanceof Error ? error.message : "健康檢查失敗" });
    });
    return () => controller.abort();
  }, []);
  const checks = useMemo(() => state.kind === "ready" ? ["postgresql", "redis"].map((name) => state.data.checks.find((check) => check.name === name) ?? { name, status: "Unhealthy" as HealthStatus, duration: 0, description: null, error: "API 未回傳此服務狀態。", tags: [] }) : [], [state]);

  return (
    <section className="grid gap-6">
      <PageHeader title="系統狀態" description="確認 API、PostgreSQL 與 Redis 是否可正常服務。" actions={<OverallStatus state={state} />} />
      {state.kind === "loading" && <LoadingState label="正在檢查後端服務..." />}
      {state.kind === "error" && <ErrorState message={state.message} />}
      {state.kind === "ready" && <div className="grid gap-4 md:grid-cols-2">{checks.map((check) => <ServiceCard key={check.name} check={check} />)}</div>}
    </section>
  );
}

function OverallStatus({ state }: { state: LoadState }) {
  if (state.kind === "loading") return <Badge>檢查中</Badge>;
  if (state.kind === "error") return <Badge tone="danger">異常</Badge>;
  return <StatusBadge status={state.data.status} />;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const tone = status === "Healthy" ? "success" : status === "Degraded" ? "warning" : "danger";
  return <Badge tone={tone}>{healthStatusLabels[status]}</Badge>;
}

function ServiceCard({ check }: { check: HealthCheck }) {
  const serviceName = check.name === "postgresql" ? "PostgreSQL" : check.name === "redis" ? "Redis" : check.name;
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{serviceName}</h2>
          <p className="mt-1 text-sm text-muted">{check.tags.join(", ") || "service"}</p>
        </div>
        <StatusBadge status={check.status} />
      </div>
      <dl className="mt-5 grid gap-3 text-sm">
        <div className="flex justify-between gap-4 border-t pt-3"><dt className="text-muted">回應時間</dt><dd className="font-medium">{check.duration.toFixed(1)} ms</dd></div>
        {check.error && <div className="border-t pt-3"><dt className="text-muted">錯誤</dt><dd className="mt-1 text-danger">{check.error}</dd></div>}
      </dl>
    </Card>
  );
}
