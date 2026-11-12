import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAUSES, REGIONS, causesFor, isStickerId } from "../src/server/catalog.ts";
import {
  DEFAULT_GOAL_CENTS,
  EC_RULE,
  SALE_CENTS,
  WITHDRAW_RULE,
  ecEstimate,
  goalPercent,
  withdrawal,
} from "../src/server/money.ts";

const DIR = fileURLToPath(new URL("../fixtures/", import.meta.url));
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();

const EXPECTED_FILES = [
  "causes.galapagos.json",
  "dashboard.empty.json",
  "dashboard.success.json",
  "donation_demo.json",
  "error.verification_failed.json",
  "insights.ai_unavailable.json",
  "insights.ok.json",
  "order.cancelled.json",
  "order.duplicate.json",
  "order.pending.json",
  "receipt.sale.json",
];

const ORDER_STATUS = ["created", "approved", "pending", "completed", "cancelled", "failed"];
const PURPOSE = ["sale", "donation_demo"];
const AI_STATUS = ["ok", "unavailable", "no_data"];
const REGION_IDS = REGIONS.map((r) => r.id);
const INSIGHT_CATEGORY = ["progress", "fees", "withdrawal", "next_step"];
const EVIDENCE_SOURCE = ["sandbox_observed", "ec_estimate", "computed", "declared"];
const ERROR_CODES = [
  "bad_request",
  "not_found",
  "forbidden",
  "paypal_error",
  "verification_failed",
  "live_mode_refused",
  "internal",
];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary fixture JSON
type Json = any;
const load = (name: string): Json => JSON.parse(readFileSync(join(DIR, name), "utf8"));
const fixtures = Object.fromEntries(FILES.map((f) => [f, load(f)])) as Record<string, Json>;

function keys(o: object, expected: string[]) {
  assert.deepEqual(Object.keys(o).sort(), [...expected].sort());
}

// Every *Cents field and every percent must be an integer (or null where the DTO allows it).
function assertIntegerCents(node: Json, path = "$") {
  if (Array.isArray(node)) return node.forEach((v, i) => assertIntegerCents(v, `${path}[${i}]`));
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      const p = `${path}.${k}`;
      if ((k.endsWith("Cents") || k === "percent") && v !== null) {
        assert.ok(Number.isInteger(v), `${p} must be an integer, got ${JSON.stringify(v)}`);
      } else {
        assertIntegerCents(v, p);
      }
    }
  }
}

function assertEnvelope(f: Json, name: string) {
  assert.ok(f && typeof f === "object", `${name}: not an object`);
  assert.deepEqual(Object.keys(f.meta ?? {}).sort(), ["generatedAt", "mode"], `${name}: meta keys`);
  assert.equal(f.meta.mode, "mock", `${name}: mode`);
  assert.match(f.meta.generatedAt, ISO, `${name}: generatedAt`);
  if ("error" in f) {
    keys(f, ["error", "meta"]);
    keys(f.error, ["code", "message"]);
    assert.ok(ERROR_CODES.includes(f.error.code), `${name}: error code ${f.error.code}`);
    assert.equal(typeof f.error.message, "string");
  } else {
    keys(f, ["data", "meta"]);
    assert.ok(f.data !== undefined, `${name}: data missing`);
  }
  assertIntegerCents(f);
}

function assertOrder(o: Json) {
  keys(o, ["id", "purpose", "status", "amountCents", "currency", "causeId", "captureId", "approvalUrl", "createdAt", "updatedAt"]);
  assert.ok(PURPOSE.includes(o.purpose), `purpose ${o.purpose}`);
  assert.ok(ORDER_STATUS.includes(o.status), `status ${o.status}`);
  assert.equal(o.currency, "USD");
  assert.match(o.createdAt, ISO);
  assert.match(o.updatedAt, ISO);
}

