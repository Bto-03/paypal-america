"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderDTO } from "@/server/contract";
import { ApiError, cancel, capture, fmtUSD, getOrder } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Msg, btnPrimary, btnSecondary } from "@/components/ui";

type State = { kind: "loading" } | { kind: "order"; order: OrderDTO } | { kind: "error"; message: string; code: string };

function Result() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token");
  const cancelled = params.get("cancelled") === "1";
  const [state, setState] = useState<State>({ kind: "loading" });
  const started = useRef(false);

  const fail = useCallback(
    (e: unknown): State =>
      e instanceof ApiError
        ? { kind: "error", message: e.code === "network" ? t("error.network") : e.message, code: e.code }
        : { kind: "error", message: t("error.generic"), code: "internal" },
    [t],
  );

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    (cancelled ? cancel(token) : capture(token))
      .then((order) => setState({ kind: "order", order }))
      .catch((e) => setState(fail(e)));
  }, [token, cancelled, fail]);

  const [checking, setChecking] = useState(false);
  async function again() {
    if (!token || checking) return;
    setChecking(true);
    try {
      setState({ kind: "order", order: await getOrder(token) });
    } catch (e) {
      setState(fail(e));
    } finally {
      setChecking(false);
    }
  }

  const back = (
    <Link href="/" className={`${btnPrimary} mt-4`}>
      {t("result.back")}
    </Link>
  );

  if (!token) return <Msg tone="error">{t("result.noToken")}</Msg>;
  if (state.kind === "loading") return <Msg>{t("result.loading")}</Msg>;

  if (state.kind === "error") {
    return (
      <Card>
        <h2 className="text-2xl font-bold">{state.code === "verification_failed" ? t("result.failed") : t("error.generic")}</h2>
        <div className="mt-3"><Msg tone="error">{state.message}</Msg></div>
        <div className="flex flex-wrap gap-3">
          <button className={`${btnSecondary} mt-4`} disabled={checking} onClick={again}>{t("result.checkAgain")}</button>
          {back}
        </div>
      </Card>
    );
  }

  const o = state.order;
  return (
    <Card>
      {o.status === "completed" && (
        <>
          <h2 className="text-2xl font-bold text-green-800">✓ {t("result.completed")}</h2>
          <dl className="mt-3 grid gap-1">
            <div className="flex justify-between"><dt>{t("result.amount")}</dt><dd className="font-bold tabular-nums">{fmtUSD(o.amountCents)}</dd></div>
            <div className="flex justify-between gap-4"><dt>{t("result.captureId")}</dt><dd className="break-all font-mono text-base">{o.captureId}</dd></div>
          </dl>
          {o.purpose === "sale" ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-xl font-bold text-amber-900">{t("result.mango")}</p>
          ) : (
            <p className="mt-4 text-slate-700">{t("result.donationNote")}</p>
          )}
        </>
      )}
      {(o.status === "pending" || o.status === "created" || o.status === "approved") && (
        <>
          <h2 className="text-2xl font-bold">{t("result.pending")}</h2>
          <p className="mt-2">{o.status === "pending" ? t("result.pendingText") : t("result.notYet")}</p>
          <button className={`${btnSecondary} mt-4`} disabled={checking} onClick={again}>{t("result.checkAgain")}</button>
        </>
      )}
      {o.status === "failed" && (
        <>
          <h2 className="text-2xl font-bold text-red-800">{t("result.failed")}</h2>
          <p className="mt-2">{t("result.failedText")}</p>
        </>
      )}
      {o.status === "cancelled" && (
        <>
          <h2 className="text-2xl font-bold">{t("result.cancelled")}</h2>
          <p className="mt-2">{t("result.cancelledText")}</p>
        </>
      )}
      {o.status !== "pending" && back}
    </Card>
  );
}

export default function Page() {
  const { t } = useI18n();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-extrabold text-[#003087]">{t("result.title")}</h1>
      <Suspense fallback={<Msg>{t("loading")}</Msg>}>
        <Result />
      </Suspense>
    </div>
  );
}
