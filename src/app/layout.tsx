import type { Metadata, Viewport } from "next";
import { Figtree, Caveat } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

// Figtree: friendly geometric sans with real tabular figures. Caveat is ONLY for the receipt note.
const brand = Figtree({ variable: "--nf-brand", subsets: ["latin"], display: "swap" });
const hand = Caveat({ variable: "--nf-hand", subsets: ["latin"], display: "swap", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "PayPal America — Sandbox demo",
  description: "Sandbox demo for a small seller in Ecuador. Test money only.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1226" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-EC" className={`${brand.variable} ${hand.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
