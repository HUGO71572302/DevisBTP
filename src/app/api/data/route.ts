import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userData, users } from "@/db/schema";
import { currentUser, json } from "@/lib/auth-server";
import { emptyDoc, mergeDocs, normalizeDoc } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return json({ error: "Non connecté" }, 401);
  const [row] = await db.select().from(userData).where(eq(userData.userId, u.id)).limit(1);
  return json({ data: row ? normalizeDoc(row.data) : emptyDoc(), version: row?.version ?? 0 });
}

/** Reçoit la version du téléphone, fusionne avec celle du serveur et renvoie le résultat. */
export async function PUT(req: Request) {
  const u = await currentUser();
  if (!u) return json({ error: "Non connecté" }, 401);
  const body = (await req.json().catch(() => null)) as { data?: unknown } | null;
  if (!body?.data) return json({ error: "Données manquantes" }, 400);
  const incoming = normalizeDoc(body.data);

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${u.id}))`);
    const [row] = await tx.select().from(userData).where(eq(userData.userId, u.id)).limit(1);
    const merged = row ? mergeDocs(normalizeDoc(row.data), incoming) : incoming;
    const version = (row?.version ?? 0) + 1;
    if (row) await tx.update(userData).set({ data: merged, version, updatedAt: new Date() }).where(eq(userData.userId, u.id));
    else await tx.insert(userData).values({ userId: u.id, data: merged, version });
    // garde le nom d'entreprise du compte à jour
    if (merged.settings.name && merged.settings.name !== u.company) {
      await tx.update(users).set({ company: merged.settings.name }).where(eq(users.id, u.id));
    }
    return { merged, version };
  });
  return json({ data: result.merged, version: result.version });
}
