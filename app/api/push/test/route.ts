import { bad, requireUser } from "@/lib/api";
import { sendToUser } from "@/lib/push";

export async function POST() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  try {
    const n = await sendToUser(a.uid, { title: "Plan-it notifications are on", body: "You will get your check-ins here.", url: "/", tag: "test" });
    return n ? Response.json({ ok: true, sent: n }) : bad("No device is subscribed yet.", 404);
  } catch (e: any) { return bad(e.message, 500); }
}
