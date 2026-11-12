"use client";
import Link from "next/link";
import {
  useCallback, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from "react";
import type { OrderStatus } from "@/server/contract";
import { fmtUSD } from "@/lib/api";
import { useI18n, type Key } from "@/lib/i18n";

/* ───────── Class helpers (kept for pages that still use them) ───────── */
export const btn = "btn";
export const btnPrimary = "btn btn-primary";
export const btnSecondary = "btn btn-secondary";
export const btnQuiet = "btn btn-quiet";
export const btnDanger = "btn btn-danger";
export const field = "field";

/* ───────── Icons (stroke, 24px grid) ───────── */
const ICONS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  clock: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
  flask: "M9 3h6M10 3v6L5 19a1.5 1.5 0 001.3 2h11.4A1.5 1.5 0 0019 19l-5-10V3M8 15h8",
  approx: "M5 9c2-2 4-2 7 0s5 2 7 0M5 15c2-2 4-2 7 0s5 2 7 0",
  calc: "M6 4h12v16H6zM9 8h6M9 12h2M13 12h2M9 16h2M13 16h2",
  pin: "M12 21s6-5.5 6-11a6 6 0 10-12 0c0 5.5 6 11 6 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  plus: "M12 5v14M5 12h14",
  ban: "M12 3a9 9 0 100 18 9 9 0 000-18zM6 6l12 12",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  copy: "M9 9h10v11H9zM5 15V4h10",
  share: "M12 15V4M8 8l4-4 4 4M5 13v6h14v-6",
  print: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  home: "M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5",
  book: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  stamp: "M12 3l2.5 5.5 6 .8-4.4 4.1 1.1 6-5.2-2.9-5.2 2.9 1.1-6L3.5 9.3l6-.8z",
  help: "M9.5 9a2.5 2.5 0 114 2c-1 .8-1.5 1.2-1.5 2.5M12 17h.01M12 3a9 9 0 100 18 9 9 0 000-18z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ───────── Card (glass) ───────── */
export function Card({
  children, className = "", variant = "glass", as: Tag = "section",
}: { children: ReactNode; className?: string; variant?: "glass" | "strong" | "plain" | "tile"; as?: "section" | "div" | "article" | "li" }) {
  const v = { glass: "glass", strong: "glass-strong", plain: "surface", tile: "tile" }[variant];
  return <Tag className={`${v} rounded-3xl p-5 sm:p-6 ${className}`}>{children}</Tag>;
}

/* ───────── Buttons ───────── */
type Variant = "primary" | "secondary" | "quiet" | "danger";
const vcls: Record<Variant, string> = { primary: "btn-primary", secondary: "btn-secondary", quiet: "btn-quiet", danger: "btn-danger" };

export function Button({
  variant = "primary", full, loading, className = "", children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean; loading?: boolean }) {
  return (
    <button type="button" {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={`btn ${vcls[variant]} ${full ? "w-full" : ""} ${className}`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", full, className = "", children }: { href: string; variant?: Variant; full?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`btn ${vcls[variant]} ${full ? "w-full" : ""} ${className}`}>
      {children}
    </Link>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} className="animate-spin" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M12 3a9 9 0 019 9" />
    </svg>
  );
}

/** Round 44px icon button. Always give it an accessible `label`. */
export function IconButton({
  label, onClick, href, tone = "dark", children, className = "",
}: { label: string; onClick?: () => void; href?: string; tone?: "dark" | "light"; children: ReactNode; className?: string }) {
  const cls = `iconbtn ${tone === "dark" ? "iconbtn-dark" : "iconbtn-light"} ${className}`;
  if (href) return <Link href={href} aria-label={label} title={label} className={cls}>{children}</Link>;
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>{children}</button>;
}

/* ───────── HoldButton: press-and-hold to confirm ───────── */
export interface HoldButtonProps {
  onConfirm: () => void;
  children: ReactNode; // label, e.g. "Cobrar venta de prueba $200"
  /** hold duration in ms (default 700) */
  durationMs?: number;
  loading?: boolean;
  disabled?: boolean;
  /** "dark" = white pill for the blue hero; "blue" = filled blue pill on light surfaces */
  tone?: "dark" | "blue";
  className?: string;
}

export function HoldButton({ onConfirm, children, durationMs = 700, loading, disabled, tone = "blue", className = "" }: HoldButtonProps) {
  const { t } = useI18n();
  const [p, setP] = useState(0);
  const [hint, setHint] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const held = useRef(false); // a hold is in progress
  const fired = useRef(false);
  const hintId = useId();

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    held.current = false;
  }, []);

  const begin = useCallback(() => {
    if (disabled || loading || held.current) return;
    held.current = true;
    fired.current = false;
    setHint(false);
    start.current = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - start.current) / durationMs);
      setP(k);
      if (k >= 1) {
        held.current = false;
        raf.current = null;
        fired.current = true;
        try {
          navigator.vibrate?.(10);
        } catch {
          /* ignore */
        }
        onConfirm();
        window.setTimeout(() => setP(0), 1400);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [disabled, loading, durationMs, onConfirm]);

  const cancel = useCallback(() => {
    if (!held.current) return;
    const short = performance.now() - start.current < 250;
    stop();
    setP(0);
    if (short) setHint(true); // a tap, not a hold → tell the user
  }, [stop]);

  useEffect(() => stop, [stop]);

  const shown = loading ? 1 : p;
  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-describedby={hintId}
        data-holding={p > 0 && p < 1}
        className={`btn hold ${tone === "dark" ? "hold-dark" : "btn-primary hold-blue"} ${className}`}
        style={{ ["--p" as string]: shown }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          begin();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") cancel();
        }}
        onBlur={cancel}
        onClick={(e) => {
          // pointer/keyboard are handled above; a bare click (assistive tech) only shows the hint.
          if (e.detail === 0 && !fired.current) setHint(true);
        }}
      >
        <span className="hold-fill" aria-hidden="true" />
        {loading ? <Spinner /> : <Icon name="stamp" size={20} />}
        <span>{children}</span>
      </button>
      <p id={hintId} role="status" className={`mt-2 text-center text-sm ${tone === "dark" ? "hero-sub" : "text-ink-soft"}`}>
        {loading ? t("hold.progress") : hint ? t("hold.hint") : t("hold.idle")}
      </p>
    </div>
  );
}

