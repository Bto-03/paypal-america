// AI insights: the model only rephrases numbers computed by money.ts. Everything it says is validated.
import { createHash } from "node:crypto";
import type { DashboardDTO, EvidenceItem, InsightDTO, InsightsDTO } from "./contract.ts";
import { fmt } from "./money.ts";

export type Lang = "en" | "es";
export interface InsightDeps {
  llm?: (prompt: { system: string; user: string }) => Promise<string>;
  cache?: { get(sig: string): string | null; put(sig: string, json: string): void };
}

const CATEGORIES = new Set(["progress", "fees", "withdrawal", "next_step"]);

export function buildEvidence(d: DashboardDTO): EvidenceItem[] {
  const e: EvidenceItem[] = [];
  const add = (id: string, label: string, valueCents: number | null, value: string, source: EvidenceItem["source"]) =>
    e.push({ id, label, valueCents, value, source });
  const s = d.sales;
  add("sales_count", "Completed sales", null, String(s.count), "computed");
  add("gross", "Gross sales", s.grossCents, fmt(s.grossCents), "computed");
  if (s.observed) {
    add("fee_observed", "Fee observed in PayPal sandbox", s.observed.feeCents, fmt(s.observed.feeCents), "sandbox_observed");
    add("net_observed", "Net observed in PayPal sandbox", s.observed.netCents, fmt(s.observed.netCents), "sandbox_observed");
  }
  add("fee_ec", "Estimated fee, Ecuador account", s.estimateEc.feeCents, fmt(s.estimateEc.feeCents), "ec_estimate");
  add("net_ec", "Estimated net, Ecuador account", s.estimateEc.netCents, fmt(s.estimateEc.netCents), "ec_estimate");
  add("ec_rule", "Ecuador fee rule (estimate)", null, "5.40% + $0.30", "ec_estimate");
  add("goal_target", "Savings goal", d.goal.targetCents, fmt(d.goal.targetCents), "declared");
  add("goal_progress", "Goal progress (estimated net)", d.goal.progressCents, fmt(d.goal.progressCents), "ec_estimate");
  add("goal_percent", "Goal progress percent", null, `${d.goal.percent}%`, "computed");
  add("withdraw_fee", "Estimated withdrawal fee", s.withdrawal.feeCents, fmt(s.withdrawal.feeCents), "ec_estimate");
  add("withdraw_net", "Estimated amount after withdrawal", s.withdrawal.netCents, fmt(s.withdrawal.netCents), "ec_estimate");
  add("withdraw_rule", "Withdrawal rule (estimate)", null, "0.50%, minimum $10.00", "ec_estimate");
  const place = d.places.find((p) => p.id === d.profile.regionId)?.label ?? d.profile.regionId;
  add("region", "Declared region", null, place, "declared");
  return e;
}

const numbers = (t: string): number[] =>
  (t.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, "")));

export function validate(raw: unknown, evidence: EvidenceItem[]): InsightDTO[] {
  const items = (raw as { insights?: unknown } | null)?.insights;
  if (!Array.isArray(items)) return [];
  const ids = new Set(evidence.map((x) => x.id));
  const allowed = new Set(evidence.flatMap((x) => numbers(x.value)));
  const out: InsightDTO[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const { category, text, evidenceIds, assumptions } = it as Record<string, unknown>;
    if (typeof category !== "string" || !CATEGORIES.has(category)) continue;
    if (typeof text !== "string" || !text.trim()) continue;
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) continue;
    if (!evidenceIds.every((i) => typeof i === "string" && ids.has(i))) continue;
    if (!numbers(text).every((n) => allowed.has(n))) continue;
    const as = Array.isArray(assumptions) ? assumptions.filter((a): a is string => typeof a === "string") : [];
    out.push({ category: category as InsightDTO["category"], text: text.trim(), evidenceIds: evidenceIds as string[], assumptions: as });
    if (out.length === 3) break;
  }
  return out;
}

export function buildPrompt(evidence: EvidenceItem[], lang: Lang) {
  const region = evidence.find((x) => x.id === "region")?.value ?? "";
  const system = [
    "You write short financial insights for a small seller using a PayPal sandbox demo.",
    "Only rephrase the numbers given in the evidence. Never invent, compute or round any number.",
    "Label estimates (source ec_estimate) as estimates; keep them separate from sandbox_observed values.",
    "Never promise or imply avoiding taxes or ISD, fraud prevention, cards, cashback, miles or partnerships.",
    "Return 2 to 3 items, each at most 40 words.",
    'Reply ONLY with JSON: {"insights":[{"category":"progress|fees|withdrawal|next_step","text":"...","evidenceIds":["id"],"assumptions":["..."]}]}.',
    "evidenceIds must be ids from the evidence. Write money as in the evidence values, e.g. $188.90.",
    `Write the text in ${lang === "es" ? "Spanish (Ecuador)" : "English"}.`,
  ].join("\n");
  const user = JSON.stringify({
    region,
    language: lang,
    evidence: evidence.map(({ id, label, value, source }) => ({ id, label, value, source })),
  });
  return { system, user };
}

const sigOf = (evidence: EvidenceItem[], lang: Lang) =>
  createHash("sha256").update(JSON.stringify([lang, evidence])).digest("hex");

export async function generate(d: DashboardDTO, lang: Lang, deps: InsightDeps = {}): Promise<InsightsDTO> {
  const evidence = buildEvidence(d);
  if (d.sales.count === 0) return { aiStatus: "no_data", insights: [], evidence, cached: false };
  const sig = sigOf(evidence, lang);
  const hit = deps.cache?.get(sig);
  if (hit) {
    try {
      const cached = validate({ insights: JSON.parse(hit) }, evidence);
      if (cached.length) return { aiStatus: "ok", insights: cached, evidence, cached: true };
    } catch {}
  }
  if (!deps.llm) return { aiStatus: "unavailable", insights: [], evidence, cached: false };
  try {
    const ins = validate(JSON.parse(await deps.llm(buildPrompt(evidence, lang))), evidence);
    if (!ins.length) return { aiStatus: "unavailable", insights: [], evidence, cached: false };
    deps.cache?.put(sig, JSON.stringify(ins));
    return { aiStatus: "ok", insights: ins, evidence, cached: false };
  } catch {
    return { aiStatus: "unavailable", insights: [], evidence, cached: false };
  }
}

function realLlm(): InsightDeps["llm"] {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = process.env;
  if (!LLM_BASE_URL || !LLM_API_KEY || !LLM_MODEL) return undefined;
  return async ({ system, user }) => {
    const res = await fetch(`${LLM_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  };
}

export async function insights(sid: string, lang: Lang): Promise<InsightsDTO> {
  const { dashboard } = await import("./service.ts");
  const { store } = await import("./db.ts");
  const s = store();
  return generate(dashboard(sid), lang, { llm: realLlm(), cache: { get: (k) => s.cacheGet(k), put: (k, v) => s.cachePut(k, v) } });
}
