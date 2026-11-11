// Money rules. Pure functions, integer cents. The AI never computes these.

export const SALE_CENTS = 20000; // $200 test sale, fixed by the server
export const DONATION_CENTS = 100; // $1 demo donation, fixed by the server
export const DEFAULT_GOAL_CENTS = 30000; // $300

export const EC_RATE_BP = 540; // 5.40% in basis points
export const EC_FIXED_CENTS = 30; // $0.30
export const WITHDRAW_RATE_BP = 50; // 0.50%
export const WITHDRAW_MIN_CENTS = 1000; // $10

export const EC_RULE = "5.40% + $0.30 per sale (estimate for an Ecuador account)";
export const WITHDRAW_RULE = "0.50% of the net, minimum $10 (withdrawal scenario)";

function pct(cents: number, bp: number): number {
  return Math.round((cents * bp) / 10000);
}

export function ecFee(grossCents: number): number {
  return pct(grossCents, EC_RATE_BP) + EC_FIXED_CENTS;
}

/** Estimated EC fee/net summed per sale (the fixed $0.30 applies to each sale). */
export function ecEstimate(saleGrossCents: number[]) {
  const feeCents = saleGrossCents.reduce((a, g) => a + ecFee(g), 0);
  const grossCents = saleGrossCents.reduce((a, g) => a + g, 0);
  return { feeCents, netCents: grossCents - feeCents };
}

export function withdrawal(netCents: number) {
  if (netCents <= 0) return { feeCents: 0, netCents: 0 };
  const feeCents = Math.max(pct(netCents, WITHDRAW_RATE_BP), WITHDRAW_MIN_CENTS);
  return { feeCents, netCents: Math.max(netCents - feeCents, 0) };
}

export function goalPercent(progressCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0;
  return Math.round((progressCents * 100) / targetCents);
}

export function fmt(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, "0")}`;
}

/** "200.00" -> 20000. Throws on anything that is not a plain decimal. */
export function toCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`bad amount: ${value}`);
  const [i, d = ""] = value.split(".");
  return Number(i) * 100 + Number(d.padEnd(2, "0"));
}
