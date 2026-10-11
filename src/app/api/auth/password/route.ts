import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser, hashPassword, json, revokeOtherSessions, verifyPassword } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return json({ error: "Non connecté" }, 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (!(await verifyPassword(String(body.current ?? ""), u.passwordHash))) return json({ error: "Mot de passe actuel incorrect" }, 400);
  const next = String(body.next ?? "");
  if (next.length < 6) return json({ error: "Nouveau mot de passe : 6 caractères minimum" }, 400);
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, u.id));
  // sécurité : les autres téléphones connectés à ce compte sont déconnectés
  await revokeOtherSessions(u.id);
  return json({ ok: true });
}
