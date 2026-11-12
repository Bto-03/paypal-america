"use client";
import { useSyncExternalStore } from "react";
import type { RegionId } from "@/server/contract";

/* Region store: screens call setBackgroundRegion(profile.regionId); Shell reads it. */
const KEY = "pa_region";
const EVT = "pa-region";
const REGIONS: RegionId[] = ["galapagos", "sierra", "costa"];

function read(): RegionId {
  try {
    const v = localStorage.getItem(KEY) as RegionId | null;
    return v && REGIONS.includes(v) ? v : "sierra";
  } catch {
    return "sierra";
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}
export function setBackgroundRegion(r: RegionId) {
  try {
    localStorage.setItem(KEY, r);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT));
}
export function useBackgroundRegion(): RegionId {
  return useSyncExternalStore(subscribe, read, () => "sierra" as RegionId);
}

/* Deterministic topographic rings around a few "peaks" (no randomness → no hydration drift). */
function ring(cx: number, cy: number, r: number, seed: number): string {
  const n = 56;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob =
      1 +
      0.12 * Math.sin(a * 2 + seed) +
      0.07 * Math.sin(a * 3 - seed * 1.7) +
      0.04 * Math.sin(a * 5 + seed * 2.3) +
      (r / 900) * 0.25 * Math.sin(a * 1 + seed * 0.5);
    pts.push([cx + Math.cos(a) * r * wob * 1.35, cy + Math.sin(a) * r * wob * 0.8]);
  }
  const m = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as const;
  const f = (v: number) => Math.round(v * 10) / 10;
  const s0 = m(pts[n - 1], pts[0]);
  let d = `M${f(s0[0])} ${f(s0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const e = m(p, pts[(i + 1) % n]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(e[0])} ${f(e[1])}`;
  }
  return d + "Z";
}

const PEAKS = [
  { cx: 900, cy: 210, rings: 15, step: 30, seed: 1.3, drift: "drift-a" },
  { cx: 230, cy: 640, rings: 13, step: 32, seed: 4.1, drift: "drift-b" },
  { cx: 560, cy: 420, rings: 6, step: 34, seed: 2.6, drift: "drift-a" },
];
const PATHS = PEAKS.map((p) =>
  Array.from({ length: p.rings }, (_, i) => ({ d: ring(p.cx, p.cy, 16 + i * p.step, p.seed + i * 0.05), accent: i % 4 === 3 })),
);

/** The contour SVG alone (used by Hero). Styling comes from the parent's CSS (.c-base / .c-accent). */
export function ContourLines() {
  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false">
      {PEAKS.map((p, pi) => (
        <g key={pi} className={p.drift}>
          {PATHS[pi].map((r, i) => (
            <path key={i} d={r.d} className={r.accent ? "c-accent" : "c-base"} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function Background({ regionId }: { regionId: RegionId }) {
  return (
    <div className="bg-andes no-print" data-region={regionId} aria-hidden="true">
      <ContourLines />
    </div>
  );
}
