import { test } from "node:test";
import assert from "node:assert/strict";
import type { DashboardDTO } from "../src/server/contract.ts";
import { buildEvidence, generate, validate, buildPrompt } from "../src/server/insights.ts";

function dash(count: number): DashboardDTO {
  const sold = count > 0;
  return {
    profile: { alias: "Maria Zeta", regionId: "galapagos" },
    goal: { targetCents: 30000, progressCents: sold ? 18890 : 0, percent: sold ? 63 : 0, basis: "ec_estimate_net" },
    sales: {
      count,
      grossCents: sold ? 20000 : 0,
      observed: sold ? { feeCents: 1000, netCents: 19000, source: "sandbox_observed" } : null,
      estimateEc: { feeCents: sold ? 1110 : 0, netCents: sold ? 18890 : 0, rule: "r", source: "ec_estimate" },
      withdrawal: { feeCents: sold ? 1000 : 0, netCents: sold ? 17890 : 0, rule: "r", source: "ec_estimate" },
    },
    lastOrder: null,
    stickers: [],
    donations: { count: 0, totalCents: 0 },
    places: [{ id: "galapagos", label: "Galápagos" }],
  };
}
const good = {
  insights: [
    { category: "progress", text: "Estimated net $188.90 is 63% of your $300.00 goal.", evidenceIds: ["goal_progress", "goal_percent"], assumptions: ["Ecuador estimate"] },
    { category: "withdrawal", text: "Estimated withdrawal fee is $10.00, leaving $178.90.", evidenceIds: ["withdraw_fee", "withdraw_net"], assumptions: [] },
  ],
};
const ev = buildEvidence(dash(1));

test("evidence values", () => {
  const m = Object.fromEntries(ev.map((e) => [e.id, e.value]));
  assert.equal(m.net_ec, "$188.90");
  assert.equal(m.goal_percent, "63%");
  assert.equal(m.withdraw_fee, "$10.00");
  assert.equal(m.region, "Galápagos");
});

test("valid answer passes", async () => {
  const r = await generate(dash(1), "en", { llm: async () => JSON.stringify(good) });
  assert.equal(r.aiStatus, "ok");
  assert.equal(r.insights.length, 2);
});

test("invented numbers rejected", () => {
  for (const text of ["You earned $199.00.", "That is 70% of the goal.", "Fee is $11.10 on 3 sales."]) {
    assert.equal(validate({ insights: [{ category: "fees", text, evidenceIds: ["fee_ec"], assumptions: [] }] }, ev).length, 0, text);
  }
});

test("unknown evidence id or category rejected, valid kept", () => {
  const bad = [
    { category: "fees", text: "Fee is $11.10.", evidenceIds: ["nope"], assumptions: [] },
    { category: "magic", text: "Fee is $11.10.", evidenceIds: ["fee_ec"], assumptions: [] },
    good.insights[0],
  ];
  assert.equal(validate({ insights: bad }, ev).length, 1);
});

test("llm failure or garbage -> unavailable with evidence", async () => {
  for (const llm of [async () => { throw new Error("boom"); }, async () => "not json", undefined]) {
    const r = await generate(dash(1), "en", { llm });
    assert.equal(r.aiStatus, "unavailable");
    assert.deepEqual(r.insights, []);
    assert.ok(r.evidence.length > 0);
  }
});

test("no completed sales -> no_data, llm not called", async () => {
  let calls = 0;
  const r = await generate(dash(0), "en", { llm: async () => { calls++; return "{}"; } });
  assert.equal(r.aiStatus, "no_data");
  assert.equal(calls, 0);
});

test("cache hit -> cached, llm called once", async () => {
  const m = new Map<string, string>();
  const cache = { get: (k: string) => m.get(k) ?? null, put: (k: string, v: string) => void m.set(k, v) };
  let calls = 0;
  const llm = async () => { calls++; return JSON.stringify(good); };
  const a = await generate(dash(1), "en", { llm, cache });
  const b = await generate(dash(1), "en", { llm, cache });
  assert.equal(a.cached, false);
  assert.equal(b.cached, true);
  assert.equal(b.aiStatus, "ok");
  assert.equal(calls, 1);
  await generate(dash(1), "es", { llm, cache });
  assert.equal(calls, 2);
});

test("prompt has no alias and carries language/region", async () => {
  let seen = "";
  await generate(dash(1), "es", { llm: async (p) => { seen = p.system + p.user; return JSON.stringify(good); } });
  assert.ok(!seen.includes("Maria"));
  assert.ok(seen.includes("Galápagos"));
  assert.ok(seen.includes("Spanish"));
  assert.ok(buildPrompt(ev, "en").system.includes("English"));
});
