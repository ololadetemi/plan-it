import { tasks } from "@/lib/db";
import { bad, cleanTask, requireUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const c = cleanTask(await req.json().catch(() => ({})), true);
  if ("error" in c) return bad(c.error);
  const r = await (await tasks()).findOneAndUpdate({ _id: id, userId: a.uid }, { $set: c.ok }, { returnDocument: "after" });
  if (!r) return bad("Task not found.", 404);
  const { userId, _id, ...rest } = r;
  return Response.json({ ...rest, id: _id });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const r = await (await tasks()).deleteOne({ _id: id, userId: a.uid });
  if (!r.deletedCount) return bad("Task not found.", 404);
  return Response.json({ ok: true });
}
