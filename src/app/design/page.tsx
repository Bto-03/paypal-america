"use client";
import { useState, type ReactNode } from "react";
import type { CheckDTO, OrderEventDTO, OrderStatus, ReceiptDTO, RegionId } from "@/server/contract";
import { setBackgroundRegion, useBackgroundRegion } from "@/components/Background";
import { ActivityList, BentoCard, GlassOnBlue, GoalBar, Hero, PageSheet, Pocket, type ActivityItem } from "@/components/Home";
import MoneyRiver from "@/components/MoneyRiver";
import Receipt from "@/components/Receipt";
import Timeline from "@/components/Timeline";
import { STICKER_IDS, STICKER_LABELS, Sticker } from "@/components/stickers";
import {
  Badge, Button, Card, Chip, EmptyState, HoldButton, Icon, IconButton, Money, ProgressRing, Sheet, Skeleton, SourceChip, StatusPill,
} from "@/components/ui";
import { useI18n } from "@/lib/i18n";

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

const EVENTS: OrderEventDTO[] = [
  { type: "created", at: "2026-11-11T14:02:10Z", detail: null },
  { type: "approved", at: "2026-11-11T14:02:41Z", detail: null },
  { type: "captured", at: "2026-11-11T14:02:43Z", detail: "capture 8TX19302AB4472113" },
  { type: "verified", at: "2026-11-11T14:02:44Z", detail: null },
  { type: "sticker_awarded", at: "2026-11-11T14:02:44Z", detail: "golden_mango" },
];
const CHECKS: CheckDTO[] = [
  { name: "status", ok: true }, { name: "amount", ok: true }, { name: "currency", ok: true }, { name: "payee", ok: true }, { name: "session", ok: true },
];
const SAMPLE: ReceiptDTO = {
  receiptNo: "PA-2026-0007",
  order: { id: "5O190127TN364715T", purpose: "sale", status: "completed", amountCents: 20000, currency: "USD", causeId: null, captureId: "8TX19302AB4472113", approvalUrl: null, createdAt: "2026-11-11T14:02:10Z", updatedAt: "2026-11-11T14:02:44Z" },
  seller: { alias: "Marisol · Artesanías", regionId: "sierra", avatar: "llama", receiptNote: "¡Gracias por apoyar lo hecho en Ecuador!", regionLabel: "Sierra" },
  lines: { grossCents: 20000, feeObservedCents: 1110, netObservedCents: 18890, feeEcCents: 1110, netEcCents: 18890 },
  events: EVENTS,
  checks: CHECKS,
  sticker: { id: "stk1", kind: "golden_mango", placeId: "sierra", placeLabel: "Sierra", milestone: "first_sale", origin: "declared_unverified", earnedAt: "2026-11-11T14:02:44Z" },
  cause: null,
};

