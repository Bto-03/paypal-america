import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/server/db.ts";
import { checkCapture, sessionTag, setPayPalForTests, verifyCapture, type PPOrder, type PayPalClient } from "../src/server/paypal.ts";
import { captureOrder, cancelOrder, createOrder, dashboard, receipt, setStoreForTests, updateProfile } from "../src/server/service.ts";

let n = 0;
let amountOverride: string | null = null;
const orders = new Map<string, { pp: PPOrder; cents: number }>();

const fake: PayPalClient = {
  async createOrder(a) {
    const id = `R-${++n}`;
    orders.set(id, {
      cents: a.amountCents,
      pp: { id, status: "APPROVED", purchase_units: [{ custom_id: a.sessionTag, payee: { email_address: "shop@example.com" } }] },
    });
    return { id, approvalUrl: `http://x/approve/${id}` };
  },
  async capture(id) {
    const o = orders.get(id)!;
    const value = amountOverride ?? (o.cents / 100).toFixed(2);
    o.pp.status = "COMPLETED";
    o.pp.purchase_units![0].payments = {
      captures: [{
        id: `CAP-${id}`,
        status: "COMPLETED",
        amount: { currency_code: "USD", value },
        seller_receivable_breakdown: { paypal_fee: { currency_code: "USD", value: "7.99" }, net_amount: { currency_code: "USD", value: "192.01" } },
      }],
    };
    return structuredClone(o.pp);
  },
  async get(id) {
    return structuredClone(orders.get(id)!.pp);
  },
};

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  setStoreForTests(new Store(":memory:"));
  setPayPalForTests(fake);
  amountOverride = null;
  delete process.env.PAYPAL_PAYEE_EMAIL;
});

test("receipt numbers are per-session sequences; sale lines and events", async () => {
  const s1 = await createOrder(A, { purpose: "sale" });
  const other = await createOrder(B, { purpose: "sale" });
  const d1 = await createOrder(A, { purpose: "donation_demo", causeId: "demo-galapagos-reef" });
  await captureOrder(A, s1.id);
  await captureOrder(A, s1.id); // double capture: no duplicate events

  const r = receipt(A, s1.id);
  const year = s1.createdAt.slice(0, 4);
  assert.equal(r.receiptNo, `PA-${year}-0001`);
  assert.equal(receipt(A, d1.id).receiptNo, `PA-${year}-0002`);
  assert.equal(receipt(B, other.id).receiptNo, `PA-${year}-0001`);
  assert.deepEqual(r.lines, { grossCents: 20000, feeObservedCents: 799, netObservedCents: 19201, feeEcCents: 1110, netEcCents: 18890 });
  assert.deepEqual(r.events.map((e) => e.type), ["created", "approved", "captured", "verified", "sticker_awarded"]);
  assert.equal(r.events[2].detail, `CAP-${s1.id}`);
  assert.equal(r.events[4].detail, "golden_mango");
  assert.equal(r.sticker?.kind, "golden_mango");
  assert.equal(r.cause, null);
  assert.equal(r.seller.regionLabel, "Galápagos");

  await captureOrder(A, d1.id);
  const rd = receipt(A, d1.id);
  assert.deepEqual(rd.lines, { grossCents: 100, feeObservedCents: null, netObservedCents: null, feeEcCents: null, netEcCents: null });
  assert.deepEqual(rd.cause, { id: "demo-galapagos-reef", name: "DEMO · Reef cleanup fund" });
  assert.equal(rd.sticker, null);
  assert.deepEqual(rd.events.map((e) => e.type), ["created", "approved", "captured", "verified"]);
});

test("created and cancelled orders return receipts with their events", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  assert.deepEqual(receipt(A, o.id).checks, []);
  cancelOrder(A, o.id);
  cancelOrder(A, o.id);
  const r = receipt(A, o.id);
  assert.equal(r.order.status, "cancelled");
  assert.deepEqual(r.events.map((e) => e.type), ["created", "cancelled"]);
});

test("checks persisted: all ok, and amount mismatch shows amount false", async () => {
  const ok = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, ok.id);
  const r = receipt(A, ok.id);
  assert.deepEqual(r.checks.map((c) => c.name), ["status", "amount", "currency", "payee", "session"]);
  assert.ok(r.checks.every((c) => c.ok));

  amountOverride = "1.00";
  const bad = await createOrder(A, { purpose: "sale" });
  await assert.rejects(captureOrder(A, bad.id), { code: "verification_failed" });
  const rb = receipt(A, bad.id);
  assert.equal(rb.order.status, "failed");
  assert.equal(rb.checks.find((c) => c.name === "amount")?.ok, false);
  assert.equal(rb.checks.filter((c) => !c.ok).length, 1);
  assert.deepEqual(rb.events.map((e) => e.type), ["created", "approved", "verification_failed"]);
  assert.equal(rb.events[2].detail, "amount");
});

