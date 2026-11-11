import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mode, sessionTag, verifyCapture, type Expected, type PPOrder } from "../src/server/paypal.ts";

const SID = "11111111-2222-3333-4444-555555555555";
const OTHER_SID = "99999999-8888-7777-6666-555555555555";
const TAG = sessionTag(SID);
const PAYEE = "business-ec@example.test";

const EXP: Expected = { amountCents: 20000, sessionTag: TAG, payeeEmail: PAYEE };

// A PayPal order as returned by GET /v2/checkout/orders/:id for a completed $200 sale.
function completedOrder(): PPOrder {
  return {
    id: "5O190127TN364715T",
    status: "COMPLETED",
    purchase_units: [
      {
        custom_id: TAG,
        amount: { currency_code: "USD", value: "200.00" },
        payee: { email_address: PAYEE, merchant_id: "MERCH123" },
        payments: {
          captures: [
            {
              id: "CAP-1",
              status: "COMPLETED",
              amount: { currency_code: "USD", value: "200.00" },
              seller_receivable_breakdown: {
                gross_amount: { currency_code: "USD", value: "200.00" },
                paypal_fee: { currency_code: "USD", value: "7.47" },
                net_amount: { currency_code: "USD", value: "192.53" },
              },
            },
          ],
        },
      },
    ],
  };
}

function withCapture(mutate: (c: NonNullable<NonNullable<NonNullable<PPOrder["purchase_units"]>[0]["payments"]>["captures"]>[0]) => void): PPOrder {
  const o = completedOrder();
  mutate(o.purchase_units![0].payments!.captures![0]);
  return o;
}

test("COMPLETED capture verifies with fee and net from seller_receivable_breakdown", () => {
  assert.deepEqual(verifyCapture(completedOrder(), EXP), {
    ok: true,
    status: "completed",
    captureId: "CAP-1",
    feeObservedCents: 747,
    netObservedCents: 19253,
  });
});

test("COMPLETED capture without a breakdown still verifies, fee and net null", () => {
  const o = withCapture((c) => delete c.seller_receivable_breakdown);
  assert.deepEqual(verifyCapture(o, EXP), {
    ok: true,
    status: "completed",
    captureId: "CAP-1",
    feeObservedCents: null,
    netObservedCents: null,
  });
});

test("PENDING capture verifies as pending, not completed", () => {
  const o = withCapture((c) => {
    c.status = "PENDING";
    delete c.seller_receivable_breakdown;
  });
  const r = verifyCapture(o, EXP);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.status, "pending");
});

test("wrong captured amount is rejected", () => {
  for (const value of ["199.99", "200.01", "20.00"]) {
    const r = verifyCapture(withCapture((c) => (c.amount.value = value)), EXP);
    assert.equal(r.ok, false, value);
    assert.match(r.ok ? "" : r.reason, /^amount \d+ != 20000$/);
  }
});

test("wrong currency is rejected", () => {
  const r = verifyCapture(withCapture((c) => (c.amount.currency_code = "EUR")), EXP);
  assert.deepEqual(r, { ok: false, reason: "currency EUR" });
});

test("unreadable amount is rejected", () => {
  const r = verifyCapture(withCapture((c) => (c.amount.value = "abc")), EXP);
  assert.deepEqual(r, { ok: false, reason: "unreadable amount" });
});

test("wrong session tag is rejected", () => {
  const o = completedOrder();
  o.purchase_units![0].custom_id = sessionTag(OTHER_SID);
  assert.deepEqual(verifyCapture(o, EXP), { ok: false, reason: "order belongs to another session" });
});

test("wrong payee email is rejected; email match ignores case", () => {
  const o = completedOrder();
  o.purchase_units![0].payee!.email_address = "attacker@example.test";
  assert.deepEqual(verifyCapture(o, EXP), { ok: false, reason: "payee email mismatch" });

  const upper = completedOrder();
  upper.purchase_units![0].payee!.email_address = PAYEE.toUpperCase();
  assert.equal(verifyCapture(upper, EXP).ok, true);
});

test("wrong payee merchant id is rejected when expected", () => {
  const exp: Expected = { ...EXP, payeeEmail: null, payeeMerchantId: "MERCH123" };
  assert.equal(verifyCapture(completedOrder(), exp).ok, true);

  const bad: Expected = { ...EXP, payeeEmail: null, payeeMerchantId: "OTHER" };
  assert.deepEqual(verifyCapture(completedOrder(), bad), { ok: false, reason: "payee merchant mismatch" });
});

test("missing capture is rejected", () => {
  const noPayments = completedOrder();
  delete noPayments.purchase_units![0].payments;
  assert.deepEqual(verifyCapture(noPayments, EXP), { ok: false, reason: "no capture on the order" });

  const emptyCaptures = completedOrder();
  emptyCaptures.purchase_units![0].payments!.captures = [];
  assert.deepEqual(verifyCapture(emptyCaptures, EXP), { ok: false, reason: "no capture on the order" });

  const noUnits: PPOrder = { id: "X", status: "CREATED" };
  assert.deepEqual(verifyCapture(noUnits, EXP), { ok: false, reason: "no capture on the order" });
});

test("DECLINED capture is rejected", () => {
  const r = verifyCapture(withCapture((c) => (c.status = "DECLINED")), EXP);
  assert.deepEqual(r, { ok: false, reason: "capture status DECLINED" });
});

// Known gap (see report): when the order omits payee data, the email check is skipped
// instead of failing closed. This test asserts the intended behaviour and is expected to FAIL today.
test("missing payee data fails closed when a payee email is expected", () => {
  const o = completedOrder();
  delete o.purchase_units![0].payee;
  const r = verifyCapture(o, EXP);
  assert.equal(r.ok, false);
});

test("sessionTag is a stable 32-hex value that does not expose the session id", () => {
  assert.match(TAG, /^[0-9a-f]{32}$/);
  assert.equal(sessionTag(SID), TAG);
  assert.notEqual(sessionTag(OTHER_SID), TAG);
  assert.equal(TAG.includes(SID), false);
});

// ---------- mode() ----------
const ENV_KEYS = ["PAYPAL_ENV", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function setEnv(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const k of ENV_KEYS) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
}

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

test("mode(): PAYPAL_ENV=live throws", () => {
  setEnv({ PAYPAL_ENV: "live", PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret" });
  assert.throws(() => mode(), /live mode is refused/);
  setEnv({ PAYPAL_ENV: "LIVE" });
  assert.throws(() => mode(), /live mode is refused/);
});

test("mode(): no keys -> mock", () => {
  setEnv({});
  assert.equal(mode(), "mock");
  setEnv({ PAYPAL_ENV: "sandbox" });
  assert.equal(mode(), "mock");
});

test("mode(): only one key -> mock", () => {
  setEnv({ PAYPAL_CLIENT_ID: "id" });
  assert.equal(mode(), "mock");
  setEnv({ PAYPAL_CLIENT_SECRET: "secret" });
  assert.equal(mode(), "mock");
});

test("mode(): both keys with sandbox -> sandbox", () => {
  setEnv({ PAYPAL_ENV: "sandbox", PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret" });
  assert.equal(mode(), "sandbox");
});
