import { useSyncExternalStore } from "react";
import type {
  CauseDTO,
  DashboardDTO,
  Err,
  ErrorCode,
  InsightsDTO,
  Meta,
  Mode,
  Ok,
  OrderDTO,
  RegionId,
} from "@/server/contract";

export class ApiError extends Error {
  code: ErrorCode | "network";
  status: number;
  constructor(code: ErrorCode | "network", message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Last seen API mode (drives the MOCK badge).
let currentMode: Mode | null = null;
const listeners = new Set<() => void>();
function setMode(m: Mode) {
  if (m !== currentMode) {
    currentMode = m;
    listeners.forEach((l) => l());
  }
}
export function useApiMode(): Mode | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentMode,
    () => null,
  );
}

async function call<T>(path: string, init?: RequestInit & { lang?: string }): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) headers["Content-Type"] = "application/json";
  if (init?.lang) headers["Accept-Language"] = init.lang;
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError("network", "Network error", 0);
  }
  let json: Ok<T> | Err | null = null;
  try {
    json = (await res.json()) as Ok<T> | Err;
  } catch {
    /* non-JSON body */
  }
  if (json && "meta" in json && json.meta) setMode((json.meta as Meta).mode);
  if (json && "error" in json) throw new ApiError(json.error.code, json.error.message, res.status);
  if (!res.ok || !json) throw new ApiError("internal", `HTTP ${res.status}`, res.status);
  return json.data;
}

const post = (body?: unknown): RequestInit => ({
  method: "POST",
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const getDashboard = () => call<DashboardDTO>("/api/dashboard");
export const createOrder = (purpose: "sale" | "donation_demo", causeId?: string) =>
  call<OrderDTO>("/api/orders", post(purpose === "sale" ? { purpose } : { purpose, causeId }));
export const capture = (id: string) => call<OrderDTO>(`/api/orders/${encodeURIComponent(id)}/capture`, post());
export const getOrder = (id: string) => call<OrderDTO>(`/api/orders/${encodeURIComponent(id)}`);
export const cancel = (id: string) => call<OrderDTO>(`/api/orders/${encodeURIComponent(id)}/cancel`, post());
export const patchProfile = (p: { alias?: string; regionId?: RegionId; goalCents?: number }) =>
  call<DashboardDTO>("/api/profile", { method: "PATCH", body: JSON.stringify(p) });
export const getCauses = (regionId: RegionId) =>
  call<CauseDTO[]>(`/api/causes?regionId=${encodeURIComponent(regionId)}`);
export const getInsights = (lang: string) => call<InsightsDTO>("/api/insights", { ...post(), lang });

export function fmtUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
