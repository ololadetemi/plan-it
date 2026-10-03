import { tasks } from "@/lib/db";
import { bad, cleanTask, requireUser } from "@/lib/api";

const publicTask = ({ userId, ...t }: any) => ({ ...t, id: t._id, _id: undefined });

export async function GET() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const list = await (await tasks()).find({ userId: a.uid, archived: { $ne: true } }).sort({ order: 1 }).toArray();
  return Response.json(list.map(publicTask));
}

export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const b = await req.json().catch(() => ({}));
  const c = cleanTask(b, false);
  if ("error" in c) return bad(c.error);
  const col = await tasks();
  // A client may supply an id (used to restore a deleted task on Undo).
  const id = typeof b.id === "string" && /^[a-z0-9]{6,32}$/i.test(b.id) ? b.id : crypto.randomUUID().replace(/-/g, "");
  const last = await col.find({ userId: a.uid }).sort({ order: -1 }).limit(1).next();
  const doc = {
    _id: id, userId: a.uid, done: false, doneAt: null, fav: false,
    order: typeof b.order === "number" ? b.order : (last?.order ?? 0) + 1,
    createdAt: new Date(), ...c.ok,
  };
  try { await col.insertOne(doc); }
  catch (e: any) { if (e?.code === 11000) return bad("That task already exists.", 409); throw e; }
  return Response.json(publicTask(doc), { status: 201 });
}
