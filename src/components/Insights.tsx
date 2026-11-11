"use client";
import { useEffect, useState } from "react";
import type { InsightsDTO } from "@/server/contract";
import { getInsights } from "@/lib/api";
import { useI18n, type Key } from "@/lib/i18n";
import { Badge, Card, Msg } from "./ui";

// `refreshKey` changes when dashboard numbers change so insights are refetched.
export default function Insights({ refreshKey }: { refreshKey: string }) {
  const { lang, t } = useI18n();
  const [res, setRes] = useState<{ key: string; data: InsightsDTO | null } | null>(null);
  const key = `${lang}|${refreshKey}`;

  useEffect(() => {
    let alive = true;
    getInsights(lang)
      .then((d) => alive && setRes({ key, data: d }))
      .catch(() => alive && setRes({ key, data: null }));
    return () => {
      alive = false;
    };
  }, [key, lang]);

  const cur = res && res.key === key ? res : null;
  const d = cur?.data ?? null;
  const evidence = new Map((d?.evidence ?? []).map((e) => [e.id, e]));

  return (
    <Card>
      <h2 className="text-2xl font-bold">{t("ai.title")}</h2>
      <p className="mb-3 text-base text-slate-700">{t("ai.sub")}</p>
      {!cur && <Msg>{t("ai.loading")}</Msg>}
      {cur && !d && <Msg>{t("ai.unavailable")}</Msg>}
      {d?.aiStatus === "unavailable" && <Msg>{t("ai.unavailable")}</Msg>}
      {d?.aiStatus === "no_data" && <Msg>{t("ai.noData")}</Msg>}
      {d?.aiStatus === "ok" && (
        <ul className="grid gap-3">
          {d.insights.map((i, idx) => (
            <li key={idx} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-lg">{i.text}</p>
              {i.assumptions.length > 0 && (
                <p className="mt-1 text-base text-slate-700">
                  {t("ai.assumptions")}: {i.assumptions.join("; ")}
                </p>
              )}
              <details className="mt-2">
                <summary className="min-h-10 cursor-pointer py-2 font-semibold text-[#003087] focus-visible:outline-3 focus-visible:outline-[#003087]">
                  {t("ai.evidence")} ({i.evidenceIds.length})
                </summary>
                <ul className="grid gap-1">
                  {i.evidenceIds.map((id) => {
                    const e = evidence.get(id);
                    if (!e) return null;
                    return (
                      <li key={id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-200 pt-1">
                        <span>
                          {e.label} <Badge>{t(`src.${e.source}` as Key)}</Badge>
                        </span>
                        <span className="font-bold tabular-nums">{e.value}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
