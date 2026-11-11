import type { ErrorCode, Meta } from "./contract.ts";
import { mode } from "./paypal.ts";

function meta(): Meta {
  let m: Meta["mode"] = "sandbox";
  try {
    m = mode();
  } catch {
    // live refused: report sandbox, the error path already explains it
  }
  return { mode: m, generatedAt: new Date().toISOString() };
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data, meta: meta() }, init);
}

export function fail(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message }, meta: meta() }, { status });
}
