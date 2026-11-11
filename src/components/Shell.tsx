"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApiMode } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Badge } from "./ui";

export default function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, t } = useI18n();
  const mode = useApiMode();
  const path = usePathname();
  useEffect(() => {
    document.documentElement.lang = lang === "es" ? "es-EC" : "en";
  }, [lang]);
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/pasaporte", label: t("nav.passport") },
    { href: "/apoyar", label: t("nav.support") },
  ];
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="text-xl font-extrabold text-[#003087]">PayPal America</span>
          <Badge tone="amber">{t("badge.sandbox")}</Badge>
          {mode === "mock" && <Badge tone="slate">{t("badge.mock")}</Badge>}
          <button
            type="button"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label={t("lang.toggle")}
            className="ml-auto min-h-10 rounded-full border-2 border-[#003087] px-3 font-bold text-[#003087] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#003087]"
          >
            {lang === "es" ? "ES · EN" : "EN · ES"}
          </button>
          <nav aria-label={t("nav.label")} className="flex w-full gap-1">
            {links.map((l) => {
              const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-lg font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#003087] ${on ? "bg-[#003087] text-white" : "text-[#003087] hover:bg-[#e8f1fb]"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white/70 px-4 py-4 text-center text-base text-slate-800">{t("footer")}</footer>
    </>
  );
}
