"use client";
import { useState } from "react";
import type { DashboardDTO, RegionId } from "@/server/contract";
import { ApiError, patchProfile } from "@/lib/api";
import { useI18n, type Key } from "@/lib/i18n";
import { btnSecondary, field, Card, Msg } from "./ui";

export default function ProfileForm({ data, onChange }: { data: DashboardDTO; onChange: (d: DashboardDTO) => void }) {
  const { t } = useI18n();
  const [alias, setAlias] = useState(data.profile.alias);
  const [goal, setGoal] = useState((data.goal.targetCents / 100).toFixed(2));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(p: Parameters<typeof patchProfile>[0]) {
    setBusy(true);
    setMsg(null);
    try {
      onChange(await patchProfile(p));
      setMsg({ ok: true, text: t("profile.saved") });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : t("error.generic") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const cents = Math.round(Number(goal.replace(",", ".")) * 100);
          void save({ alias: alias.trim(), goalCents: cents });
        }}
      >
        <label className="grid gap-1 font-semibold">
          {t("profile.alias")}
          <input className={field} value={alias} maxLength={40} required onChange={(e) => setAlias(e.target.value)} />
        </label>
        <label className="grid gap-1 font-semibold">
          {t("profile.region")}
          <select
            className={field}
            value={data.profile.regionId}
            disabled={busy}
            onChange={(e) => void save({ regionId: e.target.value as RegionId })}
          >
            {data.places.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`region.${p.id}` as Key)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-semibold">
          {t("profile.goal")}
          <input className={field} inputMode="decimal" value={goal} required onChange={(e) => setGoal(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className={`${btnSecondary} w-full`}>
            {t("profile.save")}
          </button>
        </div>
        {msg && (
          <div className="sm:col-span-2">
            <Msg tone={msg.ok ? "info" : "error"}>{msg.text}</Msg>
          </div>
        )}
      </form>
    </Card>
  );
}
