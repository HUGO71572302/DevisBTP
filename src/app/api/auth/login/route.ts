import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clearFailures, createSession, ensureSchema, json, publicUser, recordFailure, tooManyAttempts, verifyPassword } from "@/lib/auth-server";
import { normalizePhone } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSchema();
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  if (!phone || !password) return json({ error: "Numéro et mot de passe obligatoires" }, 400);
  const wait = await tooManyAttempts(phone);
  if (wait) return json({ error: `Trop d'essais. Réessayez dans ${wait} min.` }, 429);

  const [u] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    await recordFailure(phone);
    return json({ error: "Numéro ou mot de passe incorrect" }, 401);
  }
  await clearFailures(phone);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await createSession(u.id);
  return json({ user: publicUser(u) });
}
