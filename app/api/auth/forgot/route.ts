import crypto from "crypto";
import { users } from "@/lib/db";
import { sendResetLink } from "@/lib/mail";
import { normEmail } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = normEmail(b.email);
  const c = await users();
  const u = await c.findOne({ email });
  if (u) {
    const token = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await c.updateOne({ _id: u._id }, { $set: { resetTokenHash: hash, resetExpires: new Date(Date.now() + 30 * 60 * 1000) } });
    const base = process.env.APP_URL || new URL(req.url).origin;
    await sendResetLink(email, `${base}/reset?token=${token}`);
  }
  // Same response either way so emails cannot be probed.
  return Response.json({ ok: true });
}
