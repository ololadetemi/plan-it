import { ObjectId } from "mongodb";
import { users } from "@/lib/db";
import { bad, cleanProfile, getProfile, requireUser } from "@/lib/api";

export async function GET() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  return Response.json(await getProfile(a.uid));
}

export async function PUT(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const c = cleanProfile(await req.json().catch(() => ({})));
  if ("error" in c) return bad(c.error);
  const set = Object.fromEntries(Object.entries(c.ok).map(([k, v]) => [`profile.${k}`, v]));
  await (await users()).updateOne({ _id: new ObjectId(a.uid) }, { $set: set });
  return Response.json(await getProfile(a.uid));
}
