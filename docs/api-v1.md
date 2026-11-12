# PayPal America — API v1

Hackathon MVP. All routes live under `/api`. Sandbox only: PayPal live mode is refused.
Without PayPal keys the server runs in **mock** mode (`meta.mode = "mock"`), which simulates PayPal locally.

## Envelope

Success:

```json
{ "data": { ... }, "meta": { "mode": "mock", "generatedAt": "2026-11-11T15:00:00.000Z" } }
```

Error (with the matching HTTP status):

```json
{ "error": { "code": "verification_failed", "message": "..." }, "meta": { "mode": "mock", "generatedAt": "..." } }
```

- `mode` is `"sandbox"` (PayPal sandbox keys set) or `"mock"`.
- Money is always integer cents in USD. Floats never appear on the wire.
- Raw PayPal error bodies are never returned.

## Error codes

| code | Meaning |
|---|---|
| `bad_request` | Invalid body, query, or `causeId`. HTTP 400. |
| `not_found` | Unknown order, or an order that belongs to another session. HTTP 404 (never 403). |
| `forbidden` | Reserved. |
| `paypal_error` | PayPal call failed. Message is generic. |
| `verification_failed` | Capture did not pass `verifyCapture`. HTTP 409. |
| `live_mode_refused` | `PAYPAL_ENV=live` was requested. |
| `internal` | Unexpected server error. |

The spec fixes only some HTTP statuses (400, 404, 409 above). Other statuses follow the code's route handlers.

## Session

- Cookie `pa_sid`: random UUID, httpOnly, `SameSite=Lax`, `path=/`, 30 days.
- Created on the first API call.
- Every query is scoped by `sid`. Another session's orders are invisible (404).
- PayPal orders carry `custom_id = sha256("pa:" + sid)[0:32]`, so the session id itself is never sent to PayPal.

## Endpoints

| Method | Path | Body / query | Returns `data` |
|---|---|---|---|
| POST | `/api/orders` | `{ "purpose": "sale" }` or `{ "purpose": "donation_demo", "causeId": "demo-galapagos-reef" }` | `OrderDTO` with `approvalUrl` |
| POST | `/api/orders/:id/capture` | — | `OrderDTO` (idempotent) |
| POST | `/api/orders/:id/cancel` | — | `OrderDTO` with status `cancelled` (only from `created`/`approved`) |
| GET | `/api/orders/:id` | — | `OrderDTO`; a `pending` order is re-fetched and re-verified |
| GET | `/api/dashboard` | — | `DashboardDTO` |
| GET | `/api/orders/:id/receipt` | — | `ReceiptDTO` (same session only, else 404) |
| PATCH | `/api/profile` | `{ alias?, regionId?, goalCents?, avatar?, receiptNote? }` | `DashboardDTO` |
| GET | `/api/causes` | `?regionId=galapagos\|sierra\|costa` | `CauseDTO[]` |
| POST | `/api/insights` | — | `InsightsDTO` |
| POST | `/api/mock/decide` | `{ token, choice: "completed" \| "pending" \| "cancel" }` | Redirect. Mock mode only, otherwise 404. |

Rules the server enforces:

- **Orders:** the server fixes the amount (sale $200.00, donation $1.00) and the payee. Any amount or payee in the body is ignored.
- **Capture:** only a capture that passes `verifyCapture` counts. The return URL proves nothing.
  `ORDER_NOT_APPROVED` returns 409 ("not approved yet").
- **Profile:** `alias` is 1–40 characters. `goalCents` is an integer from 100 to 10,000,000. `regionId` must be a known region.
  `avatar` is a `StickerId`; `golden_mango` and `condor` only once earned. `receiptNote` is trimmed, control characters stripped, 0–80 characters. The default avatar follows the region (`tortoise`/`llama`/`mango`).
- **Traceability:** each order records events (`created`, `approved`, `captured` or `pending`, `verified` or `verification_failed`, `cancelled`, `sticker_awarded`), once per type. Per-check results (`status`, `amount`, `currency`, `payee`, `session`) are stored when verification runs.
- **Receipt:** `receiptNo` = `PA-<year>-<4-digit per-session sequence>`. Sales show observed and Ecuador-estimate fee/net; donations show gross only (EC and observed fields `null`) plus the DEMO `cause`.
- **Goal:** progress is the estimated Ecuador net of completed sales. Donations never count toward the goal or stickers.

