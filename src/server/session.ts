import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const SID_COOKIE = "pa_sid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pure: keep a cookie value only if it looks like one of our UUIDs, else mint a new sid. */
export function resolveSid(value: string | undefined): { sid: string; isNew: boolean } {
  return value && UUID.test(value) ? { sid: value, isNew: false } : { sid: randomUUID(), isNew: true };
}

export async function sid(): Promise<string> {
  const jar = await cookies();
  const r = resolveSid(jar.get(SID_COOKIE)?.value);
  if (r.isNew) {
    jar.set(SID_COOKIE, r.sid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return r.sid;
}
