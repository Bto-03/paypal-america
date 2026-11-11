import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/server/db.ts";
import { PayPalError, sessionTag, setPayPalForTests, type PPOrder, type PayPalClient } from "../src/server/paypal.ts";
import { cancelOrder, captureOrder, createOrder, dashboard, getOrder, setStoreForTests } from "../src/server/service.ts";

type Opt = { outcome: "completed" | "pending"; amount?: string; tag?: string; payee?: string };
let n = 0;
const orders = new Map<string, { pp: PPOrder; opt: Opt; approved: boolean; sent: { amountCents: number } }>();
let captureCalls = 0;

const fake: PayPalClient = {
  async createOrder(a) {
    const id = `FAKE-${++n}`;
    const opt = next ?? { outcome: "completed" };
    next = null;
    orders.set(id, {
      opt,
      approved: true,
      sent: { amountCents: a.amountCents },
      pp: {
        id,
        status: "APPROVED",
        purchase_units: [{ custom_id: opt.tag ?? a.sessionTag, amount: { currency_code: "USD", value: "0" }, payee: { email_address: opt.payee ?? "shop@example.com" } }],
      },
    });
    return { id, approvalUrl: `http://x/approve/${id}` };
  },
  async capture(id) {
    captureCalls++;
    const o = orders.get(id)!;
    if (o.pp.status === "COMPLETED") throw new PayPalError("dup", 422, "ORDER_ALREADY_CAPTURED");
    if (!o.approved) throw new PayPalError("na", 422, "ORDER_NOT_APPROVED");
    const value = o.opt.amount ?? (o.sent.amountCents / 100).toFixed(2);
    const pu = o.pp.purchase_units![0];
    pu.amount = { currency_code: "USD", value };
    o.pp.status = "COMPLETED";
    pu.payments = {
      captures: [{
        id: `CAP-${id}`,
        status: o.opt.outcome === "pending" ? "PENDING" : "COMPLETED",
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
let next: Opt | null = null;

let store: Store;
beforeEach(() => {
  store = new Store(":memory:");
  setStoreForTests(store);
  setPayPalForTests(fake);
  captureCalls = 0;
  delete process.env.PAYPAL_PAYEE_EMAIL;
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("$200 sale completes: goal 63%, net 18890, one mango", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  assert.equal(o.amountCents, 20000);
  const c = await captureOrder(A, o.id);
  assert.equal(c.status, "completed");
  const d = dashboard(A);
  assert.equal(d.goal.percent, 63);
  assert.equal(d.sales.estimateEc.netCents, 18890);
  assert.equal(d.sales.withdrawal.netCents, 17890);
  assert.equal(d.sales.observed?.netCents, 19201);
  assert.equal(d.stickers.length, 1);
});

test("double capture: one ledger row, one mango", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, o.id);
  await captureOrder(A, o.id);
  assert.equal(captureCalls, 1);
  const d = dashboard(A);
  assert.equal(d.sales.count, 1);
  assert.equal(d.stickers.length, 1);
});

test("already captured at PayPal reconciles via GET", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  await fake.capture(o.id, "x"); // captured behind our back
  assert.equal((await captureOrder(A, o.id)).status, "completed");
  assert.equal(dashboard(A).sales.count, 1);
});

for (const [name, opt] of [
  ["amount mismatch", { outcome: "completed", amount: "1.00" }],
  ["session mismatch", { outcome: "completed", tag: sessionTag(B) }],
  ["payee mismatch", { outcome: "completed", payee: "evil@example.com" }],
] as [string, Opt][]) {
  test(`${name} -> failed, not counted`, async () => {
    process.env.PAYPAL_PAYEE_EMAIL = "shop@example.com";
    next = opt;
    const o = await createOrder(A, { purpose: "sale" });
    await assert.rejects(captureOrder(A, o.id), { code: "verification_failed" });
    assert.equal((await getOrder(A, o.id)).status, "failed");
    const d = dashboard(A);
    assert.equal(d.sales.count, 0);
    assert.equal(d.goal.progressCents, 0);
    assert.equal(d.stickers.length, 0);
  });
}

test("pending capture: no mango, GET re-verify completes it", async () => {
  next = { outcome: "pending" };
  const o = await createOrder(A, { purpose: "sale" });
  assert.equal((await captureOrder(A, o.id)).status, "pending");
  assert.equal(dashboard(A).stickers.length, 0);
  assert.equal(dashboard(A).sales.count, 0);
  orders.get(o.id)!.pp.purchase_units![0].payments!.captures![0].status = "COMPLETED";
  assert.equal((await getOrder(A, o.id)).status, "completed");
  const d = dashboard(A);
  assert.equal(d.sales.count, 1);
  assert.equal(d.stickers.length, 1);
});

test("donation: not in goal, no mango", async () => {
  const o = await createOrder(A, { purpose: "donation_demo", causeId: "demo-sierra-school" });
  assert.equal(o.amountCents, 100);
  await captureOrder(A, o.id);
  const d = dashboard(A);
  assert.deepEqual(d.donations, { count: 1, totalCents: 100 });
  assert.equal(d.goal.progressCents, 0);
  assert.equal(d.sales.count, 0);
  assert.equal(d.stickers.length, 0);
  await assert.rejects(createOrder(A, { purpose: "donation_demo", causeId: "nope" }), { code: "bad_request" });
});

test("foreign session sees 404", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  for (const f of [() => getOrder(B, o.id), () => captureOrder(B, o.id), async () => cancelOrder(B, o.id)]) {
    await assert.rejects(f(), { code: "not_found", status: 404 });
  }
  assert.equal(dashboard(B).lastOrder, null);
});

test("client-sent amount/payee ignored", async () => {
  const o = await createOrder(A, { purpose: "sale", amountCents: 1, amount: "1.00", payee: "x@y.z" });
  assert.equal(o.amountCents, 20000);
  assert.equal(orders.get(o.id)!.sent.amountCents, 20000);
});

test("cancel only from created/approved", async () => {
  const o = await createOrder(A, { purpose: "sale" });
  assert.equal(cancelOrder(A, o.id).status, "cancelled");
  await assert.rejects(captureOrder(A, o.id), { code: "bad_request" });
  const p = await createOrder(A, { purpose: "sale" });
  await captureOrder(A, p.id);
  assert.throws(() => cancelOrder(A, p.id), { code: "bad_request" });
});
