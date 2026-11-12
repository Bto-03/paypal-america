// Persistent ledger on SQLite (built into Node >= 22.5, no extra dependency).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { CheckDTO, OrderDTO, OrderEventDTO, OrderEventType, OrderStatus, Purpose, RegionId, StickerId } from "./contract.ts";
import { DEFAULT_AVATAR } from "./catalog.ts";
import { DEFAULT_GOAL_CENTS } from "./money.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  sid TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  region_id TEXT NOT NULL,
  goal_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  sid TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('sale','donation_demo')),
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  cause_id TEXT,
  capture_id TEXT UNIQUE,
  approval_url TEXT,
  fee_observed_cents INTEGER,
  net_observed_cents INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_sid ON orders(sid);
CREATE TABLE IF NOT EXISTS stickers (
  id TEXT PRIMARY KEY,
  sid TEXT NOT NULL,
  kind TEXT NOT NULL,
  place_id TEXT NOT NULL,
  milestone TEXT NOT NULL,
  order_id TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  UNIQUE (sid, place_id, milestone)
);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS order_events_order ON order_events(order_id);
CREATE TABLE IF NOT EXISTS insights_cache (
  sig TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

type Row = Record<string, unknown>;

export interface ProfileRow {
  sid: string;
  alias: string;
  regionId: RegionId;
  goalCents: number;
  avatar: StickerId;
  receiptNote: string;
}

export interface OrderRow extends OrderDTO {
  sid: string;
  feeObservedCents: number | null;
  netObservedCents: number | null;
  checks: CheckDTO[];
}

export interface StickerRow {
  id: string;
  kind: "golden_mango" | "condor";
  placeId: RegionId;
  milestone: "first_sale" | "goal_reached";
  orderId: string;
  earnedAt: string;
}

const now = () => new Date().toISOString();

function toOrder(r: Row): OrderRow {
  return {
    id: r.id as string,
    sid: r.sid as string,
    purpose: r.purpose as Purpose,
    status: r.status as OrderStatus,
    amountCents: Number(r.amount_cents),
    currency: "USD",
    causeId: (r.cause_id as string) ?? null,
    captureId: (r.capture_id as string) ?? null,
    approvalUrl: (r.approval_url as string) ?? null,
    feeObservedCents: r.fee_observed_cents == null ? null : Number(r.fee_observed_cents),
    netObservedCents: r.net_observed_cents == null ? null : Number(r.net_observed_cents),
    checks: r.checks_json ? (JSON.parse(r.checks_json as string) as CheckDTO[]) : [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** Add a column only when missing, so existing databases keep their data. */
function addColumn(db: DatabaseSync, table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Row[];
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

export class Store {
  db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;");
    this.db.exec(SCHEMA);
    addColumn(this.db, "profiles", "avatar", "TEXT NOT NULL DEFAULT 'tortoise'");
    addColumn(this.db, "profiles", "receipt_note", "TEXT NOT NULL DEFAULT ''");
    addColumn(this.db, "orders", "checks_json", "TEXT");
  }

  profile(sid: string): ProfileRow {
    const r = this.db.prepare("SELECT * FROM profiles WHERE sid = ?").get(sid) as Row | undefined;
    if (r) {
      return {
        sid,
        alias: r.alias as string,
        regionId: r.region_id as RegionId,
        goalCents: Number(r.goal_cents),
        avatar: r.avatar as StickerId,
        receiptNote: r.receipt_note as string,
      };
    }
    this.db
      .prepare("INSERT OR IGNORE INTO profiles (sid, alias, region_id, goal_cents, avatar, created_at) VALUES (?,?,?,?,?,?)")
      .run(sid, "Demo seller", "galapagos", DEFAULT_GOAL_CENTS, DEFAULT_AVATAR.galapagos, now());
    return this.profile(sid);
  }

  updateProfile(sid: string, patch: Partial<Pick<ProfileRow, "alias" | "regionId" | "goalCents" | "avatar" | "receiptNote">>): ProfileRow {
    const p = this.profile(sid);
    const next = { ...p, ...patch };
    // Region change keeps the default avatar in step, unless the seller picked one.
    if (patch.regionId && patch.avatar === undefined && p.avatar === DEFAULT_AVATAR[p.regionId]) next.avatar = DEFAULT_AVATAR[patch.regionId];
    this.db
      .prepare("UPDATE profiles SET alias = ?, region_id = ?, goal_cents = ?, avatar = ?, receipt_note = ? WHERE sid = ?")
      .run(next.alias, next.regionId, next.goalCents, next.avatar, next.receiptNote, sid);
    return this.profile(sid);
  }

  insertOrder(o: { id: string; sid: string; purpose: Purpose; amountCents: number; causeId: string | null; approvalUrl: string | null }) {
    const t = now();
    this.db
      .prepare(
        "INSERT INTO orders (id, sid, purpose, status, amount_cents, cause_id, approval_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(o.id, o.sid, o.purpose, "created", o.amountCents, o.causeId, o.approvalUrl, t, t);
    return this.order(o.id)!;
  }

  order(id: string): OrderRow | null {
    const r = this.db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
    return r ? toOrder(r) : null;
  }

  setStatus(id: string, status: OrderStatus) {
    this.db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), id);
  }

  /**
   * Record a verified capture. Idempotent: the unique capture_id and the
   * "only from a non-completed state" guard make retries and double clicks harmless.
   * Returns true when this call recorded it, false when it was already recorded.
   */
  recordCapture(
    id: string,
    c: { captureId: string; status: "completed" | "pending"; feeObservedCents: number | null; netObservedCents: number | null },
  ): boolean {
    const res = this.db
      .prepare(
        `UPDATE orders SET status = ?, capture_id = ?, fee_observed_cents = ?, net_observed_cents = ?, updated_at = ?
         WHERE id = ? AND status != 'completed' AND (capture_id IS NULL OR capture_id = ?)`,
      )
      .run(c.status, c.captureId, c.feeObservedCents, c.netObservedCents, now(), id, c.captureId);
    return Number(res.changes) > 0;
  }

  orders(sid: string): OrderRow[] {
    return (this.db.prepare("SELECT * FROM orders WHERE sid = ? ORDER BY created_at DESC, rowid DESC").all(sid) as Row[]).map(toOrder);
  }

  completed(sid: string, purpose: Purpose): OrderRow[] {
    return (
      this.db
        .prepare("SELECT * FROM orders WHERE sid = ? AND purpose = ? AND status = 'completed' AND capture_id IS NOT NULL")
        .all(sid, purpose) as Row[]
    ).map(toOrder);
  }

  /** One sticker per profile, place and milestone. Returns true when newly awarded. */
  awardSticker(sid: string, placeId: RegionId, kind: StickerRow["kind"], milestone: StickerRow["milestone"], orderId: string): boolean {
    const res = this.db
      .prepare(
        "INSERT OR IGNORE INTO stickers (id, sid, kind, place_id, milestone, order_id, earned_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(randomUUID(), sid, kind, placeId, milestone, orderId, now());
    return Number(res.changes) > 0;
  }

  awardMango(sid: string, placeId: RegionId, orderId: string): boolean {
    return this.awardSticker(sid, placeId, "golden_mango", "first_sale", orderId);
  }

  /** 1-based position of the order among the session's orders by creation. */
  sequence(sid: string, orderId: string): number {
    const r = this.db
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE sid = ? AND rowid <= (SELECT rowid FROM orders WHERE id = ?)")
      .get(sid, orderId) as Row;
    return Number(r.n);
  }

  setChecks(id: string, checks: CheckDTO[]) {
    this.db.prepare("UPDATE orders SET checks_json = ? WHERE id = ?").run(JSON.stringify(checks), id);
  }

  /** Append an event. With once=true (default) a type already recorded for the order is skipped. */
  addEvent(orderId: string, type: OrderEventType, detail: string | null = null, once = true): boolean {
    if (once && this.db.prepare("SELECT 1 FROM order_events WHERE order_id = ? AND type = ?").get(orderId, type)) return false;
    this.db.prepare("INSERT INTO order_events (order_id, type, at, detail) VALUES (?,?,?,?)").run(orderId, type, now(), detail);
    return true;
  }

  events(orderId: string): OrderEventDTO[] {
    return (this.db.prepare("SELECT type, at, detail FROM order_events WHERE order_id = ? ORDER BY id").all(orderId) as Row[]).map((r) => ({
      type: r.type as OrderEventType,
      at: r.at as string,
      detail: (r.detail as string) ?? null,
    }));
  }

  stickers(sid: string): StickerRow[] {
    return (this.db.prepare("SELECT * FROM stickers WHERE sid = ? ORDER BY earned_at").all(sid) as Row[]).map((r) => ({
      id: r.id as string,
      kind: r.kind as StickerRow["kind"],
      placeId: r.place_id as RegionId,
      milestone: r.milestone as StickerRow["milestone"],
      orderId: r.order_id as string,
      earnedAt: r.earned_at as string,
    }));
  }

  cacheGet(sig: string): string | null {
    const r = this.db.prepare("SELECT json FROM insights_cache WHERE sig = ?").get(sig) as Row | undefined;
    return r ? (r.json as string) : null;
  }

  cachePut(sig: string, json: string) {
    this.db.prepare("INSERT OR REPLACE INTO insights_cache (sig, json, created_at) VALUES (?,?,?)").run(sig, json, now());
  }
}

let shared: Store | null = null;
export function store(): Store {
  if (!shared) shared = new Store(process.env.DB_PATH || "data/paypal-america.db");
  return shared;
}
