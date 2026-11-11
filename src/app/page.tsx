"use client";
import { useRef, useState } from "react";
import { ApiError, createOrder } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useDashboard } from "@/components/useDashboard";
import ProfileForm from "@/components/ProfileForm";
import MoneyCard from "@/components/MoneyCard";
import Insights from "@/components/Insights";
import { btnPrimary, btnSecondary, Card, Msg } from "@/components/ui";

export default function Home() {
  const { t } = useI18n();
  const { data, setData, error, reload } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lock = useRef(false);

  async function charge() {
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setErr(null);
    try {
      const o = await createOrder("sale");
      if (!o.approvalUrl) throw new ApiError("internal", t("error.generic"), 500);
      window.location.assign(o.approvalUrl);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("error.generic"));
      lock.current = false;
      setLoading(false);
    }
  }

  if (error && !data) {
    return (
      <div className="grid gap-4">
        <Msg tone="error">{error.code === "network" ? t("error.network") : error.message}</Msg>
        <button className={btnSecondary} onClick={reload}>{t("retry")}</button>
      </div>
    );
  }
  if (!data) return <Msg>{t("loading")}</Msg>;

  const refreshKey = `${data.sales.count}|${data.goal.targetCents}|${data.profile.regionId}|${data.sales.grossCents}`;
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-[#003087]">
          {t("home.title")} — {data.profile.alias}
        </h1>
        <p className="text-slate-700">{t("home.sub")}</p>
      </div>
      <ProfileForm data={data} onChange={setData} />
      <MoneyCard data={data} />
      <Card>
        <button className={`${btnPrimary} w-full text-xl`} disabled={loading} onClick={charge}>
          {loading ? t("sale.loading") : t("sale.button")}
        </button>
        <p className="mt-2 text-base text-slate-700">{t("sale.hint")}</p>
        {err && <div className="mt-3"><Msg tone="error">{err}</Msg></div>}
      </Card>
      <Insights refreshKey={refreshKey} />
    </div>
  );
}
