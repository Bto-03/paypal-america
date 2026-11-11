"use client";
import { useCallback, useEffect, useState } from "react";
import type { DashboardDTO } from "@/server/contract";
import { ApiError, getDashboard } from "@/lib/api";

export function useDashboard() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: ApiError) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, setData, error, reload };
}
