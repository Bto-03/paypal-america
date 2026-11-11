// Business logic. No Next imports: testable with a fake PayPal client and an in-memory Store.
import { randomUUID } from "node:crypto";
import type { CauseDTO, DashboardDTO, ErrorCode, OrderDTO, RegionId } from "./contract.ts";
import { CAUSES, REGIONS, causesFor, isRegion, regionLabel } from "./catalog.ts";
import { Store, store, type OrderRow } from "./db.ts";
import { DONATION_CENTS, EC_RULE, SALE_CENTS, WITHDRAW_RULE, ecEstimate, goalPercent, withdrawal } from "./money.ts";
import { PayPalError, mode, paypal, sessionTag, verifyCapture, type PPOrder } from "./paypal.ts";
import { fail, ok } from "./http.ts";

export class ServiceError extends Error {
  code: ErrorCode;
  status: number;
  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let override: Store | null = null;
export function setStoreForTests(s: Store | null) {
  override = s;
}
const db = () => override ?? store();

/** Runs a service call and wraps the result/error in the API envelope. */
export async function handle(fn: () => unknown | Promise<unknown>, init?: ResponseInit): Promise<Response> {
  try {
    mode(); // throws when PAYPAL_ENV=live
    return ok(await fn(), init);
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.code, e.message, e.status);
    if (e instanceof PayPalError) {
      if (e.issue === "LIVE_REFUSED") return fail("live_mode_refused", "live mode is refused: sandbox only", 500);
      return fail("paypal_error", "PayPal could not complete the request", 502);
    }
    console.error("internal error:", e instanceof Error ? e.message : "unknown");
    return fail("internal", "internal error", 500);
  }
}

const dto = ({ sid: _s, feeObservedCents: _f, netObservedCents: _n, ...o }: OrderRow): OrderDTO => o;

function own(sid: string, id: string): OrderRow {
  const o = db().order(id);
  if (!o || o.sid !== sid) throw new ServiceError("not_found", "order not found", 404);
  return o;
}

export function dashboard(sid: string): DashboardDTO {
  const s = db();
  const p = s.profile(sid);
  const sales = s.completed(sid, "sale");
  const est = ecEstimate(sales.map((o) => o.amountCents));
  const withObs = sales.filter((o) => o.feeObservedCents != null && o.netObservedCents != null);
  const donations = s.completed(sid, "donation_demo");
  return {
    profile: { alias: p.alias, regionId: p.regionId },
    goal: {
      targetCents: p.goalCents,
      progressCents: est.netCents,
      percent: goalPercent(est.netCents, p.goalCents),
      basis: "ec_estimate_net",
    },
    sales: {
      count: sales.length,
      grossCents: sales.reduce((a, o) => a + o.amountCents, 0),
      observed: withObs.length
        ? {
            feeCents: withObs.reduce((a, o) => a + o.feeObservedCents!, 0),
            netCents: withObs.reduce((a, o) => a + o.netObservedCents!, 0),
            source: "sandbox_observed",
          }
        : null,
      estimateEc: { ...est, rule: EC_RULE, source: "ec_estimate" },
      withdrawal: { ...withdrawal(est.netCents), rule: WITHDRAW_RULE, source: "ec_estimate" },
    },
    lastOrder: s.orders(sid)[0] ? dto(s.orders(sid)[0]) : null,
    stickers: s.stickers(sid).map((k) => ({
      id: k.id,
      kind: k.kind,
      placeId: k.placeId,
      placeLabel: regionLabel(k.placeId),
      milestone: k.milestone,
      origin: "declared_unverified",
      earnedAt: k.earnedAt,
    })),
    donations: { count: donations.length, totalCents: donations.reduce((a, o) => a + o.amountCents, 0) },
    places: REGIONS.map((r) => ({ ...r })),
  };
}

