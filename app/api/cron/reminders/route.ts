import crypto from "crypto";
import { runReminders } from "@/lib/reminders";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const url = new URL(req.url);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  const a = crypto.createHash("sha256").update(given).digest(), b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

async function handle(req: Request) {
  const ok = authorized(req);
  if (ok === null) return Response.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (!ok) return Response.json({ error: "Unauthorized." }, { status: 401 });
  return Response.json({ ok: true, ...(await runReminders()) });
}
export const GET = handle;
export const POST = handle;
