# PayPal America — UX/UI design brief (source of truth for all design work)

## The prompt (Beto's request, rewritten)

> Redesign PayPal America so it feels like a **PayPal product that grew up in Ecuador**: instantly
> familiar to anyone who has used PayPal (its blues, its calm hierarchy, its trustworthy money
> screens), but with a signature of its own. Every feature we already have — test sale, verified
> capture, fees observed vs. Ecuador estimate, goal, golden mango passport, AI insights with
> evidence, $1 demo donation — must stay and become **easier to understand at a glance**.
>
> The app should feel **personal**: the seller picks a local sticker as their avatar (Galápagos,
> Sierra, Costa), earns small hand-made-looking stickers for real milestones, and every **receipt**
> carries their name, their sticker and a short thank-you note they wrote. Receipts are shareable
> and show **traceability**: a timeline of what happened to the money (order created → buyer
> approved → PayPal captured → server verified: status, amount, currency, payee, session) and the
> exact breakdown (gross, fee observed in sandbox, Ecuador estimate, net). Nothing is invented; every
> number on screen comes from the server.
>
> Visual language: **subtle glassmorphism** — frosted, layered panels over a soft, living
> background, used with restraint so it reads as modern and new, never as a generic AI template.
> Intuitive first: one primary action per screen, obvious next step, plain words, big numbers.

## Principles
1. **Familiar, then distinctive.** PayPal blue `#003087` (deep) / `#0070E0` (action) / `#142C8E`,
   white space, rounded 16–24px. Our signature: a warm **Ecuadorian accent** (mango `#F6B21B`,
   volcano terracotta `#C8553D`, Galápagos teal `#1A9E8F`) used only for stickers, progress and
   celebration — never for money values.
2. **Glass with restraint.** Max two glass layers on screen. `backdrop-filter: blur(16–20px)
   saturate(140%)`, panel fill `rgba(255,255,255,.55)` light / `rgba(16,24,48,.5)` dark, 1px
   inner border `rgba(255,255,255,.6)`, very soft shadow. Background: a slow, low-contrast mesh of
   blue + one regional accent (changes with the seller's region). Text never sits on busy blur;
   contrast ≥ 4.5:1 always. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`
   (solid fallback).
3. **Anti-"AI look" rules.** No purple-pink gradients, no glowing neon, no emoji-confetti spam,
   no generic 3D blobs, no "✨ AI-powered" badges, no centered hero with gradient text. Use real
   hierarchy, tabular numbers, small details (hairlines, stamp-like sticker borders, paper grain on
   receipts). The AI section is labelled plainly: "Tips" / "Consejos", with the evidence link.
4. **Intuitive.** Each screen answers: where am I, what's my number, what do I do next. One primary
   button (filled blue), secondary actions as quiet text buttons. Status always in words + icon,
   never color alone. Money: big, tabular, with the source chip next to it
   (`Sandbox` / `Ecuador estimate`).
5. **Local stickers, hand-made feel.** Small SVG stickers (white die-cut border, slight tilt,
   flat colors, 2–3 tones), not stock emoji. Set: Galápagos — giant tortoise, blue-footed booby,
   sea lion; Sierra — llama, Cotopaxi volcano, hummingbird; Costa — mango, crab, palm. Milestones:
   golden mango (first sale), condor (goal reached). Emoji only as fallback text.
6. **Bilingual** ES-EC / EN everywhere, including receipts.
7. **Honest.** SANDBOX always visible; MOCK when mocked; estimates labelled; never imply real money,
   tax/ISD avoidance, fraud elimination, cards, cashback, miles or partnerships.

## Screens
- **Inicio**: greeting with avatar sticker + alias + region; hero number = estimated net this
  period with progress ring to goal; one primary button "Cobrar venta de prueba $200"; compact
  breakdown (gross / observed fee / EC estimate / net / withdrawal scenario) with source chips;
  "Tips" (AI) cards with "Ver evidencia"; recent activity list → each row opens its receipt.
- **Cobro / resultado**: calm full-screen states (verifying… / pending with "check again" /
  completed / cancelled / failed). Completed shows a live **traceability timeline** animating
  through the verified checks, the sticker earned, and "Ver recibo".
- **Recibo** (`/recibo/[id]`): paper-like card on glass: receipt number, seller avatar + alias +
  region, thank-you note, amount, breakdown, timeline with timestamps, verification checks ✔,
  "Sandbox · not real money" stamp. Actions: print/save PDF (`window.print` with print CSS),
  copy link, share (Web Share API when available).
- **Pasaporte**: passport booklet look; pages per region with stamped stickers (earned = full color
  with date; locked = outline). Milestone stickers. "Declared place, not verified" note.
- **Apoyar**: 3 DEMO causes, own region first, $1 optional; clear "does not count toward goal".
- **Perfil / personalizar** (sheet or section in Inicio): alias, region, avatar sticker picker,
  receipt thank-you note (≤ 80 chars, live receipt preview), goal.

## Motion
150–250 ms ease-out; timeline steps stagger 120 ms; sticker earned = small stamp (scale 1.15 → 1,
rotate −6° → −3°). Nothing loops forever except the background mesh (very slow, 30 s+).
