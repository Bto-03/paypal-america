import { notFound } from "next/navigation";
import { mode } from "@/server/paypal";


export default async function MockPayPal({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (mode() !== "mock") notFound();
  const { token } = await searchParams;
  if (!token) notFound();
  const btn = { padding: "14px 22px", fontSize: 18, borderRadius: 8, border: "2px solid #000", cursor: "pointer" } as const;
  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 24, border: "4px dashed #c00", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#c00", fontSize: 36 }}>MOCK PAYPAL — not real</h1>
      <p>MOCK PAYPAL — no es real. Ningún dinero se mueve. / No money moves.</p>
      <p>
        Order / Orden: <code>{token}</code>
      </p>
      <form method="post" action="/api/mock/decide" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input type="hidden" name="token" value={token} />
        <button style={btn} name="choice" value="completed">Pay / Pagar</button>
        <button style={btn} name="choice" value="pending">Pay (pending) / Pagar (pendiente)</button>
        <button style={btn} name="choice" value="cancel">Cancel / Cancelar</button>
      </form>
    </main>
  );
}
