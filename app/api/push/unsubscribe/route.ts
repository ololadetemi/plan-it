import { pushSubs } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const b = await req.json().catch(() => ({}));
  if (typeof b.endpoint === "string") await (await pushSubs()).deleteOne({ endpoint: b.endpoint, userId: a.uid });
  return Response.json({ ok: true });
}
