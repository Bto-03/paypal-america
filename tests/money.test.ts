import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GOAL_CENTS,
  DONATION_CENTS,
  SALE_CENTS,
  ecEstimate,
  ecFee,
  fmt,
  goalPercent,
  toCents,
  withdrawal,
} from "../src/server/money.ts";

test("fixed amounts", () => {
  assert.equal(SALE_CENTS, 20000);
  assert.equal(DONATION_CENTS, 100);
  assert.equal(DEFAULT_GOAL_CENTS, 30000);
});

test("$200 sale: EC fee $11.10, net $188.90", () => {
  assert.equal(ecFee(20000), 1110);
  assert.deepEqual(ecEstimate([20000]), { feeCents: 1110, netCents: 18890 });
});

test("two sales sum the fixed $0.30 once per sale", () => {
  assert.deepEqual(ecEstimate([20000, 20000]), { feeCents: 2220, netCents: 37780 });
  // One $400 sale pays the fixed fee once: 5.40% of 40000 + 30 = 2190.
  assert.deepEqual(ecEstimate([40000]), { feeCents: 2190, netCents: 37810 });
});

test("ecEstimate of no sales is zero", () => {
  assert.deepEqual(ecEstimate([]), { feeCents: 0, netCents: 0 });
});

test("goalPercent(18890, 30000) = 63", () => {
  assert.equal(goalPercent(18890, 30000), 63);
});

test("goalPercent edge cases", () => {
  assert.equal(goalPercent(0, 30000), 0);
  assert.equal(goalPercent(30000, 30000), 100);
  assert.equal(goalPercent(45000, 30000), 150); // over 100 is allowed
  assert.equal(goalPercent(100, 0), 0); // no division by zero
  assert.equal(goalPercent(100, -5), 0);
});

test("withdrawal of $188.90 net: fee $10 minimum, leaves $178.90", () => {
  // 0.50% of 18890 is 94.45 cents, so the $10 minimum applies.
  assert.deepEqual(withdrawal(18890), { feeCents: 1000, netCents: 17890 });
});

test("withdrawal of a large net uses 0.5%", () => {
  assert.deepEqual(withdrawal(1000000), { feeCents: 5000, netCents: 995000 });
  assert.deepEqual(withdrawal(220000), { feeCents: 1100, netCents: 218900 });
});

test("withdrawal edge cases", () => {
  assert.deepEqual(withdrawal(0), { feeCents: 0, netCents: 0 });
  assert.deepEqual(withdrawal(-500), { feeCents: 0, netCents: 0 });
  // Net below the minimum fee: nothing is left, never negative.
  assert.deepEqual(withdrawal(500), { feeCents: 1000, netCents: 0 });
});

test("fmt", () => {
  assert.equal(fmt(18890), "$188.90");
  assert.equal(fmt(0), "$0.00");
  assert.equal(fmt(5), "$0.05");
  assert.equal(fmt(100000), "$1,000.00");
  assert.equal(fmt(123456789), "$1,234,567.89");
  assert.equal(fmt(-1), "-$0.01");
  assert.equal(fmt(-1000), "-$10.00");
});

test("toCents accepts plain decimals", () => {
  assert.equal(toCents("200.00"), 20000);
  assert.equal(toCents("200"), 20000);
  assert.equal(toCents("188.90"), 18890);
  assert.equal(toCents("1.5"), 150);
  assert.equal(toCents("0.05"), 5);
  assert.equal(toCents("0"), 0);
});

test("toCents rejects non-plain amounts", () => {
  for (const bad of ["1.234", "-1", "abc", "", "1.", ".5", " 1", "1,00", "1e3", "$1.00"]) {
    assert.throws(() => toCents(bad), /bad amount/, `should reject ${JSON.stringify(bad)}`);
  }
});
