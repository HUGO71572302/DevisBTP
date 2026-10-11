import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { clearFailures, ensureSchema, hashPassword, json } from "@/lib/auth-server";
import { normalizePhone } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * Réinitialisation d'un mot de passe par le développeur (mot de passe oublié).
 * Désactivé tant que la variable ADMIN_RESET_KEY n'est pas définie.
 * POST { phone, newPassword } avec l'en-tête  x-admin-key: <ADMIN_RESET_KEY>
 */
export async function POST(req: Request) {
  const key = process.env.ADMIN_RESET_KEY;
  if (!key || key.length < 12) return json({ error: "Désactivé" }, 404);
  if (req.headers.get("x-admin-key") !== key) return json({ error: "Refusé" }, 403);
  await ensureSchema();
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const phone = normalizePhone(String(body.phone ?? ""));
  const pw = String(body.newPassword ?? "");
  if (pw.length < 6) return json({ error: "6 caractères minimum" }, 400);
  const [u] = await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.phone, phone)).returning({ id: users.id });
  if (!u) return json({ error: "Compte introuvable" }, 404);
  await db.delete(sessions).where(eq(sessions.userId, u.id));
  await clearFailures(phone);
  return json({ ok: true });
}