test("checkCapture agrees with verifyCapture", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, o.id);
  const pp = await fake.get(o.id);
  for (const exp of [
    { amountCents: 20000, sessionTag: sessionTag(A) },
    { amountCents: 100, sessionTag: sessionTag(A) },
    { amountCents: 20000, sessionTag: sessionTag(B) },
    { amountCents: 20000, sessionTag: sessionTag(A), payeeEmail: "evil@example.com" },
  ]) {
    assert.equal(checkCapture(pp, exp).every((c) => c.ok), verifyCapture(pp, exp).ok);
  }
  assert.ok(checkCapture({ id: "x", status: "CREATED" }, { amountCents: 1, sessionTag: "t" }).some((c) => !c.ok));
});

test("condor awarded once when two $200 sales pass a $300 goal", async () => {
  const a = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, a.id);
  assert.equal(dashboard(A).stickers.length, 1); // 63%: mango only
  const b = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, b.id);
  const c = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, c.id);
  const d = dashboard(A);
  assert.deepEqual(d.stickers.map((s) => s.kind), ["golden_mango", "condor"]);
  assert.equal(d.stickers[1].milestone, "goal_reached");
  const rb = receipt(A, b.id);
  assert.equal(rb.sticker?.kind, "condor");
  assert.deepEqual(rb.events.map((e) => e.type).slice(-2), ["verified", "sticker_awarded"]);
  assert.equal(receipt(A, c.id).sticker, null);
  assert.equal(d.recent.length, 3);
  assert.equal(d.recent[0].id, c.id); // newest first
});

test("avatar: default per region, validation, locked milestones", async () => {
  assert.equal(dashboard(A).profile.avatar, "tortoise");
  assert.equal(updateProfile(A, { regionId: "sierra" }).profile.avatar, "llama");
  assert.equal(updateProfile(A, { avatar: "crab" }).profile.avatar, "crab");
  assert.equal(updateProfile(A, { regionId: "costa" }).profile.avatar, "crab"); // explicit pick kept
  for (const bad of ["nope", 5, "golden_mango", "condor"]) {
    assert.throws(() => updateProfile(A, { avatar: bad }), { code: "bad_request" });
  }
  const o = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, o.id);
  assert.equal(updateProfile(A, { avatar: "golden_mango" }).profile.avatar, "golden_mango");
  assert.throws(() => updateProfile(A, { avatar: "condor" }), { code: "bad_request" });
});

test("receiptNote: trimmed, control chars stripped, max 80", () => {
  assert.equal(updateProfile(A, { receiptNote: "  Gracias!\u0007\n " }).profile.receiptNote, "Gracias!");
  assert.equal(updateProfile(A, { receiptNote: "x".repeat(80) }).profile.receiptNote.length, 80);
  assert.throws(() => updateProfile(A, { receiptNote: "x".repeat(81) }), { code: "bad_request" });
  assert.throws(() => updateProfile(A, { receiptNote: 7 }), { code: "bad_request" });
  assert.equal(updateProfile(A, { receiptNote: "" }).profile.receiptNote, "");
});

test("foreign session gets 404 on receipt", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  assert.throws(() => receipt(B, o.id), { code: "not_found", status: 404 });
  assert.throws(() => receipt(A, "missing"), { code: "not_found" });
});

test("migration adds columns and keeps existing rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "pa-mig-"));
  const path = join(dir, "old.db");
  const old = new DatabaseSync(path);
  old.exec(
    "CREATE TABLE profiles (sid TEXT PRIMARY KEY, alias TEXT NOT NULL, region_id TEXT NOT NULL, goal_cents INTEGER NOT NULL, created_at TEXT NOT NULL);" +
      "INSERT INTO profiles VALUES ('s','Old','sierra',500,'2026-01-01T00:00:00Z');" +
      "CREATE TABLE orders (id TEXT PRIMARY KEY, sid TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, amount_cents INTEGER NOT NULL, cause_id TEXT, capture_id TEXT UNIQUE, approval_url TEXT, fee_observed_cents INTEGER, net_observed_cents INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);" +
      "INSERT INTO orders VALUES ('o','s','sale','completed',20000,NULL,'c',NULL,NULL,NULL,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');",
  );
  old.close();
  const s = new Store(path);
  new Store(path); // second open is a no-op
  assert.deepEqual({ ...s.profile("s") }, { sid: "s", alias: "Old", regionId: "sierra", goalCents: 500, avatar: "tortoise", receiptNote: "" });
  assert.equal(s.order("o")?.status, "completed");
  assert.deepEqual(s.order("o")?.checks, []);
  s.db.close();
  rmSync(dir, { recursive: true });
});
