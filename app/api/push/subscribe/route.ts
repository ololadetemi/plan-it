import { pushSubs } from "@/lib/db";
import { bad, requireUser } from "@/lib/api";

export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const b = await req.json().catch(() => ({}));
  const s = b.subscription;
  if (!s || typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth) return bad("Invalid subscription.");
  await (await pushSubs()).updateOne(
    { endpoint: s.endpoint },
    { $set: { userId: a.uid, keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) }, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  return Response.json({ ok: true });
}
