"use client";

import { useEffect, useMemo, useState } from "react";
import { getHealth, type HealthCheck, type HealthResponse, type HealthStatus } from "@/lib/api-client";

type LoadState = { kind: "loading" } | { kind: "ready"; data: HealthResponse } | { kind: "error"; message: string };
const statusStyles: Record<HealthStatus, string> = { Healthy: "border-emerald-600 bg-emerald-50 text-emerald-800", Degraded: "border-amber-600 bg-amber-50 text-amber-800", Unhealthy: "border-rose-600 bg-rose-50 text-rose-800" };

export default function SystemStatusPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal).then((data) => setState({ kind: "ready", data })).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ kind: "error", message: error instanceof Error ? error.message : "Health check failed" });
    });
    return () => controller.abort();
  }, []);
  const checks = useMemo(() => state.kind === "ready" ? ["postgresql", "redis"].map((name) => state.data.checks.find((check) => check.name === name) ?? { name, status: "Unhealthy" as HealthStatus, duration: 0, description: null, error: "Check was not returned by the API.", tags: [] }) : [], [state]);
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">System</p><h1 className="mt-2 text-3xl font-semibold">Local system health</h1></div><OverallStatus state={state} /></header>
      {state.kind === "loading" && <div className="rounded border border-stone-300 bg-white p-5 text-stone-700">Checking backend services...</div>}
      {state.kind === "error" && <div className="rounded border border-rose-300 bg-rose-50 p-5 text-rose-800">{state.message}</div>}
      {state.kind === "ready" && <div className="grid gap-4 sm:grid-cols-2">{checks.map((check) => <ServiceCard key={check.name} check={check} />)}</div>}
    </section>
  );
}

function OverallStatus({ state }: { state: LoadState }) {
  if (state.kind === "loading") return <span className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700">Loading</span>;
  if (state.kind === "error") return <span className="rounded border border-rose-600 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">Unhealthy</span>;
  return <span className={`rounded border px-3 py-2 text-sm font-medium ${statusStyles[state.data.status]}`}>{state.data.status}</span>;
}

function ServiceCard({ check }: { check: HealthCheck }) {
  return <article className="rounded border border-stone-300 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold capitalize">{check.name}</h2><p className="mt-1 text-sm text-stone-600">{check.tags.join(", ") || "service"}</p></div><span className={`rounded border px-2.5 py-1 text-xs font-medium ${statusStyles[check.status]}`}>{check.status}</span></div><dl className="mt-5 grid gap-3 text-sm"><div className="flex justify-between gap-4 border-t border-stone-200 pt-3"><dt className="text-stone-500">Duration</dt><dd className="font-medium">{check.duration.toFixed(1)} ms</dd></div>{check.error && <div className="border-t border-stone-200 pt-3"><dt className="text-stone-500">Error</dt><dd className="mt-1 text-rose-700">{check.error}</dd></div>}</dl></article>;
}
