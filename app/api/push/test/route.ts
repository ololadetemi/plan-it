import { bad, requireUser } from "@/lib/api";
import { sendToUser } from "@/lib/push";
import { getProfile } from "@/lib/api";
import { tasks } from "@/lib/db";
import { localNow } from "@/lib/reminders";

export async function POST() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  try {
    const tz = (await getProfile(a.uid))?.timezone || "UTC";
    const { date } = localNow(new Date(), tz);
    const open = await (await tasks()).countDocuments({ userId: a.uid, done: false, archived: { $ne: true }, date: { $lte: date } });
    const n = await sendToUser(a.uid, { title: "Plan-it notifications are on", body: "You will get your check-ins here.", url: "/", tag: "test", badgeCount: open });
    return n.ok ? Response.json({ ok: true, sent: n.ok }) : bad(n.errors.join("; ") || "No device is subscribed yet.", n.errors[0]?.includes("no subscribed") ? 404 : 502);
  } catch (e: any) { return bad(e.message, 500); }
}
