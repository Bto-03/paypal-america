"use client";
import { useEffect, useRef, useState } from "react";
import type { CauseDTO, RegionId } from "@/server/contract";
import { ApiError, createOrder, getCauses } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useDashboard } from "@/components/useDashboard";
import { Badge, Card, Msg, btnPrimary, btnSecondary } from "@/components/ui";

export default function Apoyar() {
  const { t } = useI18n();
  const { data, error, reload } = useDashboard();
  const region: RegionId | null = data?.profile.regionId ?? null;
  const [causes, setCauses] = useState<CauseDTO[] | null>(null);
  const [cErr, setCErr] = useState<string | null>(null);
  const [pick, setPick] = useState<CauseDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!region) return;
    let alive = true;
    getCauses(region)
      .then((c) => alive && setCauses(c))
      .catch((e: ApiError) => alive && setCErr(e.message));
    return () => {
      alive = false;
    };
  }, [region]);

  async function confirm() {
    if (!pick || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const o = await createOrder("donation_demo", pick.id);
      if (!o.approvalUrl) throw new ApiError("internal", t("error.generic"), 500);
      window.location.assign(o.approvalUrl);
    } catch (e) {
      setCErr(e instanceof ApiError ? e.message : t("error.generic"));
      setPick(null);
      lock.current = false;
      setBusy(false);
    }
  }

  if (error && !data)
    return (
      <div className="grid gap-4">
        <Msg tone="error">{error.code === "network" ? t("error.network") : error.message}</Msg>
        <button className={btnSecondary} onClick={reload}>{t("retry")}</button>
      </div>
    );
  if (!data || (!causes && !cErr)) return <Msg>{t("loading")}</Msg>;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-[#003087]">{t("support.title")}</h1>
        <p className="text-slate-700">{t("support.sub")}</p>
      </div>
      <Msg>{t("support.note")}</Msg>
      {cErr && <Msg tone="error">{cErr}</Msg>}
      <ul className="grid gap-4">
        {(causes ?? []).map((c) => (
          <li key={c.id}>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{c.name}</h2>
                <Badge tone="amber">{t("support.demo")}</Badge>
                {c.regionId === region && <Badge>{t("support.yours")}</Badge>}
              </div>
              <p className="mt-2">{c.description}</p>
              <button className={`${btnPrimary} mt-4 w-full sm:w-auto`} onClick={() => setPick(c)}>
                {t("support.button")}
              </button>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-base text-slate-700">{t("support.donations", { n: data.donations.count })}</p>

      {pick && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          onKeyDown={(e) => e.key === "Escape" && !busy && setPick(null)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="dlg-title" className="text-2xl font-bold">{t("support.confirmTitle")}</h2>
            <p className="mt-2">{t("support.confirmText", { c: pick.name })}</p>
            <div className="mt-5 grid gap-3">
              <button autoFocus className={btnPrimary} disabled={busy} onClick={confirm}>
                {busy ? t("support.sending") : t("support.confirm")}
              </button>
              <button className={btnSecondary} disabled={busy} onClick={() => setPick(null)}>
                {t("support.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
