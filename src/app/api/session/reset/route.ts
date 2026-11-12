import { cookies } from "next/headers";
import { SID_COOKIE } from "../../../../server/session.ts";
import { ok } from "../../../../server/http.ts";

// Demo reset (for videos): forget this browser's session. Data stays in the ledger, unlinked.
export async function POST() {
  (await cookies()).delete(SID_COOKIE);
  return ok({ reset: true });
}