## DTOs

Amounts are `*Cents` integers.

- **OrderDTO:** `id`, `purpose` (`sale` \| `donation_demo`), `status` (`created` \| `approved` \| `pending` \| `completed` \| `cancelled` \| `failed`), `amountCents`, `currency` (`"USD"`), `causeId`, `captureId`, `approvalUrl`, `createdAt`, `updatedAt`.
- **DashboardDTO:** `profile {alias, regionId, avatar, receiptNote}`, `goal {targetCents, progressCents, percent, basis: "ec_estimate_net"}`, `sales {count, grossCents, observed, estimateEc, withdrawal}`, `lastOrder`, `recent[]` (last 10 orders, newest first), `stickers[]`, `donations {count, totalCents}`, `places[]`.
- **MoneyLine** (inside `sales`): `feeCents`, `netCents`, `source`, and `rule` (estimate lines only).
- **StickerDTO:** `id`, `kind` (`golden_mango` \| `condor`), `placeId`, `placeLabel`, `milestone` (`first_sale` \| `goal_reached`), `origin: "declared_unverified"`, `earnedAt`.
- **ReceiptDTO:** `receiptNo`, `order`, `seller {alias, regionId, avatar, receiptNote, regionLabel}`, `lines {grossCents, feeObservedCents, netObservedCents, feeEcCents, netEcCents}`, `events[] {type, at, detail}`, `checks[] {name, ok}` (empty until verification ran), `sticker` (earned by this order or `null`), `cause {id, name}` (donations only).
- **Condor:** the first completed sale that takes `goal.percent` to 100 or more awards one `condor` sticker (`goal_reached`).
- **InsightsDTO:** `aiStatus` (`ok` \| `unavailable` \| `no_data`), `insights[]`, `evidence[]`, `cached`.
- **InsightDTO:** `category` (`progress` \| `fees` \| `withdrawal` \| `next_step`), `text`, `evidenceIds[]`, `assumptions[]`.
- **EvidenceItem:** `id`, `label`, `valueCents` (nullable), `value` (display string), `source` (`sandbox_observed` \| `ec_estimate` \| `computed` \| `declared`).
- **CauseDTO:** `id`, `name`, `regionId`, `description`, `demo: true`, `amountCents: 100`. All causes are DEMO entries.

## Sandbox observed vs. Ecuador estimate

These are separate fields and are never mixed.

- **`observed`** (`source: "sandbox_observed"`): fee and net PayPal reported in `seller_receivable_breakdown` for a sandbox capture. `null` if PayPal returned no breakdown.
- **`estimateEc`** (`source: "ec_estimate"`): **5.40% + $0.30 per sale**. This is an estimate for an Ecuador account, not a quote.
- **`withdrawal`** (`source: "ec_estimate"`): **0.50% of the net, minimum $10**. A scenario only. The app moves no money.

Example: a $200.00 sale gives an estimate of fee $11.10 and net $188.90. That is 63% of a $300.00 goal. A withdrawal of $188.90 gives fee $10.00 and net $178.90.

The app does not claim to avoid taxes or ISD, prevent fraud, issue cards, give cashback, or have partnerships.

## Example (mock mode)

```bash
# 1. Create a $200 sale (session cookie is stored in the jar)
curl -s -c jar.txt -b jar.txt -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' -d '{"purpose":"sale"}'
# -> {"data":{"id":"MOCK-XXXXXXXXXXXXX","status":"created","approvalUrl":"http://localhost:3000/mock-paypal?token=MOCK-...", ...},"meta":{"mode":"mock",...}}

# 2. Simulate the payer approving on the mock page
curl -s -c jar.txt -b jar.txt -X POST http://localhost:3000/api/mock/decide \
  -H 'Content-Type: application/json' -d '{"token":"MOCK-XXXXXXXXXXXXX","choice":"completed"}'

# 3. Capture
curl -s -c jar.txt -b jar.txt -X POST http://localhost:3000/api/orders/MOCK-XXXXXXXXXXXXX/capture

# 4. Dashboard
curl -s -c jar.txt -b jar.txt http://localhost:3000/api/dashboard
```

The `meta.mode` field is `"mock"` in every response, so every example output is clearly labeled.
