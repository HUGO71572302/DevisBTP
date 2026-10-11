import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userData, users } from "@/db/schema";
import { createSession, ensureSchema, hashPassword, json, publicUser } from "@/lib/auth-server";
import { formatPhone, normalizePhone, starterDoc } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSchema();
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = String(body.name ?? "").trim();
  const company = String(body.company ?? "").trim();
  const city = String(body.city ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Indiquez votre nom";
  if (phone.length < 8 || phone.length > 15) errors.phone = "Numéro invalide (8 chiffres)";
  if (password.length < 6) errors.password = "6 caractères minimum";
  if (Object.keys(errors).length) return json({ error: "Formulaire incomplet", errors }, 400);

  const exists = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  if (exists.length) return json({ error: "Ce numéro a déjà un compte. Connectez-vous.", errors: { phone: "Numéro déjà utilisé" } }, 409);

  const [u] = await db
    .insert(users)
    .values({ name, company, phone, passwordHash: await hashPassword(password), lastLoginAt: new Date() })
    .returning();
  await db.insert(userData).values({ userId: u.id, data: starterDoc({ name, company, phone: formatPhone(phone), city }), version: 1 });
  await createSession(u.id);
  return json({ user: publicUser(u) });
}
