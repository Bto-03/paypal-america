"use client";
import { useI18n } from "@/lib/i18n";
import { useDashboard } from "@/components/useDashboard";
import { Card, Msg, btnSecondary } from "@/components/ui";

export default function Pasaporte() {
  const { lang, t } = useI18n();
  const { data, error, reload } = useDashboard();
  if (error && !data)
    return (
      <div className="grid gap-4">
        <Msg tone="error">{error.code === "network" ? t("error.network") : error.message}</Msg>
        <button className={btnSecondary} onClick={reload}>{t("retry")}</button>
      </div>
    );
  if (!data) return <Msg>{t("loading")}</Msg>;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "es" ? "es-EC" : "en-US", { dateStyle: "medium" });
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-[#003087]">{t("pass.title")}</h1>
        <p className="text-slate-700">{t("pass.sub")}</p>
      </div>
      <Card>
        <h2 className="mb-2 text-2xl font-bold">{t("pass.stickers")}</h2>
        {data.stickers.length === 0 ? (
          <Msg>{t("pass.noStickers")}</Msg>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.stickers.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
                <span className="text-5xl" aria-hidden="true">🥭</span>
                <div>
                  <p className="text-xl font-bold">{t("pass.mango")} · {t("pass.firstSale")}</p>
                  <p>{s.placeLabel}</p>
                  <p className="text-base text-slate-700">{t("pass.declared")}</p>
                  <p className="text-base text-slate-700">{t("pass.earned", { d: fmtDate(s.earnedAt) })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 text-2xl font-bold">{t("pass.places")}</h2>
        <ul className="grid gap-2">
          {data.places.map((p) => {
            const earned = data.stickers.filter((s) => s.placeId === p.id).length;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-xl font-semibold">{p.label}</p>
                  <p className="text-base text-slate-700">{t("pass.declared")}</p>
                </div>
                <span className="text-2xl" aria-label={`${earned} ${t("pass.mango")}`}>
                  {earned > 0 ? "🥭".repeat(earned) : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
