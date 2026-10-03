import bcrypt from "bcryptjs";
import { users } from "@/lib/db";
import { createSession } from "@/lib/session";
import { normEmail, validEmail, validPassword } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = normEmail(b.email);
  if (!validEmail(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!validPassword(b.password)) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const c = await users();
  try {
    const r = await c.insertOne({ email, passwordHash: await bcrypt.hash(b.password, 10), createdAt: new Date() });
    await createSession(r.insertedId.toString());
    return Response.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 11000) return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    throw e;
  }
}
