import bcrypt from "bcryptjs";
import { users } from "@/lib/db";
import { createSession } from "@/lib/session";
import { normEmail } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const u = await (await users()).findOne({ email: normEmail(b.email) });
  const ok = u && typeof b.password === "string" && (await bcrypt.compare(b.password, u.passwordHash));
  if (!ok) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  await createSession(u!._id.toString());
  return Response.json({ ok: true });
}
