"use client";
import type { StickerId } from "@/server/contract";
import { useI18n } from "@/lib/i18n";
import { Sticker } from "./stickers";

/** Oversized, bottom-cropped wordmark with three stickers "stuck" on it + the honest disclaimer. */
export default function Footer({ stickers = ["hummingbird", "golden_mango", "tortoise"] }: { stickers?: StickerId[] }) {
  const { t } = useI18n();
  const pos = [
    { left: "6%", top: "22%", tilt: -12, size: 84 },
    { left: "62%", top: "10%", tilt: 9, size: 96 },
    { left: "36%", top: "52%", tilt: -6, size: 76 },
  ];
  return (
    <footer className="foot bleed no-print">
      <div className="mx-auto max-w-3xl px-4">
        <p className="max-w-md text-sm font-medium text-white/85">{t("footer.disclaimer")}</p>
        <p className="mt-1 max-w-md text-sm text-white/70">{t("footer")}</p>
      </div>
      <div className="relative mx-auto max-w-[90rem] px-4">
        <div className="foot-mark" aria-hidden="true">
          <span>PayPal</span>
          <span>America</span>
        </div>
        {stickers.slice(0, 3).map((id, i) => (
          <span key={id} className="absolute" style={{ left: pos[i].left, top: pos[i].top }}>
            <Sticker id={id} size={pos[i].size} tilt={pos[i].tilt} touch />
          </span>
        ))}
      </div>
    </footer>
  );
}
