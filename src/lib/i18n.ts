import { useCallback, useSyncExternalStore } from "react";

export type Lang = "es" | "en";
const KEY = "pa_lang";
const EVT = "pa-lang";

const es = {
  "nav.home": "Inicio",
  "nav.passport": "Pasaporte",
  "nav.support": "Apoyar",
  "nav.label": "Navegación principal",
  "lang.toggle": "Cambiar idioma",
  "badge.sandbox": "SANDBOX",
  "badge.mock": "MOCK",
  "footer": "Solo dinero de prueba. Las comisiones de Ecuador son estimaciones, no valores reales.",
  "loading": "Cargando…",
  "error.generic": "Algo salió mal. Intenta de nuevo.",
  "error.network": "No hay conexión con el servidor.",
  "retry": "Reintentar",
  "src.sandbox_observed": "Observado en sandbox",
  "src.ec_estimate": "Estimación Ecuador",
  "src.computed": "Calculado",
  "src.declared": "Declarado",

  "home.title": "Tu panel de vendedor",
  "home.sub": "Demo en sandbox para una vendedora o vendedor pequeño en Ecuador.",
  "profile.alias": "Alias",
  "profile.region": "Región",
  "profile.goal": "Meta (USD)",
  "profile.save": "Guardar",
  "profile.saved": "Guardado",
  "region.galapagos": "Galápagos",
  "region.sierra": "Sierra",
  "region.costa": "Costa",
  "money.title": "Ventas de prueba",
  "money.count": "Ventas completadas: {n}",
  "money.gross": "Monto cobrado",
  "money.observed": "Comisión PayPal observada en sandbox",
  "money.observedNet": "Neto observado en sandbox",
  "money.notReported": "no reportada",
  "money.estFee": "Comisión estimada Ecuador",
  "money.estNet": "Neto estimado Ecuador",
  "money.estimate": "Estimación",
  "money.withdrawal": "Escenario de retiro (estimado)",
  "money.withdrawalFee": "Comisión de retiro",
  "money.withdrawalNet": "Recibirías",
  "goal.title": "Progreso hacia tu meta",
  "goal.basis": "Basado en el neto estimado de Ecuador: {p} de {t}.",
  "sale.button": "Cobrar venta de prueba $200",
  "sale.loading": "Creando cobro…",
  "sale.hint": "Te llevaremos a PayPal sandbox. No se mueve dinero real.",
  "ai.title": "Ideas con IA",
  "ai.sub": "La IA solo redacta texto; todos los números vienen del cálculo exacto.",
  "ai.loading": "Generando ideas…",
  "ai.unavailable": "IA temporalmente no disponible — los números de arriba siguen siendo exactos.",
  "ai.noData": "Aún no hay ventas completadas. Haz una primera venta de prueba para recibir ideas.",
  "ai.evidence": "Evidencia",
  "ai.assumptions": "Supuestos",
  "ai.cached": "Resultado guardado",

  "result.title": "Resultado del cobro",
  "result.loading": "Confirmando tu pago con el servidor…",
  "result.completed": "Pago verificado",
  "result.amount": "Monto",
  "result.captureId": "ID de captura",
  "result.pending": "Pago pendiente",
  "result.pendingText": "PayPal aún está procesando este pago. Puede tardar un poco.",
  "result.checkAgain": "Revisar de nuevo",
  "result.failed": "No se pudo verificar el pago",
  "result.failedText": "El pago no cumplió la verificación del servidor, así que no se cuenta.",
  "result.cancelled": "Cobro cancelado",
  "result.cancelledText": "No se hizo ningún cobro.",
  "result.mango": "¡Ganaste un mango dorado! 🥭",
  "result.donationNote": "Este aporte demo no cuenta para tu meta.",
  "result.back": "Volver al inicio",
  "result.noToken": "Falta el identificador del cobro en la URL.",
  "result.notYet": "El pago todavía no está aprobado.",

  "pass.title": "Pasaporte",
  "pass.sub": "Lugares y stickers que has ganado.",
  "pass.places": "Lugares",
  "pass.stickers": "Stickers",
  "pass.declared": "Lugar declarado, no verificado.",
  "pass.noStickers": "Aún no tienes mangos dorados. Aparece uno cuando completes tu primera venta de prueba.",
  "pass.mango": "Mango dorado",
  "pass.firstSale": "Primera venta",
  "pass.earned": "Ganado el {d}",

  "support.title": "Apoyar una causa",
  "support.sub": "Aporte opcional de $1 para una causa de demostración.",
  "support.note": "Es opcional, es una demo y no cuenta para tu meta ni da mangos.",
  "support.demo": "DEMO",
  "support.yours": "Tu región",
  "support.button": "Aportar $1 (opcional)",
  "support.confirmTitle": "¿Confirmar aporte demo de $1?",
  "support.confirmText": "Irás a PayPal sandbox con dinero de prueba. Causa: {c}. No cuenta para tu meta.",
  "support.confirm": "Sí, aportar $1",
  "support.cancel": "Cancelar",
  "support.sending": "Redirigiendo…",
  "support.donations": "Aportes demo completados: {n}",
} as const;

