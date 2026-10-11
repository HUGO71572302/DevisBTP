import { currentUser, json, publicUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return json({ user: null }, 401);
  return json({ user: publicUser(u) });
}
