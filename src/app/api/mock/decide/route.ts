import { fail } from "@/server/http";
import { mockDecide, mode } from "@/server/paypal";

// Mock mode only. Accepts JSON or a plain HTML form post and redirects to the return/cancel URL.
export async function POST(req: Request) {
  if (mode() !== "mock") return fail("not_found", "not found", 404);
  const isJson = (req.headers.get("content-type") || "").includes("json");
  const b: Record<string, unknown> = isJson
    ? ((await req.json().catch(() => null)) ?? {})
    : Object.fromEntries(await req.formData().catch(() => new FormData()));
  const choice = b.choice;
  if (typeof b.token !== "string" || (choice !== "completed" && choice !== "pending" && choice !== "cancel")) {
    return fail("bad_request", "token and choice (completed|pending|cancel) required", 400);
  }
  const url = mockDecide(b.token, choice);
  if (!url) return fail("not_found", "unknown mock order", 404);
  return Response.redirect(url, 303);
}
