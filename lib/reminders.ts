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
async function release(userId: string, key: string) {
  await (await reminderLog()).deleteOne({ userId, key });
}

async function claim(userId: string, key: string) {
  try { await (await reminderLog()).insertOne({ userId, key, createdAt: new Date() }); return true; }
  catch (e: any) { if (e?.code === 11000) return false; throw e; }
}

export async function runReminders(now = new Date()) {
  const userIds: string[] = await (await pushSubs()).distinct("userId");
  const { ObjectId } = await import("mongodb");
  let sent = 0, considered = 0;
  const errors: string[] = [];
  // Send, and free the slot again if nothing was delivered so the next ping retries it.
  const deliver = async (uid: string, key: string, payload: Parameters<typeof sendToUser>[1]) => {
    const r = await sendToUser(uid, payload);
    if (r.ok > 0) { sent++; return; }
    await release(uid, key);
    errors.push(...r.errors);
  };

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
      const slotKey = `${date}|${hhmm(s.at)}|${s.kind}`;
      if (!(await claim(uid, slotKey))) continue;
      const titles = open.slice(0, 3).map((t: any) => t.title).join(", ");
      const payload = s.kind === "plan"
        ? open.length
          ? { title: "Time to plan tomorrow", body: `${open.length} ${open.length === 1 ? "task is" : "tasks are"} still open from today. Open Plan-it to bring ${open.length === 1 ? "it" : "them"} along.`, url: "/?plan=1", tag: "plan", badgeCount: open.length }
          : { title: "Time to plan tomorrow", body: "Everything's ticked off for today. What's on for tomorrow?", url: "/?plan=1", tag: "plan", badgeCount: 0 }
        : { title: `${name}, ${open.length} ${open.length === 1 ? "task" : "tasks"} open today`, body: titles + (open.length > 3 ? ` and ${open.length - 3} more` : ""), url: "/", tag: "checkin", badgeCount: open.length };
      await deliver(uid, slotKey, payload);
    }

    // High priority tasks with a due time today: 1 hour before, 30 minutes before, and at the due time
    for (const t of open.filter((x: any) => x.priority === "high" && x.date === date && x.dueTime)) {
      const due = toMin(t.dueTime);
      for (const offset of [60, 30, 0]) {
        const point = due - offset;
        if (minutes < point || minutes - point >= CATCH_UP_MIN) continue;
        considered++;
        const dueKey = `due|${t._id}|${date}|${offset}`;
        if (!(await claim(uid, dueKey))) continue;
        const left = due - minutes;
        const text = (offset === 0 || left <= 0) ? "Due now" : left >= 50 ? "One hour to go" : `${left} ${left === 1 ? "minute" : "minutes"} to go`;
        await deliver(uid, dueKey, {
          title: text, body: t.title, tag: `due-${t._id}`, badgeCount: open.length,
          url: `/?reminder=${encodeURIComponent(`${text}: ${t.title}`.slice(0, 140))}`,
        });
      }
    }
  }
  return { users: userIds.length, considered, sent, errors: [...new Set(errors)] };
}
