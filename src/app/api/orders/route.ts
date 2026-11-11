import { handle, createOrder } from "@/server/service";
import { sid } from "@/server/session";

export async function POST(req: Request) {
  return handle(async () => createOrder(await sid(), await req.json().catch(() => null)), { status: 201 });
}
