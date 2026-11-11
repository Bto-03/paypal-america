import { headers } from "next/headers";
import { insights } from "../../../server/insights.ts";
import { sid } from "../../../server/session.ts";
import { ok, fail } from "../../../server/http.ts";


export async function POST() {
  try {
    const lang = (await headers()).get("accept-language")?.trim().toLowerCase().startsWith("es") ? "es" : "en";
    return ok(await insights(await sid(), lang));
  } catch {
    return fail("internal", "Could not generate insights", 500);
  }
}