export type Key = keyof typeof es;

const en: Record<Key, string> = {
  "nav.home": "Home",
  "nav.passport": "Passport",
  "nav.support": "Support",
  "nav.label": "Main navigation",
  "lang.toggle": "Change language",
  "badge.sandbox": "SANDBOX",
  "badge.mock": "MOCK",
  "footer": "Test money only. Ecuador fees are estimates, not real values.",
  "loading": "Loading…",
  "error.generic": "Something went wrong. Please try again.",
  "error.network": "Cannot reach the server.",
  "retry": "Retry",
  "src.sandbox_observed": "Sandbox observed",
  "src.ec_estimate": "Ecuador estimate",
  "src.computed": "Computed",
  "src.declared": "Declared",

  "home.title": "Your seller dashboard",
  "home.sub": "Sandbox demo for a small seller in Ecuador.",
  "profile.alias": "Alias",
  "profile.region": "Region",
  "profile.goal": "Goal (USD)",
  "profile.save": "Save",
  "profile.saved": "Saved",
  "region.galapagos": "Galápagos",
  "region.sierra": "Sierra",
  "region.costa": "Coast",
  "money.title": "Test sales",
  "money.count": "Completed sales: {n}",
  "money.gross": "Amount collected",
  "money.observed": "PayPal fee observed in sandbox",
  "money.observedNet": "Net observed in sandbox",
  "money.notReported": "not reported",
  "money.estFee": "Ecuador estimated fee",
  "money.estNet": "Ecuador estimated net",
  "money.estimate": "Estimate",
  "money.withdrawal": "Withdrawal scenario (estimate)",
  "money.withdrawalFee": "Withdrawal fee",
  "money.withdrawalNet": "You would receive",
  "goal.title": "Progress toward your goal",
  "goal.basis": "Based on the Ecuador estimated net: {p} of {t}.",
  "sale.button": "Charge $200 test sale",
  "sale.loading": "Creating charge…",
  "sale.hint": "You will be sent to PayPal sandbox. No real money moves.",
  "ai.title": "AI insights",
  "ai.sub": "AI only writes text; every number comes from the exact calculation.",
  "ai.loading": "Generating insights…",
  "ai.unavailable": "AI temporarily unavailable — numbers above are still exact.",
  "ai.noData": "No completed sales yet. Make a first test sale to get insights.",
  "ai.evidence": "Evidence",
  "ai.assumptions": "Assumptions",
  "ai.cached": "Saved result",

  "result.title": "Payment result",
  "result.loading": "Confirming your payment with the server…",
  "result.completed": "Payment verified",
  "result.amount": "Amount",
  "result.captureId": "Capture ID",
  "result.pending": "Payment pending",
  "result.pendingText": "PayPal is still processing this payment. It may take a moment.",
  "result.checkAgain": "Check again",
  "result.failed": "Payment could not be verified",
  "result.failedText": "The payment did not pass server verification, so it is not counted.",
  "result.cancelled": "Charge cancelled",
  "result.cancelledText": "No charge was made.",
  "result.mango": "You earned a golden mango! 🥭",
  "result.donationNote": "This demo contribution does not count toward your goal.",
  "result.back": "Back to Home",
  "result.noToken": "The order identifier is missing from the URL.",
  "result.notYet": "The payment is not approved yet.",

  "pass.title": "Passport",
  "pass.sub": "Places and stickers you have earned.",
  "pass.places": "Places",
  "pass.stickers": "Stickers",
  "pass.declared": "Declared place, not verified.",
  "pass.noStickers": "No golden mangos yet. One appears when you complete your first test sale.",
  "pass.mango": "Golden mango",
  "pass.firstSale": "First sale",
  "pass.earned": "Earned {d}",

  "support.title": "Support a cause",
  "support.sub": "Optional $1 contribution to a demo cause.",
  "support.note": "It is optional, it is a demo, and it does not count toward your goal or earn mangos.",
  "support.demo": "DEMO",
  "support.yours": "Your region",
  "support.button": "Contribute $1 (optional)",
  "support.confirmTitle": "Confirm $1 demo contribution?",
  "support.confirmText": "You will go to PayPal sandbox with test money. Cause: {c}. It does not count toward your goal.",
  "support.confirm": "Yes, contribute $1",
  "support.cancel": "Cancel",
  "support.sending": "Redirecting…",
  "support.donations": "Demo contributions completed: {n}",
};

const dict = { es, en };

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, read, () => "es" as Lang);
  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVT));
  }, []);
  const t = useCallback(
    (k: Key, vars?: Record<string, string | number>) => {
      let s: string = dict[lang][k];
      if (vars) for (const [n, v] of Object.entries(vars)) s = s.replace(`{${n}}`, String(v));
      return s;
    },
    [lang],
  );
  return { lang, setLang, t };
}
