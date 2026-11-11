import type { ReactNode } from "react";

export const btn =
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-lg font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#003087] disabled:cursor-not-allowed disabled:opacity-60";
export const btnPrimary = `${btn} bg-[#0070e0] text-white hover:bg-[#003087]`;
export const btnSecondary = `${btn} border-2 border-[#003087] bg-white text-[#003087] hover:bg-[#e8f1fb]`;
export const field =
  "min-h-12 w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-lg text-slate-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#003087]";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "slate" }) {
  const c = { blue: "bg-[#e8f1fb] text-[#003087]", amber: "bg-amber-100 text-amber-900", slate: "bg-slate-200 text-slate-900" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${c}`}>{children}</span>;
}

export function Msg({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl p-4 text-lg ${tone === "error" ? "bg-red-100 text-red-900" : "bg-[#e8f1fb] text-[#003087]"}`}>
      {children}
    </p>
  );
}
