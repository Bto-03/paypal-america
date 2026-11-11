import type { CauseDTO, RegionId } from "./contract.ts";

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: "galapagos", label: "Galápagos" },
  { id: "sierra", label: "Sierra (Quito)" },
  { id: "costa", label: "Costa (Guayaquil)" },
];

export function isRegion(x: unknown): x is RegionId {
  return typeof x === "string" && REGIONS.some((r) => r.id === x);
}

export function regionLabel(id: RegionId): string {
  return REGIONS.find((r) => r.id === id)?.label ?? id;
}

// Fixed DEMO causes. Not real organizations; every one is labeled DEMO.
export const CAUSES: CauseDTO[] = [
  {
    id: "demo-galapagos-reef",
    name: "DEMO · Reef cleanup fund",
    regionId: "galapagos",
    description: "Demo cause for the sandbox. No real organization receives this.",
    demo: true,
    amountCents: 100,
  },
  {
    id: "demo-sierra-school",
    name: "DEMO · Rural school supplies",
    regionId: "sierra",
    description: "Demo cause for the sandbox. No real organization receives this.",
    demo: true,
    amountCents: 100,
  },
  {
    id: "demo-costa-mangrove",
    name: "DEMO · Mangrove restoration",
    regionId: "costa",
    description: "Demo cause for the sandbox. No real organization receives this.",
    demo: true,
    amountCents: 100,
  },
];

export function causesFor(regionId: RegionId | null): CauseDTO[] {
  if (!regionId) return [...CAUSES];
  return [...CAUSES].sort((a, b) => Number(b.regionId === regionId) - Number(a.regionId === regionId));
}
