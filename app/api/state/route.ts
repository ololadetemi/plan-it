import { tasks } from "@/lib/db";
import { getProfile, requireUser } from "@/lib/api";

// One call returns everything the planner needs; also what other devices poll for sync.
export async function GET() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const [profile, list] = await Promise.all([
    getProfile(a.uid),
    (await tasks()).find({ userId: a.uid, archived: { $ne: true } }).sort({ order: 1 }).toArray(),
  ]);
  return Response.json({
    profile,
    tasks: list.map(({ userId, _id, ...t }: any) => ({ ...t, id: _id })),
  });
}
