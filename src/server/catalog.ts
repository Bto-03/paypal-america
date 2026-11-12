import type { CauseDTO, RegionId, StickerId } from "./contract.ts";

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

export const DEFAULT_AVATAR: Record<RegionId, StickerId> = { galapagos: "tortoise", sierra: "llama", costa: "mango" };

export const STICKERS: { id: StickerId; regionId: RegionId | null; label_en: string; label_es: string }[] = [
  { id: "tortoise", regionId: "galapagos", label_en: "Giant tortoise", label_es: "Tortuga gigante" },
  { id: "booby", regionId: "galapagos", label_en: "Blue-footed booby", label_es: "Piquero de patas azules" },
  { id: "sealion", regionId: "galapagos", label_en: "Sea lion", label_es: "Lobo marino" },
  { id: "llama", regionId: "sierra", label_en: "Llama", label_es: "Llama" },
  { id: "cotopaxi", regionId: "sierra", label_en: "Cotopaxi volcano", label_es: "Volcán Cotopaxi" },
  { id: "hummingbird", regionId: "sierra", label_en: "Hummingbird", label_es: "Colibrí" },
  { id: "mango", regionId: "costa", label_en: "Mango", label_es: "Mango" },
  { id: "crab", regionId: "costa", label_en: "Red crab", label_es: "Cangrejo rojo" },
  { id: "palm", regionId: "costa", label_en: "Palm tree", label_es: "Palmera" },
  { id: "golden_mango", regionId: null, label_en: "Golden mango", label_es: "Mango dorado" },
  { id: "condor", regionId: null, label_en: "Andean condor", label_es: "Cóndor andino" },
];

export function isStickerId(x: unknown): x is StickerId {
  return typeof x === "string" && STICKERS.some((s) => s.id === x);
}
