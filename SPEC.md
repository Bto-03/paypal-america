# PayPal America — build spec (single source for all agents)

Hackathon MVP, due Thu 2026-11-12 12:30 (Ecuador). Next.js 16 App Router + TypeScript, Node 26.
Read `node_modules/next/dist/docs/` before using any Next API (this Next differs from training data:
route `params` is a Promise, `cookies()` is async).

## Hard rules (never break)
1. Sandbox only. `src/server/paypal.ts` hardcodes the sandbox base and refuses live. MOCK mode when no keys.
2. Secrets only in `.env.local` (gitignored). `.env.example` has names only. Never log PayPal bodies or secrets.
3. A payment counts ONLY via `verifyCapture()` in `src/server/paypal.ts` (status, amount, USD, payee, session tag).
   The return URL proves nothing.
4. All numbers come from `src/server/money.ts` (integer cents). The AI only writes text.
   Sandbox-observed fee/net is kept separate from the Ecuador estimate (5.40% + $0.30).
5. Never claim the app avoids ISD/taxes, prevents fraud, issues cards, gives cashback/miles, or has partnerships.
6. No chat, Payouts, Invoicing, bank linking. Everything user-facing ships in English + Spanish (ES-EC).
7. Ponytail: smallest complete change, no new dependencies, stdlib first. Money/security logic gets a test.

## Existing files (do not change signatures; you may ADD exports)
- `src/server/contract.ts` — all DTO types (OrderDTO, DashboardDTO, InsightsDTO, CauseDTO, Meta, Ok, Err...).
- `src/server/money.ts` — SALE_CENTS=20000, DONATION_CENTS=100, ecEstimate, withdrawal, goalPercent, fmt, toCents.
- `src/server/catalog.ts` — REGIONS, isRegion, regionLabel, CAUSES (3 DEMO), causesFor(regionId).
- `src/server/db.ts` — `store()` singleton Store (node:sqlite): profile, updateProfile, insertOrder, order, setStatus,
  recordCapture (idempotent), orders, completed, awardMango (unique per sid/place/milestone), stickers, cacheGet/cachePut.
- `src/server/paypal.ts` — mode(), sessionTag(sid), verifyCapture(order, expected), paypal() client
  (createOrder/capture/get), PayPalError(status, issue), mockDecide(id, choice), setPayPalForTests(client).

## Envelope
Success: `{ data, meta: { mode, generatedAt } }`. Error: `{ error: { code, message }, meta }` with HTTP status.
Error codes from contract `ErrorCode`. Never return raw PayPal errors.

## Session
Cookie `pa_sid` (random UUID, httpOnly, sameSite=lax, path=/, 30 days). Created on first API call.
Every query is scoped by sid; another session never sees foreign orders (404, not 403).

## Endpoints (all under src/app/api)
| Method | Path | Body / query | Returns `data` |
|---|---|---|---|
| POST | /api/orders | `{ purpose: "sale" } \| { purpose: "donation_demo", causeId }` | `OrderDTO` (with approvalUrl). Server fixes amount (sale $200, donation $1) and payee; ignores any amount/payee sent. Invalid causeId → 400. PayPal-Request-Id = `create-<uuid>`. return_url `${APP_URL}/cobro/resultado`, cancel_url `${APP_URL}/cobro/resultado?cancelled=1`. APP_URL default `http://localhost:3000`. |
| POST | /api/orders/:id/capture | — | `OrderDTO`. Idempotent: if already completed return it. PayPal-Request-Id = `capture-<orderId>`. On 422 ORDER_ALREADY_CAPTURED → GET the order and reconcile. Then verifyCapture; ok → recordCapture; if sale & completed → awardMango(sid, profile.regionId). Failed verification → status failed, 409 verification_failed. ORDER_NOT_APPROVED → 409 bad_request-ish message "not approved yet". |
| POST | /api/orders/:id/cancel | — | `OrderDTO` status cancelled (only from created/approved). |
| GET | /api/orders/:id | — | `OrderDTO`; if local status pending, re-GET from PayPal and re-verify (pending → completed). |
| GET | /api/dashboard | — | `DashboardDTO` (see contract). Goal progress = EC-estimated net of completed sales. Observed = sum of fee/net from captures (null if none had a breakdown). Donations never count toward goal or mango. |
| PATCH | /api/profile | `{ alias?, regionId?, goalCents? }` | `DashboardDTO`. alias 1–40 chars; goalCents 100..10,000,000 integer; regionId via isRegion. |
| GET | /api/causes | `?regionId=` | `CauseDTO[]` ordered by causesFor. |
| POST | /api/insights | — | `InsightsDTO` (see insights section). |

Business logic lives in `src/server/service.ts` (pure functions taking `sid` and using store()/paypal()),
routes are thin. `service.ts` MUST export: `dashboard(sid: string): DashboardDTO`.

## Insights (AI)
`src/server/insights.ts`: `buildEvidence(d: DashboardDTO): EvidenceItem[]`, `validate(raw: unknown, evidence): InsightDTO[]`,
`insights(sid): Promise<InsightsDTO>`.
- LLM via any OpenAI-compatible endpoint: env `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Missing env or error/timeout (12 s)
  → `aiStatus: "unavailable"`, insights [], evidence still returned. No completed sales → `aiStatus: "no_data"`.
- Prompt contains ONLY numbers/labels from evidence + region label + language. No alias, names, emails, addresses.
- Model must return JSON `{ insights: [{category, text, evidenceIds, assumptions}] }` (2–3 items).
- Validator rejects any item whose text contains a number (money, %, count) not present in the evidence values,
  unknown evidenceIds, unknown category. Keep valid items only.
- Cache by sha256 of the evidence+language in insights_cache; `cached: true` on hit.
- Language: request header `Accept-Language` starting with `es` → Spanish (ES-EC), else English.

## Mock PayPal page
`src/app/mock-paypal/page.tsx`: shows a big "MOCK PAYPAL — not real" page for `?token=`, with buttons
Pay / Pay (pending) / Cancel that call a server action or route `POST /api/mock/decide {token, choice}` which uses
`mockDecide` and redirects (only when mode() === "mock"; 404 otherwise).

## Tests
`node --test tests/*.test.ts` (Node 26 strips types natively; import with explicit `.ts` paths, relative).
Use `DB_PATH=:memory:` style by constructing `new Store(":memory:")` where needed, and `setPayPalForTests` fakes.

## Key numbers (must hold)
$200 sale → EC fee $11.10 → net $188.90 → 63% of $300 goal. Withdrawal of $188.90 → fee $10.00 (min) → $178.90.
