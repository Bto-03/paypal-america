import { handle, receipt } from "@/server/service";
import { sid } from "@/server/session";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => receipt(await sid(), (await params).id));
}
