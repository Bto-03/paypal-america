"use client";
import { useState, useSyncExternalStore } from "react";
import type { ReceiptDTO } from "@/server/contract";
import { fmtUSD } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Sticker } from "./stickers";
import Timeline, { formatWhen } from "./Timeline";
import { Button, Icon, Money, SourceChip, type SourceKind } from "./ui";

function Row({ label, cents, source, strong }: { label: string; cents: number | null; source?: SourceKind; strong?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className={`min-w-0 ${strong ? "font-bold" : "text-ink-soft"}`}>
        {label} {source && <SourceChip source={source} className="ml-1 align-middle" />}
      </dt>
      <dd className={`num m-0 shrink-0 ${strong ? "text-xl font-extrabold" : "font-semibold"}`}>{cents === null ? t("money.notReported") : fmtUSD(cents)}</dd>
    </div>
  );
}

const noop = () => () => {};
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

export interface ReceiptProps {
  receipt: ReceiptDTO;
  /** public URL to copy/share (defaults to the current page) */
  url?: string;
  /** slide-out-of-a-slot reveal on mount (default true) */
  reveal?: boolean;
  className?: string;
}

export default function Receipt({ receipt: r, url, reveal = true, className = "" }: ReceiptProps) {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const shareOk = useSyncExternalStore(noop, canShare, () => false);
  const href = () => url ?? window.location.href;
  const when = r.events[0]?.at ?? r.order.createdAt;
  const isDonation = r.order.purpose === "donation_demo";

  async function copy() {
    try {
      await navigator.clipboard.writeText(href());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }
  async function share() {
    try {
      await navigator.share({ title: t("receipt.shareTitle", { n: r.receiptNo }), url: href() });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className={className}>
      <div className="paper-slot no-print mx-auto" aria-hidden="true" style={{ width: "calc(100% + 8px)", marginLeft: -4 }} />
      <div className="paper-wrap -mt-2">
        <article aria-label={`${t("receipt.title")} ${r.receiptNo}`} className={`paper receipt-print relative px-6 pb-10 pt-8 ${reveal ? "receipt-out" : ""}`}>
          {/* header */}
          <header>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#53627e]">PayPal America · {t("receipt.title")}</div>
              <div className="num mt-0.5 whitespace-nowrap text-xl font-extrabold">{t("receipt.no")} {r.receiptNo}</div>
              <time dateTime={when} suppressHydrationWarning className="num text-sm text-[#364763]">{formatWhen(when, lang)}</time>
            </div>
          </header>

          {/* seller */}
          <section className="mt-5 flex items-center gap-4 border-y border-dashed border-[#0b1b33]/25 py-4" aria-label={t("receipt.seller")}>
            <Sticker id={r.seller.avatar} size={64} touch />
            <div className="min-w-0">
              <div className="smallcaps !text-[#53627e]">{t("receipt.seller")}</div>
              <div className="truncate text-xl font-extrabold leading-tight">{r.seller.alias}</div>
              <div className="text-sm text-[#364763]">{r.seller.regionLabel}</div>
            </div>
          </section>

          {/* note: the ONLY handwritten text */}
          {r.seller.receiptNote && (
            <figure className="m-0 mt-4 border-l-4 border-[#f6b21b] pl-3">
              <blockquote className="hand m-0">“{r.seller.receiptNote}”</blockquote>
              <figcaption className="sr-only">{t("receipt.note")}</figcaption>
            </figure>
          )}

          {/* amount */}
          <section className="mt-5">
            <div className="smallcaps !text-[#53627e]">{isDonation && r.cause ? t("receipt.donation", { c: r.cause.name }) : t("receipt.sale")}</div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
              <Money cents={r.lines.grossCents} size="xl" />
              <div className="stamp-sbx text-center leading-tight">{t("receipt.stamp")}</div>
            </div>
          </section>

          {/* breakdown */}
          <section className="mt-4" aria-label={t("receipt.breakdown")}>
            <h3 className="smallcaps !text-[#53627e]">{t("receipt.breakdown")}</h3>
            <dl className="m-0 divide-y divide-[#0b1b33]/10">
              <Row label={t("money.gross")} cents={r.lines.grossCents} />
              {!isDonation && (
                <>
                  <Row label={t("money.observed")} cents={r.lines.feeObservedCents} source="sandbox_observed" />
                  <Row label={t("money.observedNet")} cents={r.lines.netObservedCents} source="sandbox_observed" />
                  <Row label={t("money.estFee")} cents={r.lines.feeEcCents} source="ec_estimate" />
                  <Row label={t("money.estNet")} cents={r.lines.netEcCents} source="ec_estimate" strong />
                </>
              )}
            </dl>
          </section>

          <Timeline className="mt-6" events={r.events} checks={r.checks} animate={reveal} />

          {r.sticker && (
            <section className="mt-3 flex items-center gap-4 rounded-2xl border border-dashed border-[#0b1b33]/25 p-3">
              <Sticker id={r.sticker.kind} size={64} stamp={reveal} touch />
              <div>
                <div className="smallcaps !text-[#53627e]">{t("receipt.earned")}</div>
                <div className="font-bold">{r.sticker.placeLabel}</div>
                <time dateTime={r.sticker.earnedAt} suppressHydrationWarning className="num text-sm text-[#364763]">{formatWhen(r.sticker.earnedAt, lang)}</time>
              </div>
            </section>
          )}
        </article>
      </div>

      <div className="no-print mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => window.print()}><Icon name="print" size={18} />{t("receipt.print")}</Button>
        <Button variant="secondary" onClick={copy}><Icon name="copy" size={18} />{t("receipt.copy")}</Button>
        {shareOk && <Button variant="secondary" onClick={share}><Icon name="share" size={18} />{t("receipt.share")}</Button>}
        <span role="status" className="text-sm font-semibold">{copied ? t("receipt.copied") : ""}</span>
      </div>
    </div>
  );
}

export { Receipt };
