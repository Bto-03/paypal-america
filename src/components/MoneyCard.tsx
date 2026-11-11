"use client";
import type { DashboardDTO } from "@/server/contract";
import { fmtUSD } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Badge, Card } from "./ui";

function Row({ label, value, badge, strong }: { label: string; value: string; badge?: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
      <dt className="text-slate-800">
        {label} {badge && <Badge>{badge}</Badge>}
      </dt>
      <dd className={`tabular-nums ${strong ? "text-2xl font-extrabold" : "text-xl font-semibold"}`}>{value}</dd>
    </div>
  );
}

export default function MoneyCard({ data }: { data: DashboardDTO }) {
  const { t } = useI18n();
  const { sales, goal } = data;
  const pct = Math.max(0, Math.min(100, goal.percent));
  return (
    <>
      <Card>
        <h2 className="text-2xl font-bold">{t("money.title")}</h2>
        <p className="text-slate-700">{t("money.count", { n: sales.count })}</p>
        <dl className="mt-3 divide-y divide-slate-200">
          <Row label={t("money.gross")} value={fmtUSD(sales.grossCents)} strong />
          <Row
            label={t("money.observed")}
            badge={t("src.sandbox_observed")}
            value={sales.observed ? fmtUSD(sales.observed.feeCents) : t("money.notReported")}
          />
          {sales.observed && (
            <Row label={t("money.observedNet")} badge={t("src.sandbox_observed")} value={fmtUSD(sales.observed.netCents)} />
          )}
          <Row label={t("money.estFee")} badge={t("money.estimate")} value={fmtUSD(sales.estimateEc.feeCents)} />
          <Row label={t("money.estNet")} badge={t("money.estimate")} value={fmtUSD(sales.estimateEc.netCents)} strong />
        </dl>
        <p className="mt-2 text-base text-slate-700">{sales.estimateEc.rule}</p>
        <h3 className="mt-5 text-xl font-bold">{t("money.withdrawal")}</h3>
        <dl className="divide-y divide-slate-200">
          <Row label={t("money.withdrawalFee")} badge={t("money.estimate")} value={fmtUSD(sales.withdrawal.feeCents)} />
          <Row label={t("money.withdrawalNet")} badge={t("money.estimate")} value={fmtUSD(sales.withdrawal.netCents)} />
        </dl>
        <p className="mt-2 text-base text-slate-700">{sales.withdrawal.rule}</p>
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">{t("goal.title")}</h2>
        <div className="mt-3 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={t("goal.title")}
            className="h-5 flex-1 overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full bg-[#0070e0]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-2xl font-extrabold tabular-nums">{goal.percent}%</span>
        </div>
        <p className="mt-2 text-base text-slate-700">
          {t("goal.basis", { p: fmtUSD(goal.progressCents), t: fmtUSD(goal.targetCents) })}
        </p>
      </Card>
    </>
  );
}
