import bcrypt from "bcryptjs";
import crypto from "crypto";
import { users } from "@/lib/db";
import { createSession } from "@/lib/session";
import { validPassword } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!validPassword(b.password)) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const hash = crypto.createHash("sha256").update(String(b.token ?? "")).digest("hex");
  const c = await users();
  const u = await c.findOne({ resetTokenHash: hash, resetExpires: { $gt: new Date() } });
  if (!u) return Response.json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 400 });
  await c.updateOne({ _id: u._id }, { $set: { passwordHash: await bcrypt.hash(b.password, 10) }, $unset: { resetTokenHash: "", resetExpires: "" } });
  await createSession(u._id.toString());
  return Response.json({ ok: true });
}
