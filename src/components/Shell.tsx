"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApiMode } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Background, { useBackgroundRegion } from "./Background";
import Footer from "./Footer";
import { Chip, Icon, IconButton, type IconName } from "./ui";

const NAV: { href: string; icon: IconName; key: "nav.home" | "nav.passport" | "nav.support" }[] = [
  { href: "/", icon: "home", key: "nav.home" },
  { href: "/pasaporte", icon: "book", key: "nav.passport" },
  { href: "/apoyar", icon: "heart", key: "nav.support" },
];

/** Floating pill dock: dark navy, active item expands to icon + label (mango). */
export function Dock() {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <nav aria-label={t("nav.label")} className="dock no-print">
      {NAV.map((n) => {
        const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-label={t(n.key)} aria-current={on ? "page" : undefined}>
            <Icon name={n.icon} size={22} />
            {on && <span>{t(n.key)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, t } = useI18n();
  const mode = useApiMode();
  const region = useBackgroundRegion();
  useEffect(() => {
    document.documentElement.lang = lang === "es" ? "es-EC" : "en";
  }, [lang]);
  return (
    <>
      <Background regionId={region} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-[#003087]">
        {t("skip")}
      </a>
      <header className="topbar no-print">
        <span className="whitespace-nowrap text-[1.05rem] font-extrabold tracking-tight">
          PayPal<span className="text-[#f6b21b]"> America</span>
        </span>
        <span className="ml-1 flex items-center gap-1.5">
          <Chip tone="est" icon="flask">{t("badge.sandbox")}</Chip>
          {mode === "mock" && <Chip tone="cmp">{t("badge.mock")}</Chip>}
        </span>
        <span className="ml-auto" />
        <IconButton label={t("lang.toggle")} onClick={() => setLang(lang === "es" ? "en" : "es")}>
          <span aria-hidden="true">{lang === "es" ? "ES" : "EN"}</span>
        </IconButton>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-20 pb-10">
        {children}
      </main>
      <Footer />
      <Dock />
    </>
  );
}
