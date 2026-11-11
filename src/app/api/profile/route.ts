import { handle, updateProfile } from "@/server/service";
import { sid } from "@/server/session";

export async function PATCH(req: Request) {
  return handle(async () => updateProfile(await sid(), await req.json().catch(() => null)));
}
