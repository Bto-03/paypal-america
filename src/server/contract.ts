// API contract v1 — shared types. Frontend and backend import from here.
// All money is integer cents in USD. Never floats.

export type Mode = "sandbox" | "mock";

export interface Meta {
  mode: Mode;
  generatedAt: string; // ISO 8601
}

export interface Ok<T> {
  data: T;
  meta: Meta;
}

export interface Err {
  error: { code: ErrorCode; message: string };
  meta: Meta;
}

export type ErrorCode =
  | "bad_request"
  | "not_found"
  | "forbidden"
  | "paypal_error"
  | "verification_failed"
  | "live_mode_refused"
  | "internal";

export type Purpose = "sale" | "donation_demo";

// Local order lifecycle. "completed" only after the server verified the capture.
export type OrderStatus = "created" | "approved" | "pending" | "completed" | "cancelled" | "failed";

export interface OrderDTO {
  id: string; // PayPal order id
  purpose: Purpose;
  status: OrderStatus;
  amountCents: number;
  currency: "USD";
  causeId: string | null;
  captureId: string | null;
  approvalUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoneyLine {
  feeCents: number;
  netCents: number;
}

export interface SalesSummary {
  count: number;
  grossCents: number;
  // Observed in PayPal sandbox (seller_receivable_breakdown). Null when PayPal did not return it.
  observed: (MoneyLine & { source: "sandbox_observed" }) | null;
  // Estimate for a real Ecuador account: 5.40% + $0.30 per sale.
  estimateEc: MoneyLine & { rule: string; source: "ec_estimate" };
  // Withdrawal scenario on the estimated net: 0.50%, minimum $10.
  withdrawal: MoneyLine & { rule: string; source: "ec_estimate" };
}

export interface GoalDTO {
  targetCents: number;
  progressCents: number; // estimated EC net of completed sales
  percent: number; // 0..100+, rounded
  basis: "ec_estimate_net";
}

export interface StickerDTO {
  id: string;
  kind: "golden_mango" | "condor";
  placeId: string;
  placeLabel: string;
  milestone: "first_sale" | "goal_reached";
  origin: "declared_unverified"; // place is declared by the user, not verified
  earnedAt: string;
}

export interface ProfileDTO {
  alias: string;
  regionId: RegionId;
  avatar: StickerId; // seller's chosen local sticker
  receiptNote: string; // thank-you note printed on receipts, 0..80 chars
}

// Local sticker ids. Art lives in src/components/stickers.tsx (same ids).
export type StickerId =
  | "tortoise" | "booby" | "sealion" // Galápagos
  | "llama" | "cotopaxi" | "hummingbird" // Sierra
  | "mango" | "crab" | "palm" // Costa
  | "golden_mango" | "condor"; // milestones

export type OrderEventType =
  | "created" | "approved" | "captured" | "pending" | "verified"
  | "verification_failed" | "cancelled" | "sticker_awarded";

export interface OrderEventDTO {
  type: OrderEventType;
  at: string; // ISO 8601
  detail: string | null; // short English detail, e.g. capture id or failed check name
}

export interface CheckDTO {
  name: "status" | "amount" | "currency" | "payee" | "session";
  ok: boolean;
}

export interface ReceiptDTO {
  receiptNo: string; // e.g. "PA-2026-0007"
  order: OrderDTO;
  seller: ProfileDTO & { regionLabel: string };
  lines: {
    grossCents: number;
    feeObservedCents: number | null; // sandbox observed
    netObservedCents: number | null;
    feeEcCents: number | null; // Ecuador estimate (sales only)
    netEcCents: number | null;
  };
  events: OrderEventDTO[]; // chronological traceability
  checks: CheckDTO[]; // empty until a capture was verified or failed
  sticker: StickerDTO | null; // sticker earned by this order, if any
  cause: { id: string; name: string } | null; // donations only
}

export type RegionId = "galapagos" | "sierra" | "costa";

export interface DashboardDTO {
  profile: ProfileDTO;
  goal: GoalDTO;
  sales: SalesSummary;
  lastOrder: OrderDTO | null;
  recent: OrderDTO[]; // last 10 orders, newest first (sales and donations)
  stickers: StickerDTO[];
  donations: { count: number; totalCents: number };
  places: { id: RegionId; label: string }[];
}

export interface EvidenceItem {
  id: string;
  label: string;
  valueCents: number | null;
  value: string; // human-readable, e.g. "$188.90"
  source: "sandbox_observed" | "ec_estimate" | "computed" | "declared";
}

export interface InsightDTO {
  category: "progress" | "fees" | "withdrawal" | "next_step";
  text: string;
  evidenceIds: string[];
  assumptions: string[];
}

export interface InsightsDTO {
  aiStatus: "ok" | "unavailable" | "no_data";
  insights: InsightDTO[];
  evidence: EvidenceItem[];
  cached: boolean;
}

export interface CauseDTO {
  id: string;
  name: string;
  regionId: RegionId;
  description: string;
  demo: true;
  amountCents: 100;
}
