"use client";
import { useId, type ReactNode } from "react";
import type { StickerId } from "@/server/contract";
import { useI18n } from "@/lib/i18n";

export const STICKER_IDS: StickerId[] = [
  "tortoise", "booby", "sealion", "llama", "cotopaxi", "hummingbird", "mango", "crab", "palm", "golden_mango", "condor",
];

export const STICKER_LABELS: Record<StickerId, { en: string; es: string }> = {
  tortoise: { en: "Giant tortoise", es: "Tortuga gigante" },
  booby: { en: "Blue-footed booby", es: "Piquero de patas azules" },
  sealion: { en: "Sea lion", es: "Lobo marino" },
  llama: { en: "Llama", es: "Llama" },
  cotopaxi: { en: "Cotopaxi volcano", es: "Volcán Cotopaxi" },
  hummingbird: { en: "Hummingbird", es: "Colibrí" },
  mango: { en: "Mango", es: "Mango" },
  crab: { en: "Crab", es: "Cangrejo" },
  palm: { en: "Palm", es: "Palmera" },
  golden_mango: { en: "Golden mango", es: "Mango dorado" },
  condor: { en: "Condor", es: "Cóndor" },
};

const INK = "#12284c";
const DISC: Record<StickerId, string> = {
  tortoise: "#bfe6df", booby: "#bfe6df", sealion: "#bfe6df",
  llama: "#ffd6c9", cotopaxi: "#ffd6c9", hummingbird: "#ffd6c9",
  mango: "#fde7a8", crab: "#fde7a8", palm: "#fde7a8",
  golden_mango: "#ffeab0", condor: "#cfe0fb",
};
const DEFAULT_TILT: Record<StickerId, number> = {
  tortoise: -4, booby: 3, sealion: -3, llama: 4, cotopaxi: -2, hummingbird: 5, mango: -5, crab: 3, palm: -3, golden_mango: -3, condor: 2,
};

function Mango({ body, shade, leaf, stem = "#5b3a1e" }: { body: string; shade: string; leaf: string; stem?: string }) {
  return (
    <g>
      <path d="M50 24 C72 20 82 42 75 60 C68 78 46 86 32 72 C20 59 26 30 50 24Z" fill={body} />
      <path d="M64 32 C77 44 74 64 61 74 C68 60 70 46 64 32Z" fill={shade} />
      <path d="M38 40 C42 34 48 32 52 33" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M50 24 C49 19 51 15 55 12" stroke={stem} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M54 16 C60 6 74 6 80 12 C74 22 62 24 54 16Z" fill={leaf} />
      <path d="M58 16 C65 13 70 13 76 12" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" fill="none" />
    </g>
  );
}