function assertMoneyLine(m: Json, source: string) {
  assert.ok(Number.isInteger(m.feeCents) && Number.isInteger(m.netCents), "money line must be integer cents");
  assert.equal(m.source, source);
  assert.equal(typeof m.rule, "string");
}

// Numbers quoted in insight text must appear in the evidence values (mirrors the server validator).
function numbersIn(s: string): string[] {
  return (s.match(/\d[\d,]*(\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
}

test("fixture set is exactly the expected list", () => {
  assert.deepEqual(FILES, EXPECTED_FILES);
});

test("every fixture has a valid envelope and integer cents", () => {
  for (const f of FILES) assertEnvelope(fixtures[f], f);
});

test("dashboard.success: shape, enums, and numbers equal money.ts", () => {
  const d = fixtures["dashboard.success.json"].data;
  keys(d, ["profile", "goal", "sales", "lastOrder", "recent", "stickers", "donations", "places"]);
  keys(d.profile, ["alias", "regionId", "avatar", "receiptNote"]);
  assert.ok(isStickerId(d.profile.avatar));
  assert.ok(d.profile.receiptNote.length <= 80);
  assert.deepEqual(d.recent, [d.lastOrder]);
  assert.ok(REGION_IDS.includes(d.profile.regionId));
  assert.deepEqual(d.places, REGIONS);

  // Goal: estimated net of completed sales.
  keys(d.goal, ["targetCents", "progressCents", "percent", "basis"]);
  assert.equal(d.goal.basis, "ec_estimate_net");
  assert.equal(d.goal.targetCents, DEFAULT_GOAL_CENTS);
  const sales = Array(d.sales.count).fill(SALE_CENTS);
  const est = ecEstimate(sales);
  assert.equal(d.goal.progressCents, est.netCents);
  assert.equal(d.goal.percent, goalPercent(est.netCents, d.goal.targetCents));
  assert.equal(d.goal.percent, 63);

  // Sales summary.
  keys(d.sales, ["count", "grossCents", "observed", "estimateEc", "withdrawal"]);
  assert.equal(d.sales.count, 1);
  assert.equal(d.sales.grossCents, sales.reduce((a, b) => a + b, 0));
  assert.deepEqual(
    { feeCents: d.sales.estimateEc.feeCents, netCents: d.sales.estimateEc.netCents },
    est,
  );
  assertMoneyLine(d.sales.estimateEc, "ec_estimate");
  assert.equal(d.sales.estimateEc.rule, EC_RULE);
  const wd = withdrawal(est.netCents);
  assert.deepEqual(
    { feeCents: d.sales.withdrawal.feeCents, netCents: d.sales.withdrawal.netCents },
    wd,
  );
  assertMoneyLine(d.sales.withdrawal, "ec_estimate");
  assert.equal(d.sales.withdrawal.rule, WITHDRAW_RULE);

  // Observed sandbox fee/net is separate and must reconcile with gross.
  assert.equal(d.sales.observed.source, "sandbox_observed");
  assert.equal(d.sales.observed.feeCents, 747);
  assert.equal(d.sales.observed.netCents, 19253);
  assert.equal(d.sales.observed.feeCents + d.sales.observed.netCents, d.sales.grossCents);

  // Last order is the completed sale.
  assertOrder(d.lastOrder);
  assert.equal(d.lastOrder.purpose, "sale");
  assert.equal(d.lastOrder.status, "completed");
  assert.equal(d.lastOrder.amountCents, SALE_CENTS);
  assert.notEqual(d.lastOrder.captureId, null);

  // Stickers: one golden mango, declared not verified.
  assert.equal(d.stickers.length, 1);
  keys(d.stickers[0], ["id", "kind", "placeId", "placeLabel", "milestone", "origin", "earnedAt"]);
  assert.equal(d.stickers[0].kind, "golden_mango");
  assert.equal(d.stickers[0].milestone, "first_sale");
  assert.equal(d.stickers[0].origin, "declared_unverified");
  assert.ok(REGION_IDS.includes(d.stickers[0].placeId));
  assert.match(d.stickers[0].earnedAt, ISO);

  // Donations never count toward the goal.
  keys(d.donations, ["count", "totalCents"]);
  assert.deepEqual(d.donations, { count: 0, totalCents: 0 });
});

test("dashboard.empty: zero everything, nulls where DTO allows", () => {
  const d = fixtures["dashboard.empty.json"].data;
  assert.equal(d.sales.count, 0);
  assert.equal(d.sales.grossCents, 0);
  assert.equal(d.sales.observed, null);
  assert.deepEqual(
    { feeCents: d.sales.estimateEc.feeCents, netCents: d.sales.estimateEc.netCents },
    ecEstimate([]),
  );
  assert.deepEqual(
    { feeCents: d.sales.withdrawal.feeCents, netCents: d.sales.withdrawal.netCents },
    withdrawal(0),
  );
  assert.equal(d.goal.progressCents, 0);
  assert.equal(d.goal.percent, 0);
  assert.equal(d.lastOrder, null);
  assert.deepEqual(d.recent, []);
  assert.equal(d.profile.receiptNote, "");
  assert.ok(isStickerId(d.profile.avatar));
  assert.deepEqual(d.stickers, []);
  assert.deepEqual(d.donations, { count: 0, totalCents: 0 });
  assert.ok(REGION_IDS.includes(d.profile.regionId));
});

test("order fixtures: shape and status enums", () => {
  for (const name of ["order.pending.json", "order.cancelled.json", "order.duplicate.json", "donation_demo.json"]) {
    assertOrder(fixtures[name].data);
  }
  assert.equal(fixtures["order.pending.json"].data.status, "pending");
  assert.equal(fixtures["order.cancelled.json"].data.status, "cancelled");
  assert.equal(fixtures["order.cancelled.json"].data.captureId, null);
});

test("order.duplicate is the same completed order as the dashboard lastOrder", () => {
  assert.deepEqual(
    fixtures["order.duplicate.json"].data,
    fixtures["dashboard.success.json"].data.lastOrder,
  );
  assert.equal(fixtures["order.duplicate.json"].data.status, "completed");
});

test("donation_demo: $1 demo donation to a known demo cause", () => {
  const o = fixtures["donation_demo.json"].data;
  assert.equal(o.purpose, "donation_demo");
  assert.equal(o.amountCents, 100);
  assert.ok(CAUSES.some((c) => c.id === o.causeId), `unknown causeId ${o.causeId}`);
  assert.equal(o.causeId, "demo-galapagos-reef");
});

test("causes.galapagos equals causesFor('galapagos')", () => {
  const data = fixtures["causes.galapagos.json"].data;
  assert.deepEqual(data, causesFor("galapagos"));
  for (const c of data) {
    keys(c, ["id", "name", "regionId", "description", "demo", "amountCents"]);
    assert.equal(c.demo, true);
    assert.equal(c.amountCents, 100);
    assert.ok(REGION_IDS.includes(c.regionId));
    assert.match(c.name, /^DEMO · /);
  }
});

test("insights fixtures: enums, evidence references, and numbers match evidence", () => {
  for (const name of ["insights.ok.json", "insights.ai_unavailable.json"]) {
    const d = fixtures[name].data;
    keys(d, ["aiStatus", "insights", "evidence", "cached"]);
    assert.ok(AI_STATUS.includes(d.aiStatus), `aiStatus ${d.aiStatus}`);
    assert.equal(typeof d.cached, "boolean");
    assert.ok(d.evidence.length > 0, "evidence still returned");

    const ids = new Set<string>();
    for (const e of d.evidence) {
      keys(e, ["id", "label", "valueCents", "value", "source"]);
      assert.ok(!ids.has(e.id), `duplicate evidence id ${e.id}`);
      ids.add(e.id);
      assert.ok(EVIDENCE_SOURCE.includes(e.source), `evidence source ${e.source}`);
      assert.equal(typeof e.value, "string");
    }
    const evidenceNumbers = new Set(
      d.evidence.flatMap((e: Json) => numbersIn(String(e.value))),
    );

    assert.ok(d.insights.length >= 0 && d.insights.length <= 3);
    for (const ins of d.insights) {
      keys(ins, ["category", "text", "evidenceIds", "assumptions"]);
      assert.ok(INSIGHT_CATEGORY.includes(ins.category), `category ${ins.category}`);
      assert.ok(ins.evidenceIds.length > 0);
      for (const id of ins.evidenceIds) assert.ok(ids.has(id), `unknown evidence id ${id}`);
      for (const n of numbersIn(ins.text)) {
        assert.ok(evidenceNumbers.has(n), `number ${n} in "${ins.text}" is not in evidence`);
      }
    }
  }

  const ok = fixtures["insights.ok.json"].data;
  assert.equal(ok.aiStatus, "ok");
  assert.equal(ok.cached, false);
  assert.ok(ok.insights.length >= 2 && ok.insights.length <= 3);

  const unavailable = fixtures["insights.ai_unavailable.json"].data;
  assert.equal(unavailable.aiStatus, "unavailable");
  assert.deepEqual(unavailable.insights, []);
});

test("insights.ok evidence matches money.ts", () => {
  const ev = Object.fromEntries(fixtures["insights.ok.json"].data.evidence.map((e: Json) => [e.id, e]));
  const est = ecEstimate([SALE_CENTS]);
  const wd = withdrawal(est.netCents);
  assert.equal(ev.gross.valueCents, SALE_CENTS);
  assert.equal(ev.ec_fee.valueCents, est.feeCents);
  assert.equal(ev.net_ec.valueCents, est.netCents);
  assert.equal(ev.goal_target.valueCents, DEFAULT_GOAL_CENTS);
  assert.equal(ev.goal_percent.value, `${goalPercent(est.netCents, DEFAULT_GOAL_CENTS)}%`);
  assert.equal(ev.withdraw_fee.valueCents, wd.feeCents);
  assert.equal(ev.withdraw_net.valueCents, wd.netCents);
  assert.equal(ev.observed_fee.source, "sandbox_observed");
  assert.equal(ev.observed_net.source, "sandbox_observed");
});

test("error.verification_failed: error envelope with a valid code", () => {
  const f = fixtures["error.verification_failed.json"];
  assert.equal(f.error.code, "verification_failed");
  assert.equal("data" in f, false);
});

test("receipt.sale: shape, numbers equal money.ts, events chronological", () => {
  const r = fixtures["receipt.sale.json"].data;
  keys(r, ["receiptNo", "order", "seller", "lines", "events", "checks", "sticker", "cause"]);
  assert.match(r.receiptNo, /^PA-\d{4}-\d{4}$/);
  assertOrder(r.order);
  keys(r.seller, ["alias", "regionId", "avatar", "receiptNote", "regionLabel"]);
  keys(r.lines, ["grossCents", "feeObservedCents", "netObservedCents", "feeEcCents", "netEcCents"]);
  const ec = ecEstimate([r.lines.grossCents]);
  assert.equal(r.lines.feeEcCents, ec.feeCents);
  assert.equal(r.lines.netEcCents, ec.netCents);
  assert.equal(r.lines.grossCents, r.order.amountCents);
  const times = r.events.map((e: Json) => e.at);
  assert.deepEqual([...times].sort(), times);
  for (const e of r.events) {
    keys(e, ["type", "at", "detail"]);
    assert.match(e.at, ISO);
  }
  assert.deepEqual(r.checks.map((c: Json) => c.name), ["status", "amount", "currency", "payee", "session"]);
  assert.ok(r.checks.every((c: Json) => c.ok === true));
  assert.equal(r.sticker.kind, "golden_mango");
  assert.equal(r.cause, null);
});