/* ───────── Chips ───────── */
export function Chip({ tone = "cmp", icon, children, className = "" }: { tone?: "sbx" | "est" | "cmp" | "dcl" | "ok" | "err"; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={`chip chip-${tone} ${className}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export type SourceKind = "sandbox_observed" | "ec_estimate" | "computed" | "declared";
const SRC: Record<SourceKind, { tone: "sbx" | "est" | "cmp" | "dcl"; icon: IconName }> = {
  sandbox_observed: { tone: "sbx", icon: "flask" },
  ec_estimate: { tone: "est", icon: "approx" },
  computed: { tone: "cmp", icon: "calc" },
  declared: { tone: "dcl", icon: "pin" },
};
export function SourceChip({ source, className = "" }: { source: SourceKind; className?: string }) {
  const { t } = useI18n();
  const s = SRC[source];
  return <Chip tone={s.tone} icon={s.icon} className={className}>{t(`src.${source}` as Key)}</Chip>;
}

/* ───────── Money ───────── */
function splitUSD(cents: number) {
  const s = fmtUSD(cents);
  const i = s.lastIndexOf(".");
  return { whole: s.slice(0, i), cents: s.slice(i + 1), full: s };
}
const MONEY_SIZE = { md: "text-xl font-semibold", lg: "text-3xl font-extrabold tracking-tight", xl: "text-5xl font-extrabold tracking-tight" } as const;

export function Money({
  cents, size = "lg", chip, label, onDark = false, className = "",
}: {
  cents: number;
  /** "display" = editorial hero number (64–120px, raised cents) */
  size?: "md" | "lg" | "xl" | "display";
  chip?: SourceKind;
  label?: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  const m = splitUSD(cents);
  const num =
    size === "display" ? (
      <span className="display-money" style={{ color: onDark ? "#fff" : "var(--deep)" }}>
        <span aria-hidden="true">
          {m.whole}
          <span className="cents">{m.cents}</span>
        </span>
        <span className="sr-only">{m.full}</span>
      </span>
    ) : (
      <span className={`num ${MONEY_SIZE[size]}`}>{m.full}</span>
    );
  return (
    <div className={className}>
      {label && <div className="smallcaps mb-1">{label}</div>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {num}
        {chip && <SourceChip source={chip} />}
      </div>
    </div>
  );
}

/* ───────── Progress ring ───────── */
export function ProgressRing({
  percent, size = 160, stroke = 12, label, sublabel, ariaLabel,
}: { percent: number; size?: number; stroke?: number; label?: ReactNode; sublabel?: ReactNode; ariaLabel: string }) {
  const pct = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 100 ? "#f6b21b" : "var(--ring)"} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .7s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="num text-3xl font-extrabold leading-none">{label}</div>
        {sublabel && <div className="mt-1 text-xs font-semibold text-ink-soft">{sublabel}</div>}
      </div>
    </div>
  );
}

/* ───────── Status pill ───────── */
const STATUS: Record<OrderStatus, { icon: IconName; cls: string }> = {
  created: { icon: "plus", cls: "chip-cmp" },
  approved: { icon: "check", cls: "chip-sbx" },
  pending: { icon: "clock", cls: "chip-est" },
  completed: { icon: "check", cls: "chip-ok" },
  cancelled: { icon: "ban", cls: "chip-cmp" },
  failed: { icon: "x", cls: "chip-err" },
};
export function StatusPill({ status, className = "" }: { status: OrderStatus; className?: string }) {
  const { t } = useI18n();
  const s = STATUS[status];
  return (
    <span className={`chip ${s.cls} ${className}`} style={{ fontSize: ".85rem", padding: ".2rem .7rem .2rem .5rem" }}>
      <Icon name={s.icon} size={15} />
      {t(`status.${status}` as Key)}
    </span>
  );
}

/* ───────── Sheet / Dialog (native <dialog>: focus trap, Esc, return focus) ───────── */
export function Sheet({
  open, onClose, title, children, className = "",
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const tid = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={tid}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
    >
      <div className={`sheet-panel rounded-t-[28px] bg-[var(--sheet)] p-5 shadow-2xl sm:rounded-[28px] sm:p-6 ${className}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={tid} className="text-2xl font-extrabold tracking-tight">{title}</h2>
          <IconButton tone="light" label={t("dialog.close")} onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
export const Dialog = Sheet;

/* ───────── Empty state / skeleton / misc ───────── */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-3xl border border-dashed border-line px-6 py-8 text-center">
      {icon}
      <h3 className="mt-1 text-xl font-bold">{title}</h3>
      {text && <p className="max-w-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "", lines }: { className?: string; lines?: number }) {
  const { t } = useI18n();
  if (lines) {
    return (
      <div role="status" aria-label={t("loading")} className="grid gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={`skeleton h-4 ${i === lines - 1 ? "w-2/3" : "w-full"} ${className}`} />
        ))}
      </div>
    );
  }
  return <div role="status" aria-label={t("loading")} className={`skeleton h-6 ${className}`} />;
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "slate" }) {
  const c = { blue: "chip-sbx", amber: "chip-est", slate: "chip-cmp" }[tone];
  return <span className={`chip ${c}`}>{children}</span>;
}

export function Msg({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`chip ${tone === "error" ? "chip-err" : "chip-sbx"} !flex !whitespace-normal !rounded-2xl !p-4 !text-lg !font-semibold`}>
      {children}
    </p>
  );
}
