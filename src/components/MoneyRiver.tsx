"use client";
import { useEffect, useId, useRef, useState } from "react";
import { fmtUSD } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Chip, Icon } from "./ui";

export interface MoneyRiverProps {
  grossCents: number;
  /** PayPal fee observed in sandbox; null when PayPal did not report it. Shown as a reference ribbon (same money as the estimate, never added). */
  observedFeeCents: number | null;
  /** Ecuador estimate fee */
  estimateFeeCents: number;
  /** What the seller keeps (Ecuador estimate net) */
  keepCents: number;
  /** Optional label overrides (otherwise localized defaults) */
  labels?: Partial<{ gross: string; observed: string; estimate: string; keep: string; notReported: string; note: string }>;
  className?: string;
}

const W = 140;
const BAND_W = 72;
const ROW = 88;

function ribbon(x0: number, y0: number, h0: number, x1: number, y1: number, h1: number) {
  const mx = (x0 + x1) / 2;
  return `M${x0} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}V${y1 + h1}C${mx} ${y1 + h1} ${mx} ${y0 + h0} ${x0} ${y0 + h0}Z`;
}

/** Sankey-style ribbon: gross → { Ecuador fee estimate, you keep }, with the sandbox-observed fee as a dashed reference ribbon. */
export default function MoneyRiver({ grossCents, observedFeeCents, estimateFeeCents, keepCents, labels, className = "" }: MoneyRiverProps) {
  const { t } = useI18n();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  // "idle" = fully visible (SSR / no JS / already in view); "wait" = below the fold, hidden until scrolled in; "in" = play once.
  const [phase, setPhase] = useState<"idle" | "wait" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let io: IntersectionObserver | null = null;
    const raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 || typeof IntersectionObserver === "undefined") {
        setPhase("in");
        return;
      }
      setPhase("wait");
      io = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) {
            setPhase("in");
            io?.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      io.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, []);

  const L = {
    gross: labels?.gross ?? t("river.gross"),
    observed: labels?.observed ?? t("river.observed"),
    estimate: labels?.estimate ?? t("river.estimate"),
    keep: labels?.keep ?? t("river.keep"),
    notReported: labels?.notReported ?? t("river.notReported"),
  };

  const total = Math.max(1, grossCents);
  const H = 112; // band height for the gross
  const minH = 9;
  const feeH = Math.max(minH, (H * estimateFeeCents) / total);
  const keepH = Math.max(minH, H - feeH);
  const obsH = observedFeeCents === null ? minH : Math.max(minH, (H * observedFeeCents) / total);
  const bandTop = 52;
  const rowObsY = 0;
  const rowFeeY = ROW;
  const keepRowY = ROW * 2;
  const boxH = keepRowY + Math.max(keepH, ROW) + 12;

  const obsEnd = rowObsY + ROW / 2 - obsH / 2;
  const feeEnd = rowFeeY + ROW / 2 - feeH / 2;
  const keepEnd = keepRowY + Math.max(keepH, ROW) / 2 - keepH / 2;
  const toX = W;
  const fromX = BAND_W + 2;

  return (
    <div ref={ref} className={`${phase === "in" ? "river-in" : phase === "wait" ? "river-wait" : ""} ${className}`}>
      <figure className="m-0" aria-label={t("river.title")}>
        <div className="relative flex" style={{ height: boxH }}>
          <svg viewBox={`0 0 ${W} ${boxH}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ width: "calc(100% - 10.75rem)", height: boxH, flex: "none" }}>
            <defs>
              <linearGradient id={`g1${uid}`} x1="0" x2="1"><stop offset="0" stopColor="#0070e0" /><stop offset="1" stopColor="#f6b21b" /></linearGradient>
              <linearGradient id={`g2${uid}`} x1="0" x2="1"><stop offset="0" stopColor="#0070e0" /><stop offset="1" stopColor="#1a9e8f" /></linearGradient>
            </defs>
            <g className="river-band" style={{ animationDelay: "0ms" }}>
              <rect x="0" y={bandTop} width={BAND_W} height={H} fill="#0070e0" rx="3" />
            </g>
            {observedFeeCents !== null && (
              <path className="river-band" style={{ animationDelay: "500ms" }} d={ribbon(fromX, bandTop, obsH, toX, obsEnd, obsH)} fill="none" stroke="#0070e0" strokeWidth="1.4" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            )}
            <path className="river-band" style={{ animationDelay: "250ms" }} d={ribbon(fromX, bandTop, feeH, toX, feeEnd, feeH)} fill={`url(#g1${uid})`} opacity=".92" />
            <path className="river-band" style={{ animationDelay: "250ms" }} d={ribbon(fromX, bandTop + feeH, keepH, toX, keepEnd, keepH)} fill={`url(#g2${uid})`} opacity=".92" />
          </svg>
          {/* gross label over the band */}
          <div className="river-lbl absolute left-0 flex flex-col justify-center text-white" style={{ top: bandTop, height: H, width: "calc((100% - 10.75rem) * 0.5143)", paddingLeft: 8 }}>
            <span className="text-[0.68rem] font-extrabold uppercase tracking-wider opacity-90">{L.gross}</span>
            <span className="num text-[0.95rem] font-extrabold leading-tight tracking-tight">{fmtUSD(grossCents)}</span>
          </div>
          {/* right-hand labels */}
          <div className="absolute right-0" style={{ width: "10.25rem", top: 0, height: boxH }}>
            <div className="river-lbl absolute inset-x-0 flex flex-col justify-center" style={{ top: rowObsY, height: ROW, animationDelay: "700ms" }}>
              <div className="text-sm font-semibold leading-tight">{L.observed}</div>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="num font-bold">{observedFeeCents === null ? L.notReported : fmtUSD(observedFeeCents)}</span>
                <Chip tone="sbx" icon="flask">{t("src.sandbox_observed")}</Chip>
              </div>
            </div>
            <div className="river-lbl absolute inset-x-0 flex flex-col justify-center" style={{ top: rowFeeY, height: ROW, animationDelay: "800ms" }}>
              <div className="text-sm font-semibold leading-tight">{L.estimate}</div>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="num font-bold">{fmtUSD(estimateFeeCents)}</span>
                <Chip tone="est" icon="approx">{t("src.ec_estimate")}</Chip>
              </div>
            </div>
            <div className="river-lbl absolute inset-x-0 flex flex-col justify-center" style={{ top: keepRowY, height: Math.max(keepH, ROW), animationDelay: "900ms" }}>
              <div className="smallcaps !text-[0.7rem]">{L.keep}</div>
              <div className="num text-3xl font-extrabold leading-none tracking-tight">{fmtUSD(keepCents)}</div>
              <div className="mt-1"><Chip tone="est" icon="approx">{t("src.ec_estimate")}</Chip></div>
            </div>
          </div>
        </div>
        <figcaption className="mt-2 flex items-start gap-1.5 text-xs text-ink-faint">
          <Icon name="flask" size={13} className="mt-0.5 flex-none" />
          <span>{labels?.note ?? t("river.note")}</span>
        </figcaption>
      </figure>
    </div>
  );
}

export { MoneyRiver };
