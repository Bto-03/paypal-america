"use client";
import type { CheckDTO, OrderEventDTO, OrderEventType } from "@/server/contract";
import { useI18n, type Key } from "@/lib/i18n";
import { Icon, type IconName } from "./ui";

const EV: Record<OrderEventType, { icon: IconName; bad?: boolean }> = {
  created: { icon: "plus" },
  approved: { icon: "check" },
  captured: { icon: "receipt" },
  pending: { icon: "clock" },
  verified: { icon: "check" },
  verification_failed: { icon: "x", bad: true },
  cancelled: { icon: "ban", bad: true },
  sticker_awarded: { icon: "stamp" },
};

export function formatWhen(iso: string, lang: "es" | "en") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "es" ? "es-EC" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
}

export interface TimelineProps {
  events: OrderEventDTO[];
  checks?: CheckDTO[];
  /** stagger the entrance (120ms per step). Disabled automatically by reduced motion. */
  animate?: boolean;
  className?: string;
}

export default function Timeline({ events, checks = [], animate = true, className = "" }: TimelineProps) {
  const { lang, t } = useI18n();
  const step = (i: number) => (animate ? { animationDelay: `${i * 120}ms` } : { animation: "none" });
  return (
    <div className={className}>
      <h3 className="smallcaps mb-3">{t("tl.title")}</h3>
      <ol className="m-0 list-none p-0">
        {events.map((e, i) => {
          const m = EV[e.type];
          const last = i === events.length - 1;
          const detail = e.detail && e.type !== "verified" && e.type !== "sticker_awarded" ? e.detail : null;
          return (
            <li key={`${e.type}-${i}`} className="tl-step relative flex gap-3 pb-4" style={step(i)}>
              {!last && <span aria-hidden="true" className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--line)]" />}
              <span className={`grid h-8 w-8 flex-none place-items-center rounded-full ${m.bad ? "chip-err" : e.type === "sticker_awarded" ? "bg-[#f6b21b] text-[#0b1b3f]" : "chip-sbx"}`} style={{ border: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}>
                <Icon name={m.icon} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{t(`tl.${e.type}` as Key)}</span>
                  <time dateTime={e.at} suppressHydrationWarning className="num text-sm text-ink-soft">{formatWhen(e.at, lang)}</time>
                </div>
                {detail && <div className="break-all font-mono text-xs text-ink-faint">{detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
      {checks.length > 0 && (
        <div className="mt-2 border-t border-[var(--line)] pt-3">
          <h3 className="smallcaps mb-2">{t("tl.checks")}</h3>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {checks.map((c, i) => (
              <li key={c.name} className="tl-step flex items-center gap-2" style={step(events.length + i)}>
                <Icon name={c.ok ? "check" : "x"} size={16} className={c.ok ? "st-ok" : "st-bad"} />
                <span className="flex-1">{t(`check.${c.name}` as Key)}</span>
                <span className={`status-txt ${c.ok ? "st-ok" : "st-bad"}`}>{c.ok ? t("check.ok") : t("check.fail")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { Timeline };