const SWATCHES: { name: string; hex: string; text: string }[] = [
  { name: "PayPal deep", hex: "#003087", text: "#fff" },
  { name: "PayPal navy", hex: "#142C8E", text: "#fff" },
  { name: "Action blue", hex: "#0070E0", text: "#fff" },
  { name: "Dock navy", hex: "#0B1B3F", text: "#fff" },
  { name: "Mango", hex: "#F6B21B", text: "#0B1B3F" },
  { name: "Terracotta", hex: "#C8553D", text: "#fff" },
  { name: "Galápagos teal", hex: "#1A9E8F", text: "#fff" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 border-b border-line pb-2 text-lg font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const { lang, t } = useI18n();
  const region = useBackgroundRegion();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const es = lang === "es";

  const activity: ActivityItem[] = [
    { id: "a", title: es ? "Venta de prueba" : "Test sale", at: iso(30), amountCents: 20000, status: "completed", avatar: "golden_mango", href: "/design#receipt" },
    { id: "b", title: es ? "Venta de prueba" : "Test sale", at: iso(60 * 30), amountCents: 20000, status: "pending", href: "/design#receipt" },
    { id: "c", title: es ? "Aporte demo · Mar limpio" : "Demo contribution · Clean sea", at: iso(60 * 24 * 6), amountCents: 100, status: "failed", href: "/design#receipt" },
  ];

  function confirm() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1800);
  }

  return (
    <>
      {/* ───── Sample Inicio ───── */}
      <Hero regionId={region}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sticker id="llama" size={52} touch />
            <div>
              <div className="smallcaps">{es ? "Hola" : "Hi"}</div>
              <div className="text-xl font-extrabold leading-tight">Marisol</div>
            </div>
          </div>
          <IconButton label={t("help")}><Icon name="help" size={20} /></IconButton>
        </div>

        <div className="mt-8">
          <div className="smallcaps mb-2">{es ? "Neto estimado · este período" : "Estimated net · this period"}</div>
          <Money cents={18890} size="display" onDark />
          <div className="mt-3"><SourceChip source="ec_estimate" /></div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <GlassOnBlue>
            <div className="smallcaps">{t("river.gross")}</div>
            <div className="num text-xl font-extrabold">$200.00</div>
          </GlassOnBlue>
          <GlassOnBlue>
            <div className="smallcaps">{t("money.estFee")}</div>
            <div className="num text-xl font-extrabold">$11.10</div>
          </GlassOnBlue>
        </div>

        <div className="mt-6 grid gap-3">
          <HoldButton tone="dark" loading={loading} onConfirm={confirm}>{t("sale.button")}</HoldButton>
          <a href="#receipt" className="btn mx-auto min-h-11 text-white underline underline-offset-4">{es ? "Ver recibos" : "See receipts"}</a>
        </div>
      </Hero>

      <PageSheet>
        <Pocket passport={{ alias: "Marisol · Artesanías", regionId: region, regionLabel: t(`region.${region}`), avatar: "llama" }} href="/pasaporte"><div className="flex items-center justify-between font-bold"><span>{t("nav.passport")} · 3 stickers</span><Icon name="arrow" size={20} /></div></Pocket>

        <div className="tile mt-6 p-4">
          <GoalBar progressCents={18890} targetCents={30000} label={t("goal.title")} />
        </div>

        <div className="tile mt-4 p-4 reveal">
          <h2 className="mb-3 text-lg font-extrabold">{t("river.title")}</h2>
          <MoneyRiver grossCents={20000} observedFeeCents={1110} estimateFeeCents={1110} keepCents={18890} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 reveal">
          <BentoCard title={t("nav.passport")} value={es ? "3 stickers" : "3 stickers"} hint={t("pass.declared")} icon={<Icon name="book" size={20} />} href="/pasaporte" />
          <BentoCard title={t("nav.support")} value="DEMO" hint={t("support.sub")} tone="mango" icon={<Icon name="heart" size={20} />} href="/apoyar" />
        </div>

        <div className="mt-6 reveal">
          <h2 className="text-lg font-extrabold">{es ? "Actividad reciente" : "Recent activity"}</h2>
          <ActivityList items={activity} />
        </div>

        {/* ───── Style guide ───── */}
        <div className="mt-12 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">
          Style guide · <code>/design</code>
        </div>

        <Section title="Colors">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SWATCHES.map((s) => (
              <div key={s.hex} className="rounded-2xl p-3 text-sm font-bold" style={{ background: s.hex, color: s.text }}>
                {s.name}<div className="font-mono text-xs font-medium opacity-90">{s.hex}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">Warm accents only on stickers, progress, active tab and celebration — never on money values.</p>
        </Section>

        <Section title="Background region (Andes contours)">
          <div className="flex flex-wrap gap-2">
            {(["galapagos", "sierra", "costa"] as RegionId[]).map((r) => (
              <Button key={r} variant={r === region ? "primary" : "secondary"} onClick={() => setBackgroundRegion(r)}>{t(`region.${r}`)}</Button>
            ))}
          </div>
        </Section>

        <Section title="Type & money">
          <p className="text-4xl font-extrabold tracking-tight">Figtree · {es ? "claro y cálido" : "clear and warm"}</p>
          <p className="mt-2 text-ink-soft">{es ? "Texto de cuerpo 17px, interlineado 1.5, contraste ≥ 4.5:1." : "Body text 17px, line height 1.5, contrast ≥ 4.5:1."}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Money cents={20000} size="xl" chip="sandbox_observed" label={t("money.gross")} />
            <Money cents={18890} size="lg" chip="ec_estimate" label={t("money.estNet")} />
            <Money cents={1110} size="md" chip="computed" label={t("money.estFee")} />
            <Money cents={30000} size="md" chip="declared" label={t("profile.goal")} />
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="quiet">Quiet</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <IconButton tone="light" label={t("help")}><Icon name="help" size={20} /></IconButton>
            <IconButton tone="light" label={t("lang.toggle")}><span aria-hidden="true">EN</span></IconButton>
          </div>
          <div className="mt-4 max-w-sm"><HoldButton tone="blue" onConfirm={() => {}}>{t("sale.button")}</HoldButton></div>
          <p className="mt-2 text-sm text-ink-soft">Hold ≈700 ms (pointer, Enter or Space). A short tap only shows the hint.</p>
        </Section>

        <Section title="Chips & status">
          <div className="flex flex-wrap gap-2">
            <SourceChip source="sandbox_observed" /><SourceChip source="ec_estimate" /><SourceChip source="computed" /><SourceChip source="declared" />
            <Badge>{t("badge.sandbox")}</Badge><Chip tone="ok" icon="check">OK</Chip>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["created", "approved", "pending", "completed", "cancelled", "failed"] as OrderStatus[]).map((s) => <StatusPill key={s} status={s} />)}
          </div>
        </Section>

        <Section title="Progress ring & goal bar">
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing percent={63} ariaLabel={t("goal.title")} label="63%" sublabel="$188.90 / $300.00" />
            <ProgressRing percent={100} size={110} stroke={10} ariaLabel={t("goal.title")} label="100%" />
          </div>
          <div className="mt-5 grid gap-5">
            <GoalBar progressCents={5000} targetCents={30000} label={t("goal.title")} />
            <GoalBar progressCents={30000} targetCents={30000} label={t("goal.title")} />
          </div>
        </Section>

        <Section title="Stickers (earned · touch me · locked)">
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-6">
            {STICKER_IDS.map((id) => (
              <figure key={id} className="m-0 grid justify-items-center gap-1 text-center">
                <Sticker id={id} size={84} touch />
                <figcaption className="text-xs font-semibold">{STICKER_LABELS[id][lang]}</figcaption>
              </figure>
            ))}
          </div>
          <h3 className="smallcaps mt-6 mb-3">Locked</h3>
          <div className="flex flex-wrap gap-4 text-ink-faint">
            {STICKER_IDS.slice(0, 6).map((id) => <Sticker key={id} id={id} size={64} earned={false} />)}
          </div>
        </Section>

        <Section title="Money river">
          <Card variant="tile"><MoneyRiver grossCents={20000} observedFeeCents={null} estimateFeeCents={1110} keepCents={18890} /></Card>
        </Section>

        <Section title="Sheet / dialog, empty state, skeleton">
          <Button variant="secondary" onClick={() => setOpen(true)}>Open sheet</Button>
          <Sheet open={open} onClose={() => setOpen(false)} title={t("support.confirmTitle")}>
            <p className="mb-4 text-ink-soft">{t("support.note")}</p>
            <div className="flex gap-2"><Button onClick={() => setOpen(false)}>{t("support.confirm")}</Button><Button variant="quiet" onClick={() => setOpen(false)}>{t("support.cancel")}</Button></div>
          </Sheet>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <EmptyState icon={<Sticker id="mango" size={72} earned={false} />} title={t("pass.stickers")} text={t("pass.noStickers")} />
            <div className="tile grid content-start gap-3 p-4"><Skeleton className="h-10 w-1/2" /><Skeleton lines={3} /></div>
          </div>
        </Section>

        <Section title="Timeline">
          <Card variant="tile"><Timeline events={EVENTS} checks={CHECKS} /></Card>
        </Section>

        <Section title="Receipt">
          <div id="receipt" className="mx-auto max-w-md pt-2"><Receipt receipt={SAMPLE} url="https://example.test/recibo/PA-2026-0007" /></div>
        </Section>
      </PageSheet>
    </>
  );
}
