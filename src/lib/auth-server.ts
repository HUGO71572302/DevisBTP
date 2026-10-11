import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies, headers } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { AuthUser } from "./types";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const COOKIE = "devis_session";
const SESSION_DAYS = 365;

let schemaReady: Promise<void> | null = null;
/** Crée les tables si besoin (filet de sécurité si la migration n'a pas été appliquée). */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          phone text NOT NULL UNIQUE,
          name text NOT NULL,
          company text NOT NULL DEFAULT '',
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          last_login_at timestamptz
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash text PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
        CREATE TABLE IF NOT EXISTS login_attempts (
          key text PRIMARY KEY,
          n integer NOT NULL DEFAULT 0,
          locked_until timestamptz
        );
        CREATE TABLE IF NOT EXISTS user_data (
          user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          data jsonb NOT NULL,
          version bigint NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function isHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return false;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: sha(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: await isHttps(), path: "/", expires: expiresAt });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha(token)));
  jar.delete(COOKIE);
}

export function publicUser(u: typeof users.$inferSelect): AuthUser {
  return { id: u.id, name: u.name, phone: u.phone, company: u.company, createdAt: u.createdAt.toISOString() };
}

export async function currentUser(): Promise<typeof users.$inferSelect | null> {
  await ensureSchema();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.u ?? null;
}

/* Limitation des tentatives de connexion – stockée en base, car Vercel redémarre ses serveurs
   (une limite gardée en mémoire était remise à zéro à chaque redémarrage). */
export async function tooManyAttempts(key: string): Promise<number> {
  const r = await db.execute(sql`SELECT locked_until FROM login_attempts WHERE key = ${key} AND locked_until > now()`);
  const until = (r.rows[0] as { locked_until?: string | Date } | undefined)?.locked_until;
  return until ? Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60000)) : 0;
}
export async function recordFailure(key: string): Promise<void> {
  // 5 échecs → blocage 5 min ; chaque nouvelle série de 5 échecs double le blocage (max 24 h)
  await db.execute(sql`
    INSERT INTO login_attempts (key, n) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET
      n = login_attempts.n + 1,
      locked_until = CASE WHEN (login_attempts.n + 1) % 5 = 0
        THEN now() + make_interval(mins => LEAST(1440, 5 * (2 ^ LEAST(9, ((login_attempts.n + 1) / 5) - 1))::int))
        ELSE login_attempts.locked_until END
  `);
}
export async function clearFailures(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM login_attempts WHERE key = ${key}`);
}

/** Ferme toutes les sessions de l'utilisateur sauf celle de ce téléphone. */
export async function revokeOtherSessions(userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  const keep = token ? sha(token) : "";
  await db.execute(sql`DELETE FROM sessions WHERE user_id = ${userId} AND token_hash <> ${keep}`);
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