export async function createOrder(sid: string, body: unknown): Promise<OrderDTO> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  let purpose: "sale" | "donation_demo";
  let causeId: string | null = null;
  if (b.purpose === "sale") purpose = "sale";
  else if (b.purpose === "donation_demo") {
    purpose = "donation_demo";
    const c = CAUSES.find((x) => x.id === b.causeId);
    if (!c) throw new ServiceError("bad_request", "invalid causeId", 400);
    causeId = c.id;
  } else throw new ServiceError("bad_request", "purpose must be sale or donation_demo", 400);

  const amountCents = purpose === "sale" ? SALE_CENTS : DONATION_CENTS; // client amounts are ignored
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const created = await paypal().createOrder({
    amountCents,
    sessionTag: sessionTag(sid),
    referenceId: causeId ?? "sale",
    description: purpose === "sale" ? "PayPal America sandbox test sale" : "PayPal America sandbox demo donation",
    returnUrl: `${appUrl}/cobro/resultado`,
    cancelUrl: `${appUrl}/cobro/resultado?cancelled=1`,
    requestId: `create-${randomUUID()}`,
  });
  db().profile(sid);
  return dto(db().insertOrder({ id: created.id, sid, purpose, amountCents, causeId, approvalUrl: created.approvalUrl }));
}

/** Verify the order as PayPal returned it and record it. Throws verification_failed. */
function reconcile(sid: string, o: OrderRow, pp: PPOrder): OrderRow {
  const v = verifyCapture(pp, {
    amountCents: o.amountCents,
    sessionTag: sessionTag(sid),
    payeeEmail: process.env.PAYPAL_PAYEE_EMAIL || null,
    payeeMerchantId: process.env.PAYPAL_PAYEE_MERCHANT_ID || null,
  });
  if (!v.ok) {
    db().setStatus(o.id, "failed");
    throw new ServiceError("verification_failed", "payment could not be verified", 409);
  }
  db().recordCapture(o.id, v);
  if (v.status === "completed" && o.purpose === "sale") db().awardMango(sid, db().profile(sid).regionId, o.id);
  return db().order(o.id)!;
}

export async function captureOrder(sid: string, id: string): Promise<OrderDTO> {
  const o = own(sid, id);
  if (o.status === "completed") return dto(o);
  if (o.status === "cancelled" || o.status === "failed") throw new ServiceError("bad_request", `order is ${o.status}`, 409);
  let pp: PPOrder;
  try {
    pp = o.status === "pending" ? await paypal().get(id) : await paypal().capture(id, `capture-${id}`);
  } catch (e) {
    if (e instanceof PayPalError && e.issue === "ORDER_ALREADY_CAPTURED") pp = await paypal().get(id);
    else if (e instanceof PayPalError && e.issue === "ORDER_NOT_APPROVED") throw new ServiceError("bad_request", "not approved yet", 409);
    else throw e;
  }
  return dto(reconcile(sid, o, pp));
}

export async function getOrder(sid: string, id: string): Promise<OrderDTO> {
  const o = own(sid, id);
  if (o.status !== "pending") return dto(o);
  try {
    return dto(reconcile(sid, o, await paypal().get(id)));
  } catch (e) {
    if (e instanceof ServiceError) return dto(db().order(id)!); // now "failed"
    throw e;
  }
}

export function cancelOrder(sid: string, id: string): OrderDTO {
  const o = own(sid, id);
  if (o.status === "cancelled") return dto(o);
  if (o.status !== "created" && o.status !== "approved") throw new ServiceError("bad_request", `cannot cancel a ${o.status} order`, 409);
  db().setStatus(id, "cancelled");
  return dto(db().order(id)!);
}

export function updateProfile(sid: string, body: unknown): DashboardDTO {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const patch: { alias?: string; regionId?: RegionId; goalCents?: number } = {};
  if (b.alias !== undefined) {
    const a = typeof b.alias === "string" ? b.alias.trim() : "";
    if (a.length < 1 || a.length > 40) throw new ServiceError("bad_request", "alias must be 1-40 characters", 400);
    patch.alias = a;
  }
  if (b.regionId !== undefined) {
    if (!isRegion(b.regionId)) throw new ServiceError("bad_request", "invalid regionId", 400);
    patch.regionId = b.regionId;
  }
  if (b.goalCents !== undefined) {
    const g = b.goalCents;
    if (typeof g !== "number" || !Number.isInteger(g) || g < 100 || g > 10_000_000) {
      throw new ServiceError("bad_request", "goalCents must be an integer between 100 and 10000000", 400);
    }
    patch.goalCents = g;
  }
  db().updateProfile(sid, patch);
  return dashboard(sid);
}

export function causes(sid: string, regionId: string | null): CauseDTO[] {
  if (regionId && !isRegion(regionId)) throw new ServiceError("bad_request", "invalid regionId", 400);
  return causesFor((regionId as RegionId | null) ?? db().profile(sid).regionId);
}
