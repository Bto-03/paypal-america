// PayPal Orders v2 client. Sandbox only: the live endpoint is never used.
// Without credentials the app runs in MOCK mode (clearly labeled) so the UI can be built.
import { createHash, randomUUID } from "node:crypto";
import type { Mode } from "./contract.ts";
import { toCents } from "./money.ts";

export const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  status: number;
  issue: string | null;
  constructor(message: string, status: number, issue: string | null = null) {
    super(message);
    this.status = status;
    this.issue = issue;
  }
}

export function mode(): Mode {
  if ((process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live") {
    throw new PayPalError("live mode is refused: this project only runs in sandbox", 500, "LIVE_REFUSED");
  }
  return process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "sandbox" : "mock";
}

/** Binds a PayPal order to a browser session without sending the session id itself. */
export function sessionTag(sid: string): string {
  return createHash("sha256").update(`pa:${sid}`).digest("hex").slice(0, 32);
}

// ---------- minimal shapes of the PayPal responses we read ----------
export interface PPMoney {
  currency_code: string;
  value: string;
}
export interface PPCapture {
  id: string;
  status: string; // COMPLETED | PENDING | DECLINED | ...
  amount: PPMoney;
  seller_receivable_breakdown?: { gross_amount?: PPMoney; paypal_fee?: PPMoney; net_amount?: PPMoney };
}
export interface PPOrder {
  id: string;
  status: string; // CREATED | APPROVED | COMPLETED | ...
  links?: { href: string; rel: string }[];
  purchase_units?: {
    custom_id?: string;
    amount?: PPMoney;
    payee?: { email_address?: string; merchant_id?: string };
    payments?: { captures?: PPCapture[] };
  }[];
}

export interface Expected {
  amountCents: number;
  sessionTag: string;
  payeeEmail?: string | null;
  payeeMerchantId?: string | null;
}

export type Verified =
  | { ok: true; status: "completed" | "pending"; captureId: string; feeObservedCents: number | null; netObservedCents: number | null }
  | { ok: false; reason: string };

/**
 * The only place that decides a payment counts. Checks status, amount, currency,
 * payee and session binding on the order as returned by PayPal (never the return URL).
 */
export function verifyCapture(order: PPOrder, exp: Expected): Verified {
  const pu = order.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  if (!pu || !cap) return { ok: false, reason: "no capture on the order" };
  if (pu.custom_id !== exp.sessionTag) return { ok: false, reason: "order belongs to another session" };
  if (cap.amount?.currency_code !== "USD") return { ok: false, reason: `currency ${cap.amount?.currency_code}` };
  let amount: number;
  try {
    amount = toCents(cap.amount.value);
  } catch {
    return { ok: false, reason: "unreadable amount" };
  }
  if (amount !== exp.amountCents) return { ok: false, reason: `amount ${amount} != ${exp.amountCents}` };
  if (exp.payeeEmail && pu.payee?.email_address && pu.payee.email_address.toLowerCase() !== exp.payeeEmail.toLowerCase()) {
    return { ok: false, reason: "payee email mismatch" };
  }
  if (exp.payeeMerchantId && pu.payee?.merchant_id !== exp.payeeMerchantId) {
    return { ok: false, reason: "payee merchant mismatch" };
  }
  const status = cap.status === "COMPLETED" ? "completed" : cap.status === "PENDING" ? "pending" : null;
  if (!status) return { ok: false, reason: `capture status ${cap.status}` };
  const b = cap.seller_receivable_breakdown;
  const fee = b?.paypal_fee?.value ? toCents(b.paypal_fee.value) : null;
  const net = b?.net_amount?.value ? toCents(b.net_amount.value) : null;
  return { ok: true, status, captureId: cap.id, feeObservedCents: fee, netObservedCents: net };
}

// ---------- client interface ----------
export interface CreateArgs {
  amountCents: number;
  sessionTag: string;
  referenceId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  requestId: string;
}

export interface PayPalClient {
  createOrder(a: CreateArgs): Promise<{ id: string; approvalUrl: string }>;
  capture(id: string, requestId: string): Promise<PPOrder>;
  get(id: string): Promise<PPOrder>;
}

function dollars(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function payee() {
  const email = process.env.PAYPAL_PAYEE_EMAIL;
  const merchant = process.env.PAYPAL_PAYEE_MERCHANT_ID;
  if (merchant) return { merchant_id: merchant };
  if (email) return { email_address: email };
  return undefined;
}

class SandboxClient implements PayPalClient {
  private token: { value: string; exp: number } | null = null;

  private async auth(): Promise<string> {
    if (this.token && this.token.exp > Date.now() + 60_000) return this.token.value;
    const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const r = await fetch(`${SANDBOX_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) throw new PayPalError(`oauth failed (${r.status})`, r.status, "AUTH");
    const j = (await r.json()) as { access_token: string; expires_in: number };
    this.token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    return j.access_token;
  }

  private async call(path: string, init: RequestInit & { requestId?: string } = {}): Promise<PPOrder> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.auth()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;
    const r = await fetch(`${SANDBOX_BASE}${path}`, { ...init, headers, signal: AbortSignal.timeout(20_000) });
    const text = await r.text();
    const body = text ? JSON.parse(text) : {};
    if (!r.ok) {
      const issue = body?.details?.[0]?.issue ?? body?.name ?? null;
      // Never echo PayPal bodies to the client; they can contain account details.
      throw new PayPalError(`paypal ${r.status} ${issue ?? ""}`.trim(), r.status, issue);
    }
    return body as PPOrder;
  }

  async createOrder(a: CreateArgs) {
    const p = payee();
    const order = await this.call("/v2/checkout/orders", {
      method: "POST",
      requestId: a.requestId,
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: a.referenceId,
            custom_id: a.sessionTag,
            description: a.description,
            amount: { currency_code: "USD", value: dollars(a.amountCents) },
            ...(p ? { payee: p } : {}),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "PayPal America (sandbox demo)",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: a.returnUrl,
              cancel_url: a.cancelUrl,
            },
          },
        },
      }),
    });
    const link = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!link) throw new PayPalError("no approval link", 502, "NO_LINK");
    return { id: order.id, approvalUrl: link.href };
  }

  capture(id: string, requestId: string) {
    return this.call(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, { method: "POST", requestId, body: "{}" });
  }

  get(id: string) {
    return this.call(`/v2/checkout/orders/${encodeURIComponent(id)}`, { method: "GET" });
  }
}

// ---------- MOCK: behaves like PayPal for local work; labeled "mock" everywhere ----------
interface MockOrder {
  order: PPOrder;
  returnUrl: string;
  cancelUrl: string;
  outcome: "completed" | "pending" | null;
}
const g = globalThis as unknown as { __ppMock?: Map<string, MockOrder> };
const mocks = (g.__ppMock ??= new Map());

class MockClient implements PayPalClient {
  async createOrder(a: CreateArgs) {
    const id = `MOCK-${randomUUID().slice(0, 13).toUpperCase()}`;
    mocks.set(id, {
      order: {
        id,
        status: "CREATED",
        purchase_units: [{ custom_id: a.sessionTag, amount: { currency_code: "USD", value: dollars(a.amountCents) }, payee: { email_address: "business-ec@mock.invalid" } }],
      },
      returnUrl: a.returnUrl,
      cancelUrl: a.cancelUrl,
      outcome: null,
    });
    const base = new URL(a.returnUrl).origin;
    return { id, approvalUrl: `${base}/mock-paypal?token=${id}` };
  }

  async capture(id: string) {
    const m = mocks.get(id);
    if (!m) throw new PayPalError("mock order not found", 404, "RESOURCE_NOT_FOUND");
    if (m.order.status === "COMPLETED") throw new PayPalError("already captured", 422, "ORDER_ALREADY_CAPTURED");
    if (!m.outcome) throw new PayPalError("payer has not approved", 422, "ORDER_NOT_APPROVED");
    const pu = m.order.purchase_units![0];
    const gross = toCents(pu.amount!.value);
    const fee = Math.round(gross * 0.0349) + 49; // mock fee, not a real rate
    m.order.status = "COMPLETED";
    pu.payments = {
      captures: [
        {
          id: `MOCKCAP-${randomUUID().slice(0, 12).toUpperCase()}`,
          status: m.outcome === "pending" ? "PENDING" : "COMPLETED",
          amount: pu.amount!,
          seller_receivable_breakdown:
            m.outcome === "pending"
              ? undefined
              : { gross_amount: pu.amount, paypal_fee: { currency_code: "USD", value: dollars(fee) }, net_amount: { currency_code: "USD", value: dollars(gross - fee) } },
        },
      ],
    };
    return structuredClone(m.order);
  }

  async get(id: string) {
    const m = mocks.get(id);
    if (!m) throw new PayPalError("mock order not found", 404, "RESOURCE_NOT_FOUND");
    return structuredClone(m.order);
  }
}

/** Used only by the /mock-paypal page to simulate the payer's choice. */
export function mockDecide(id: string, choice: "completed" | "pending" | "cancel"): string | null {
  const m = mocks.get(id);
  if (!m) return null;
  if (choice === "cancel") return `${m.cancelUrl}${m.cancelUrl.includes("?") ? "&" : "?"}token=${id}`;
  m.outcome = choice;
  m.order.status = "APPROVED";
  return `${m.returnUrl}${m.returnUrl.includes("?") ? "&" : "?"}token=${id}`;
}

let client: PayPalClient | null = null;
let clientMode: Mode | null = null;
export function paypal(): PayPalClient {
  const m = mode();
  if (!client || clientMode !== m) {
    client = m === "sandbox" ? new SandboxClient() : new MockClient();
    clientMode = m;
  }
  return client;
}

export function setPayPalForTests(c: PayPalClient) {
  client = c;
  clientMode = mode();
}
