"use client";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import type { OrderStatus, RegionId, StickerId } from "@/server/contract";
import { fmtUSD } from "@/lib/api";
import { useI18n, type Key } from "@/lib/i18n";
import { ContourLines } from "./Background";
import { Sticker } from "./stickers";
import { Icon } from "./ui";

/* ───────── Hero: deep-blue zone with Andes contours; put glass-dark cards inside ───────── */
export function Hero({ regionId, children, className = "" }: { regionId: RegionId; children: ReactNode; className?: string }) {
  return (
    <div className={`hero bleed ${className}`} data-region={regionId}>
      <div className="hero-contours" aria-hidden="true">
        <ContourLines />
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-4">{children}</div>
    </div>
  );
}

/** White sheet with 28px top radius that rises over the Hero. Holds everything else. */
export function PageSheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sheet-page bleed ${className}`}>
      <div className="mx-auto w-full max-w-3xl px-4">{children}</div>
    </div>
  );
}

/** Frosted card for use ON the Hero (white 12% fill, hairline border). */
export function GlassOnBlue({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-dark p-4 ${className}`}>{children}</div>;
}

/* ───────── BentoCard ───────── */
export function BentoCard({
  title, value, hint, icon, href, onClick, tone = "default", className = "", children,
}: {
  title: string; value?: ReactNode; hint?: string; icon?: ReactNode; href?: string; onClick?: () => void;
  tone?: "default" | "mango"; className?: string; children?: ReactNode;
}) {
  const cls = `tile bento ${tone === "mango" ? "bento-mango" : ""} ${className}`;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="smallcaps">{title}</span>
        {icon}
      </div>
      {value && <div className="mt-auto text-2xl font-extrabold leading-tight tracking-tight">{value}</div>}
      {children}
      {hint && <div className="text-sm text-ink-soft">{hint}</div>}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} text-left`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/* ───────── GoalBar: solid fill + hatched remainder + knob ───────── */
export function GoalBar({ progressCents, targetCents, percent, label }: { progressCents: number; targetCents: number; percent?: number; label: string }) {
  const { t } = useI18n();
  const raw = percent ?? (targetCents > 0 ? (progressCents / targetCents) * 100 : 0);
  const pct = Math.max(0, Math.min(100, raw));
  const knob = Math.max(4, Math.min(96, pct));
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`${Math.round(raw)}% — ${fmtUSD(progressCents)} / ${fmtUSD(targetCents)}`}
        className="goal-track"
      >
        <div className="goal-fill" data-done={pct >= 100} style={{ width: `${knob}%` }} />
        <div className="goal-knob" style={{ left: `${knob}%` }} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        <span className="num text-sm font-bold">
          {t("goal.of", { p: fmtUSD(progressCents), t: fmtUSD(targetCents) })}
        </span>
      </div>
    </div>
  );
}

/* ───────── ActivityList grouped Hoy / Ayer / Antes ───────── */
export interface ActivityItem {
  id: string;
  title: string;
  /** ISO date */
  at: string;
  amountCents: number;
  status: OrderStatus;
  avatar?: StickerId;
  href?: string;
}
const ST: Record<OrderStatus, { icon: "check" | "clock" | "x" | "ban" | "plus"; cls: string; key: Key }> = {
  completed: { icon: "check", cls: "st-ok", key: "status.verified" },
  pending: { icon: "clock", cls: "st-pend", key: "status.pending" },
  approved: { icon: "clock", cls: "st-pend", key: "status.approved" },
  created: { icon: "plus", cls: "st-neu", key: "status.created" },
  cancelled: { icon: "ban", cls: "st-neu", key: "status.cancelled" },
  failed: { icon: "x", cls: "st-bad", key: "status.failed" },
};
function dayKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function ActivityList({ items, empty }: { items: ActivityItem[]; empty?: ReactNode }) {
  const { lang, t } = useI18n();
  const [now] = useState(() => new Date());
  if (items.length === 0) return <>{empty ?? <p className="text-ink-soft">{t("act.empty")}</p>}</>;
  const today = dayKey(now);
  const groups: { key: Key; items: ActivityItem[] }[] = [
    { key: "act.today", items: [] },
    { key: "act.yesterday", items: [] },
    { key: "act.earlier", items: [] },
  ];
  for (const it of items) {
    const diff = Math.round((today - dayKey(new Date(it.at))) / 86400000);
    (diff <= 0 ? groups[0] : diff === 1 ? groups[1] : groups[2]).items.push(it);
  }
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-EC" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div>
      {groups.filter((g) => g.items.length).map((g) => (
        <section key={g.key} aria-label={t(g.key)}>
          <h3 className="act-label">{t(g.key)}</h3>
          <ul className="m-0 list-none p-0">
            {g.items.map((it) => {
              const s = ST[it.status];
              const row = (
                <>
                  <span className="act-av">{it.avatar ? <Sticker id={it.avatar} size={34} /> : <Icon name="receipt" size={20} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{it.title}</span>
                    <time dateTime={it.at} suppressHydrationWarning className="block text-sm text-ink-soft">{fmt.format(new Date(it.at))}</time>
                  </span>
                  <span className="text-right">
                    <span className="num block font-bold">{fmtUSD(it.amountCents)}</span>
                    <span className={`status-txt ${s.cls}`}><Icon name={s.icon} size={13} />{t(s.key)}</span>
                  </span>
                </>
              );
              return (
                <li key={it.id}>
                  {it.href ? <Link href={it.href} className="act-row">{row}</Link> : <div className="act-row">{row}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ───────── Region landscapes (flat SVG scenes) ───────── */
export function RegionLandscape({ regionId, className = "" }: { regionId: RegionId; className?: string }) {
  return (
    <svg viewBox="0 0 340 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className} style={{ display: "block", width: "100%", height: "100%" }}>
      {regionId === "galapagos" && (
        <g>
          <rect width="340" height="120" fill="#bfe6df" />
          <circle cx="262" cy="34" r="15" fill="#f6b21b" />
          <rect y="70" width="340" height="50" fill="#1a9e8f" />
          <path d="M0 76 Q30 70 60 76 T120 76 T180 76 T240 76 T300 76 T360 76 V84 H0Z" fill="#5cc4b6" />
          <path d="M20 74 L50 52 L72 58 L96 44 L128 74Z" fill="#3b4a58" />
          <path d="M96 44 L108 52 L102 58Z" fill="#c8553d" opacity=".0" />
          <path d="M200 74 L222 60 L246 66 L270 74Z" fill="#4a5a68" />
          <ellipse cx="150" cy="94" rx="22" ry="8" fill="#2f7d5f" /><circle cx="168" cy="90" r="5" fill="#2f7d5f" />
        </g>
      )}
      {regionId === "sierra" && (
        <g>
          <rect width="340" height="120" fill="#ffd6c9" />
          <circle cx="60" cy="30" r="14" fill="#fff" opacity=".7" />
          <path d="M130 100 L196 22 Q206 12 216 22 L282 100Z" fill="#5a6b7d" />
          <path d="M184 36 L196 22 Q206 12 216 22 L228 36 L220 32 L212 42 L206 32 L198 42 L192 34Z" fill="#fff" />
          <circle cx="206" cy="8" r="6" fill="#fff" opacity=".7" />
          <path d="M0 88 Q70 60 140 92 T340 84 V120 H0Z" fill="#4d9a5a" />
          <path d="M0 104 Q90 84 180 106 T340 100 V120 H0Z" fill="#3a7d47" />
        </g>
      )}
      {regionId === "costa" && (
        <g>
          <rect width="340" height="120" fill="#fde7a8" />
          <circle cx="70" cy="34" r="16" fill="#f6b21b" />
          <rect y="66" width="340" height="30" fill="#1a9e8f" opacity=".85" />
          <path d="M0 92 Q80 82 170 94 T340 90 V120 H0Z" fill="#e9c27a" />
          <g stroke="#8a5a3b" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M240 108 Q246 80 252 56" /><path d="M290 110 Q284 86 280 64" /></g>
          <g fill="#2f8f5b"><path d="M252 56 C238 42 222 46 214 56 C228 52 240 52 252 56Z" /><path d="M252 56 C264 42 280 46 288 56 C274 52 262 52 252 56Z" /><path d="M252 56 C250 44 254 36 262 32 C262 42 260 50 252 56Z" /><path d="M280 64 C268 52 254 56 248 66 C260 62 270 62 280 64Z" /><path d="M280 64 C292 52 306 56 312 66 C300 62 290 62 280 64Z" /></g>
        </g>
      )}
    </svg>
  );
}

/* ───────── Pocket + PassportCard (peeking out; NOT a payment card) ───────── */
export interface PassportInfo {
  alias: string;
  regionId: RegionId;
  regionLabel: string;
  avatar: StickerId;
}

export function PassportCard({ alias, regionId, regionLabel, avatar }: PassportInfo) {
  const { t } = useI18n();
  return (
    <div className="relative h-[176px] overflow-hidden rounded-[22px] border border-white/60 bg-[#fffdf7] shadow-lg">
      <div className="absolute inset-0"><RegionLandscape regionId={regionId} /></div>
      <div className="absolute right-3 top-2.5 rounded-full bg-[#0b1b3f]/85 px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-widest text-white">{t("pocket.title")}</div>
      <div className="absolute left-3 top-2.5"><Sticker id={avatar} size={56} tilt={-5} /></div>
      <div className="absolute left-[76px] top-[58px] max-w-[55%] rounded-xl bg-[#0b1b3f]/88 px-2.5 py-1 text-white">
        <div className="truncate text-sm font-extrabold leading-tight">{alias}</div>
        <div className="truncate text-[0.7rem] font-semibold leading-tight text-white/85">{regionLabel}</div>
      </div>
    </div>
  );
}

/** Stitched navy pocket; the passport peeks out of it. `children` render inside the pocket's front. */
export function Pocket({ passport, children, href }: { passport: PassportInfo; children?: ReactNode; href?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const outer = "M0 24 Q0 0 24 0 H112 C138 0 142 30 170 30 C198 30 202 0 228 0 H316 Q340 0 340 24 V88 Q340 112 316 112 H24 Q0 112 0 88Z";
  const inner = "M10 26 Q10 10 26 10 H116 C142 10 148 40 170 40 C192 40 198 10 224 10 H314 Q330 10 330 26 V86 Q330 102 314 102 H26 Q10 102 10 86Z";
  const card = (
    <div className="relative mx-auto w-full max-w-[30rem]">
      <div className="mx-[5%]"><PassportCard {...passport} /></div>
      <div className="relative -mt-[64px]">
        <svg viewBox="0 0 340 112" className="block w-full drop-shadow-[0_10px_16px_rgba(0,10,50,.35)]" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`lea${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2d5c" /><stop offset="1" stopColor="#0b1b3f" /></linearGradient>
            <filter id={`grain${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n" />
              <feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .14 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
          <path d={outer} fill={`url(#lea${uid})`} />
          <path d={outer} fill="#fff" filter={`url(#grain${uid})`} />
          <path d={inner} fill="none" stroke="#8fb0ff" strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="5 4" strokeLinecap="round" />
          <circle cx="22" cy="24" r="3" fill="#0a1634" /><circle cx="318" cy="24" r="3" fill="#0a1634" />
        </svg>
        {children && <div className="absolute inset-x-0 bottom-0 px-8 pb-8 text-white">{children}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block rounded-3xl" aria-label={`${passport.alias} · ${passport.regionLabel}`}>{card}</Link> : card;
}
