import { handle, dashboard } from "@/server/service";
import { sid } from "@/server/session";

export async function GET() {
  return handle(async () => dashboard(await sid()));
}
