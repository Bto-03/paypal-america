# PayPal America — screens and flows (v2)

Style: DESIGN.md (deep-blue hero + white sheet, glass on blue only, floating dock, stickers,
money river, hold-to-confirm). Data: src/server/contract.ts. Copy: ES-EC + EN via src/lib/i18n.ts.
Every screen has: loading skeleton, empty state, error state (with retry), SANDBOX badge.

## Routes
| Route | Screen | Dock tab |
|---|---|---|
| `/bienvenida` | Onboarding (4 steps) | hidden |
| `/` | Inicio | Inicio |
| `/cobrar` | Review sale before PayPal | hidden |
| `/cobro/resultado` | Verifying → result (traceability live) | hidden |
| `/recibos` | Receipts list (grouped Hoy/Ayer/Antes, filter Ventas/Aportes) | Recibos |
| `/recibo/[id]` | Receipt (print/copy/share) | hidden (back arrow) |
| `/pasaporte` | Passport booklet | Pasaporte |
| `/apoyar` | Causes (DEMO) | Apoyar |
| `/apoyar/[causeId]` | Review $1 donation before PayPal | hidden |
| `/perfil` | Personalize: avatar, alias, region, receipt note (live preview), goal, language, reset demo session | via avatar top-left |
| `/consejos` | Tips (AI) full list with evidence sheet | via "Ver todos" |
| `/mock-paypal` | (exists, backend-owned) mock payer page | hidden |

Dock (4): Inicio · Recibos · Pasaporte · Apoyar. Avatar (top-left) → /perfil. ES/EN round button top-right.

## Flow A — First run (onboarding)
Trigger: dashboard has `recent.length === 0` AND localStorage `pa_onboarded` unset → redirect `/` → `/bienvenida`.
1. **Hola** — what this is in one sentence + "Sandbox: test money only". [Empezar]
2. **¿Dónde vendes?** — 3 big region cards with landscape SVG (Galápagos / Sierra / Costa).
3. **Tu sticker** — avatar picker: region stickers first, others below; milestone stickers shown locked.
   Alias input (1–40). 
4. **Tu recibo** — thank-you note (≤80, counter) with a LIVE mini receipt preview + goal (default $300).
   [Listo] → PATCH /api/profile {alias, regionId, avatar, receiptNote, goalCents} → set `pa_onboarded` → `/`.
Skip link on every step → defaults, go to `/`.

## Flow B — Test sale (core)
`/` hero pill **Cobrar $200** (navigates, not hold) → `/cobrar`:
- Review card: "$200.00 test sale", what will happen (3 steps icons: PayPal sandbox → we verify → receipt),
  Money river preview with Ecuador estimate (fee $11.10, you keep $188.90) labelled estimate.
- **HoldButton "Mantén para cobrar"** → POST /api/orders {purpose:'sale'} → location = approvalUrl.
  Errors inline (paypal_error → "PayPal sandbox didn't answer, try again").
PayPal (or /mock-paypal) → `/cobro/resultado?token=ID`:
- Verifying: Timeline animates as steps arrive (created ✓ → approved ✓ → captured … → checks ✓✓✓✓✓).
- Completed: big ✓, amount, sticker earned with stamp animation (golden mango / condor) if any,
  [Ver recibo] primary, [Volver al inicio] secondary.
- Pending: "PayPal is holding it" + [Revisar de nuevo] (GET order) — explain it's normal in sandbox.
- Cancelled: calm, [Intentar de nuevo] → `/cobrar`.
- Failed verification: which check failed in words, "not counted", [Volver].

## Flow C — Receipts & traceability
`/recibos`: grouped list; each row = sticker circle, "Venta de prueba"/"Aporte DEMO · cause", date,
amount + status word. Tap → `/recibo/[id]` (GET /api/orders/[id]/receipt): ticket slides out;
Money river (sales), Timeline, checks, seller note, stamp. Actions: Imprimir/PDF, Copiar enlace, Compartir.
Empty: "Tu primer recibo aparece después de tu primera venta" + [Cobrar $200].

## Flow D — Passport
`/pasaporte`: booklet with 3 region pages (swipe/scroll-snap horizontally on mobile, tabs on desktop) +
"Hitos" page. Earned stickers full color with date + link to the receipt that earned it; locked = outline
+ how to earn ("Primera venta", "Llega a tu meta"). Note: "Lugar declarado, no verificado".

## Flow E — Support a cause (DEMO)
`/apoyar`: 3 DEMO causes, own region first, "no cuenta para tu meta". Tap → `/apoyar/[causeId]`:
review "$1.00 DEMO donation", HoldButton "Mantén para aportar" → POST /api/orders {purpose:'donation_demo',causeId}
→ PayPal → `/cobro/resultado` (donation variant: thank-you, no sticker, [Ver recibo]).

## Flow F — Tips (AI)
Inicio shows top 2 tips; [Ver todos] → `/consejos`: all tips; each "Ver evidencia" opens a bottom Sheet
listing evidence items (label, value, source chip). aiStatus unavailable → honest message, numbers still
exact; no_data → nudge to first sale.

## Flow G — Personalize
`/perfil`: same pickers as onboarding (avatar grid, alias, region, note with live receipt preview, goal),
language ES/EN, [Reiniciar demo] (clears cookie pa_sid + localStorage after a confirm dialog; for demos/video).
Save → PATCH /api/profile; toast "Guardado".

## Inicio layout (top → bottom)
Hero (blue, contours): avatar + "Hola, {alias}" + region chip; estimated net HUGE; goal bar
(hatched remainder) "$188.90 / $300.00 · 63%"; glass pills [Cobrar $200] [Ver recibos].
Sheet (white): Pocket with Passport card peeking (stickers count) → Money river of all sales (observed vs
estimate vs keep) → Tips (2) → Bento: Pasaporte · Apoyar → Recent activity (5, grouped) → Footer wordmark.
