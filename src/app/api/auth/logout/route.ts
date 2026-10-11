import { destroySession, ensureSchema, json } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST() {
  await ensureSchema();
  await destroySession();
  return json({ ok: true });
}
