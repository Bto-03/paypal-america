import { handle, causes } from "@/server/service";
import { sid } from "@/server/session";

export async function GET(req: Request) {
  return handle(async () => causes(await sid(), new URL(req.url).searchParams.get("regionId")));
}