const ART: Record<StickerId, () => ReactNode> = {
  tortoise: () => (
    <g>
      <rect x="26" y="64" width="12" height="12" rx="5" fill="#cdb87a" />
      <rect x="58" y="64" width="12" height="12" rx="5" fill="#cdb87a" />
      <path d="M72 60 C74 50 80 46 86 50 C90 54 88 62 80 64 Z" fill="#cdb87a" />
      <circle cx="83" cy="53" r="1.8" fill={INK} />
      <path d="M17 66 C16 40 32 26 50 26 C68 26 80 42 78 66 Z" fill="#2f7d5f" />
      <path d="M17 66 L78 66" stroke="#1f5a44" strokeWidth="3" />
      <path d="M50 27 L50 66 M34 34 L38 66 M66 34 L62 66 M21 48 L76 48" stroke="#1f5a44" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M38 38 C44 33 50 33 56 38" stroke="#6fbf9a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  ),
  booby: () => (
    <g>
      <path d="M33 72 L24 86 L36 84 L40 88 L44 72Z" fill="#1f7ae0" />
      <path d="M52 72 L48 88 L58 84 L64 88 L62 72Z" fill="#1f7ae0" />
      <path d="M30 58 C26 40 36 26 50 26 C62 26 68 40 64 58 C62 70 38 74 30 58Z" fill="#efe9d9" />
      <path d="M40 60 L30 82 L38 76 L46 70Z" fill="#7a5c44" />
      <path d="M34 42 C30 54 36 66 52 66 C60 56 60 44 50 36 C44 36 38 38 34 42Z" fill="#7a5c44" />
      <circle cx="54" cy="24" r="12" fill="#efe9d9" />
      <path d="M64 22 L86 27 L64 31Z" fill="#8aa4b8" />
      <circle cx="58" cy="22" r="3.4" fill="#f1c40f" />
      <circle cx="58.6" cy="22" r="1.7" fill={INK} />
    </g>
  ),
  sealion: () => (
    <g>
      <path d="M26 82 C20 62 32 46 42 40 C40 30 46 22 56 22 C64 22 68 30 64 38 C60 46 64 64 72 82Z" fill="#7a5642" />
      <ellipse cx="66" cy="32" rx="12" ry="8.5" fill="#7a5642" transform="rotate(8 66 32)" />
      <path d="M36 52 C28 54 22 62 24 72 C32 68 38 62 40 54Z" fill="#5a3d2d" />
      <circle cx="78" cy="31" r="2.4" fill={INK} />
      <circle cx="70" cy="26" r="1.8" fill={INK} />
      <path d="M72 34 L86 32 M72 36 L86 38" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="75" cy="12" r="7" fill="#c8553d" />
      <path d="M70 10 C73 8 77 8 80 10" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  ),
  llama: () => (
    <g>
      <rect x="28" y="66" width="7" height="18" rx="3" fill="#c79a68" />
      <rect x="39" y="68" width="7" height="16" rx="3" fill="#c79a68" />
      <rect x="55" y="68" width="7" height="16" rx="3" fill="#c79a68" />
      <rect x="65" y="66" width="7" height="18" rx="3" fill="#c79a68" />
      <path d="M58 58 C60 44 62 34 66 28 L74 30 C72 38 74 48 76 58Z" fill="#f3ead8" />
      <ellipse cx="46" cy="58" rx="26" ry="14" fill="#f3ead8" />
      <path d="M26 54 L66 54 L66 60 L26 60Z" fill="#c8553d" />
      <path d="M28 57 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3" stroke="#fde7a8" strokeWidth="1.6" fill="none" />
      <ellipse cx="69" cy="24" rx="10" ry="7.5" fill="#c79a68" transform="rotate(-12 69 24)" />
      <path d="M62 14 L64 24 L69 16Z M71 14 L72 22 L77 16Z" fill="#c79a68" />
      <circle cx="72" cy="22" r="1.7" fill={INK} />
      <circle cx="79" cy="27" r="1.4" fill={INK} />
    </g>
  ),
  cotopaxi: () => (
    <g>
      <circle cx="46" cy="14" r="6" fill="#e5ecf5" />
      <circle cx="56" cy="9" r="4.5" fill="#d3dded" />
      <path d="M12 76 L42 26 Q48 20 54 26 L84 76Z" fill="#5a6b7d" />
      <path d="M62 44 L84 76 L56 76 L58 56Z" fill="#46566a" />
      <path d="M36 38 L42 26 Q48 20 54 26 L60 38 L55 34 L51 41 L47 34 L43 41 L40 35Z" fill="#fff" />
      <path d="M14 66 Q48 52 82 66 A38 38 0 0 1 14 66Z" fill="#4d9a5a" />
      <path d="M14 66 Q48 52 82 66" stroke="#3a7d47" strokeWidth="2" fill="none" />
    </g>
  ),
  hummingbird: () => (
    <g>
      <path d="M52 44 C56 24 68 16 82 14 C80 30 68 42 56 50Z" fill="#7fd9cc" />
      <path d="M52 48 C62 34 76 32 86 36 C78 46 68 52 58 54Z" fill="#4fb8a8" />
      <path d="M62 62 L82 80 L70 82 L56 68Z" fill="#146f65" />
      <ellipse cx="50" cy="52" rx="17" ry="9.5" fill="#1a9e8f" transform="rotate(38 50 52)" />
      <circle cx="37" cy="39" r="9" fill="#1a9e8f" />
      <path d="M32 42 C34 49 40 49 42 44Z" fill="#c8553d" />
      <path d="M29 35 L9 22" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="35" cy="37" r="1.8" fill="#fff" />
      <circle cx="35.4" cy="37" r="0.9" fill={INK} />
      <g fill="#f6b21b">
        <circle cx="18" cy="70" r="4.2" /><circle cx="26" cy="66" r="4.2" /><circle cx="26" cy="75" r="4.2" /><circle cx="14" cy="62" r="4.2" />
      </g>
      <circle cx="21" cy="69" r="3" fill="#c8553d" />
    </g>
  ),
  mango: () => <Mango body="#f6a21b" shade="#e0791a" leaf="#2f8f5b" />,
  crab: () => (
    <g>
      <g stroke="#a23a28" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M30 62 L16 72 M32 68 L20 82 M38 72 L30 86 M66 62 L80 72 M64 68 L76 82 M58 72 L66 86" />
        <path d="M32 52 L22 38 M64 52 L74 38" />
      </g>
      <path d="M14 34 C8 22 20 12 28 20 L22 28 L30 32 C26 42 18 42 14 34Z" fill="#d9533a" />
      <path d="M82 34 C88 22 76 12 68 20 L74 28 L66 32 C70 42 78 42 82 34Z" fill="#d9533a" />
      <ellipse cx="48" cy="56" rx="23" ry="15" fill="#d9533a" />
      <path d="M32 54 C38 62 58 62 64 54" stroke="#a23a28" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M42 44 L40 36 M54 44 L56 36" stroke="#a23a28" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="40" cy="34" r="4.5" fill="#fff" /><circle cx="56" cy="34" r="4.5" fill="#fff" />
      <circle cx="40.6" cy="34.4" r="2" fill={INK} /><circle cx="55.4" cy="34.4" r="2" fill={INK} />
    </g>
  ),
  palm: () => (
    <g>
      <path d="M26 82 Q50 74 74 82 A38 38 0 0 1 26 82Z" fill="#e9c27a" />
      <path d="M48 80 C46 64 50 48 52 34" stroke="#8a5a3b" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <path d="M49 70 l5 -1 M48 60 l5 -1 M49 50 l4 -1" stroke="#6b4329" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M52 34 C42 16 22 16 12 28 C26 22 40 26 52 34Z" fill="#2f8f5b" />
      <path d="M52 34 C44 24 30 28 20 42 C34 36 44 36 52 34Z" fill="#256f48" />
      <path d="M52 34 C62 16 82 16 88 30 C74 22 62 26 52 34Z" fill="#2f8f5b" />
      <path d="M52 34 C60 24 74 28 80 44 C66 36 58 36 52 34Z" fill="#256f48" />
      <path d="M52 34 C46 20 50 10 58 6 C60 16 58 26 52 34Z" fill="#3fa86f" />
      <circle cx="49" cy="38" r="3.4" fill="#6b4329" /><circle cx="55" cy="39" r="3.4" fill="#6b4329" />
    </g>
  ),
  golden_mango: () => (
    <g>
      <circle cx="48" cy="48" r="33" fill="none" stroke="#c98a00" strokeWidth="1.6" strokeDasharray="2 4" strokeLinecap="round" />
      <Mango body="#f4bd1c" shade="#cf8f05" leaf="#2f8f5b" />
      <path d="M20 22 l2.4 6 l6 2.4 l-6 2.4 l-2.4 6 l-2.4 -6 l-6 -2.4 l6 -2.4Z" fill="#fff" />
      <path d="M78 54 l1.8 4.4 l4.4 1.8 l-4.4 1.8 l-1.8 4.4 l-1.8 -4.4 l-4.4 -1.8 l4.4 -1.8Z" fill="#fff" />
    </g>
  ),
  condor: () => (
    <g>
      <path d="M46 40 C34 28 18 30 6 44 L11 46 L9 52 L17 52 L17 58 L25 56 L28 62 L34 58 C40 54 44 50 46 48Z" fill="#26303f" />
      <path d="M50 40 C62 28 78 30 90 44 L85 46 L87 52 L79 52 L79 58 L71 56 L68 62 L62 58 C56 54 52 50 50 48Z" fill="#26303f" />
      <path d="M22 44 C28 40 34 40 38 44 C32 48 26 48 22 44Z M74 44 C68 40 62 40 58 44 C64 48 70 48 74 44Z" fill="#f4f4f4" />
      <path d="M43 60 L53 60 L55 80 L41 80Z" fill="#26303f" />
      <ellipse cx="48" cy="52" rx="9" ry="14" fill="#26303f" />
      <ellipse cx="48" cy="37" rx="10" ry="4.5" fill="#f4f4f4" />
      <circle cx="48" cy="28" r="7.5" fill="#c8553d" />
      <path d="M44 20 C46 15 50 15 52 20Z" fill="#8c2f1e" />
      <path d="M44.5 30 L51.5 30 L50 38 L48 40 L46 36Z" fill="#e9d9a8" />
      <circle cx="45.5" cy="26" r="1.3" fill={INK} /><circle cx="50.5" cy="26" r="1.3" fill={INK} />
    </g>
  ),
};

export function stickerLabel(id: StickerId, lang: "es" | "en") {
  return STICKER_LABELS[id][lang];
}

export interface StickerProps {
  id: StickerId;
  size?: number;
  earned?: boolean;
  /** degrees; defaults to a small per-sticker tilt */
  tilt?: number;
  /** adds peel-corner + tilt-on-hover/press */
  touch?: boolean;
  /** plays the "stamp slam" once (use when just earned) */
  stamp?: boolean;
  /** override the accessible name */
  label?: string;
  className?: string;
}

export function Sticker({ id, size = 64, earned = true, tilt, touch = false, stamp = false, label, className = "" }: StickerProps) {
  const { lang, t } = useI18n();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const name = label ?? STICKER_LABELS[id][lang];
  const aria = earned ? name : `${name} (${t("sticker.locked")})`;
  const deg = tilt ?? DEFAULT_TILT[id];
  const cls = ["sticker", touch && earned ? "sticker-touch" : "", stamp && earned ? "sticker-stamp" : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ ["--tilt" as string]: `${earned ? deg : 0}deg`, width: size, height: size }}>
      <svg role="img" aria-label={aria} viewBox="0 0 96 96" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <filter id={`cut${uid}`} x="-10" y="-10" width="116" height="116" filterUnits="userSpaceOnUse">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.6" result="o1" />
            <feFlood floodColor="#1b2a4a" floodOpacity=".28" />
            <feComposite in2="o1" operator="in" result="edge" />
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="o2" />
            <feFlood floodColor="#ffffff" />
            <feComposite in2="o2" operator="in" result="white" />
            <feMerge><feMergeNode in="edge" /><feMergeNode in="white" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`gray${uid}`}>
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        {earned ? (
          <g filter={`url(#cut${uid})`}>
            <circle cx="48" cy="48" r="38" fill={DISC[id]} />
            {ART[id]()}
          </g>
        ) : (
          <g>
            <circle cx="48" cy="48" r="39" fill="none" stroke="currentColor" strokeOpacity=".7" strokeWidth="2" strokeDasharray="5 5" />
            <g filter={`url(#gray${uid})`} opacity=".3">
              <circle cx="48" cy="48" r="36" fill={DISC[id]} />
              {ART[id]()}
            </g>
          </g>
        )}
      </svg>
    </span>
  );
}

export default Sticker;
