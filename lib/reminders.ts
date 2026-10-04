import { pushSubs, reminderLog, tasks, users } from "./db";
import { sendToUser } from "./push";

const CATCH_UP_MIN = 20; // if the scheduler runs late, still send a slot that passed this recently
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Local date and minutes-since-midnight in an IANA time zone. */
export function localNow(now: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(now).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Claims a send slot. Returns false if it was already sent (so repeated pings never double-notify). */
async function claim(userId: string, key: string) {
  try { await (await reminderLog()).insertOne({ userId, key, createdAt: new Date() }); return true; }
  catch (e: any) { if (e?.code === 11000) return false; throw e; }
}

export async function runReminders(now = new Date()) {
  const userIds: string[] = await (await pushSubs()).distinct("userId");
  const { ObjectId } = await import("mongodb");
  let sent = 0, considered = 0;

  for (const uid of userIds) {
    const u = await (await users()).findOne({ _id: new ObjectId(uid) });
    const p = u?.profile;
    if (!p?.setupDone) continue;
    let tz = p.timezone || "UTC";
    try { Intl.DateTimeFormat(undefined, { timeZone: tz }); } catch { tz = "UTC"; }
    const { date, minutes } = localNow(now, tz);

    const open = await (await tasks()).find({ userId: uid, done: false, archived: { $ne: true }, date: { $lte: date } }).sort({ order: 1 }).toArray();
    const name = p.name || "there";

    // Check-in times
    const slots: { at: number; kind: "checkin" | "plan" }[] = (p.times ?? []).map((t: string) => ({ at: toMin(t), kind: "checkin" as const }));
    if (p.planEnabled && p.planTime) slots.push({ at: toMin(p.planTime), kind: "plan" });
    for (const s of slots) {
      if (minutes < s.at || minutes - s.at >= CATCH_UP_MIN) continue;
      considered++;
      if (s.kind === "checkin" && !open.length) continue; // nothing to nudge about
      if (!(await claim(uid, `${date}|${hhmm(s.at)}|${s.kind}`))) continue;
      const titles = open.slice(0, 3).map((t: any) => t.title).join(", ");
      const payload = s.kind === "plan"
        ? open.length
          ? { title: "Time to plan tomorrow", body: `${open.length} ${open.length === 1 ? "task is" : "tasks are"} still open from today. Open Plan-it to bring ${open.length === 1 ? "it" : "them"} along.`, url: "/?view=tomorrow", tag: "plan", badgeCount: open.length }
          : { title: "Time to plan tomorrow", body: "Everything's ticked off for today. What's on for tomorrow?", url: "/?view=tomorrow", tag: "plan", badgeCount: 0 }
        : { title: `${name}, ${open.length} ${open.length === 1 ? "task" : "tasks"} open today`, body: titles + (open.length > 3 ? ` and ${open.length - 3} more` : ""), url: "/", tag: "checkin", badgeCount: open.length };
      sent += (await sendToUser(uid, payload)) > 0 ? 1 : 0;
    }

    // High priority tasks: remind during the hour before they are due
    for (const t of open.filter((x: any) => x.priority === "high" && x.date === date && x.dueTime)) {
      const due = toMin(t.dueTime);
      if (minutes < due - 60 || minutes >= due) continue;
      considered++;
      if (!(await claim(uid, `due|${t._id}|${date}`))) continue;
      const left = due - minutes;
      sent += (await sendToUser(uid, {
        title: left >= 50 ? "One hour to go" : `${left} ${left === 1 ? "minute" : "minutes"} to go`,
        body: t.title, url: "/", tag: `due-${t._id}`, badgeCount: open.length,
      })) > 0 ? 1 : 0;
    }
  }
  return { users: userIds.length, considered, sent };
}
