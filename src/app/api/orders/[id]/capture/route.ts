import { handle, captureOrder } from "@/server/service";
import { sid } from "@/server/session";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => captureOrder(await sid(), (await params).id));
}
