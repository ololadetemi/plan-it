import { ObjectId } from "mongodb";
import { getUserId } from "./session";
import { users } from "./db";

export const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Returns the signed-in user's id, or a 401 Response. */
export async function requireUser(): Promise<{ uid: string } | { res: Response }> {
  const uid = await getUserId();
  if (!uid) return { res: bad("Sign in first.", 401) };
  return { uid };
}

export const DEFAULT_PROFILE = {
  name: "",
  theme: "pink",
  categories: ["Personal", "Work"] as string[],
  times: ["08:00", "12:00", "16:00", "20:00"] as string[],
  planEnabled: true,
  planTime: "21:00",
  timezone: "UTC",
  setupDone: false,
  celebrated: [] as string[],
};

export async function getProfile(uid: string) {
  const u = await (await users()).findOne({ _id: new ObjectId(uid) });
  return u ? { ...DEFAULT_PROFILE, ...(u.profile ?? {}) } : null;
}

const THEMES = ["pink", "blue", "amber", "green", "mono"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (v: unknown): v is string => typeof v === "string" && DATE.test(v);
export const isTime = (v: unknown): v is string => typeof v === "string" && TIME.test(v);

/** Validates a full or partial profile; returns cleaned fields or an error string. */
export function cleanProfile(b: any): { ok: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};
  if ("name" in b) {
    const n = String(b.name ?? "").trim();
    if (!n || n.length > 40) return { error: "Enter a name or nickname (40 characters or fewer)." };
    out.name = n;
  }
  if ("theme" in b) {
    if (!THEMES.includes(b.theme)) return { error: "Unknown theme." };
    out.theme = b.theme;
  }
  if ("categories" in b) {
    if (!Array.isArray(b.categories) || b.categories.length > 5) return { error: "Up to 5 categories." };
    const cats = b.categories.map((c: unknown) => String(c ?? "").trim());
    if (cats.some((c: string) => !c || c.length > 40)) return { error: "Category names must be 1 to 40 characters." };
    if (new Set(cats.map((c: string) => c.toLowerCase())).size !== cats.length) return { error: "Category names must be different." };
    out.categories = cats;
  }
  if ("times" in b) {
    if (!Array.isArray(b.times) || b.times.length > 4 || !b.times.every(isTime)) return { error: "Up to 4 valid check-in times." };
    out.times = b.times;
  }
  if ("planEnabled" in b) out.planEnabled = !!b.planEnabled;
  if ("planTime" in b) {
    if (!isTime(b.planTime)) return { error: "Enter a valid planning time." };
    out.planTime = b.planTime;
  }
  if ("timezone" in b) {
    try { Intl.DateTimeFormat(undefined, { timeZone: String(b.timezone) }); } catch { return { error: "Unknown time zone." }; }
    out.timezone = String(b.timezone);
  }
  if ("setupDone" in b) out.setupDone = !!b.setupDone;
  if ("celebrated" in b) {
    if (!Array.isArray(b.celebrated) || b.celebrated.length > 200) return { error: "Invalid celebrations." };
    out.celebrated = b.celebrated.map((x: unknown) => String(x).slice(0, 20));
  }
  return { ok: out };
}

const PRIOS = ["low", "normal", "high"];
/** Validates task fields. `partial` allows omitting fields (PATCH). */
export function cleanTask(b: any, partial: boolean): { ok: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};
  const has = (k: string) => k in b;
  if (!partial || has("title")) {
    const t = String(b.title ?? "").trim();
    if (!t || t.length > 200) return { error: "Enter a task title (200 characters or fewer)." };
    out.title = t;
  }
  if (!partial || has("category")) {
    const c = String(b.category ?? "").trim();
    if (!c || c.length > 40) return { error: "Choose a category." };
    out.category = c;
  }
  if (!partial || has("date")) {
    if (!isDate(b.date)) return { error: "Choose a valid date." };
    out.date = b.date;
  }
  if (!partial || has("priority")) {
    if (!PRIOS.includes(b.priority ?? "normal")) return { error: "Priority must be low, normal or high." };
    out.priority = b.priority ?? "normal";
  }
  if (!partial || has("dueTime")) {
    if (b.dueTime != null && b.dueTime !== "" && !isTime(b.dueTime)) return { error: "Enter a valid due time." };
    out.dueTime = b.dueTime || null;
  }
  const pr = (out.priority ?? b.priority) as string | undefined;
  if (pr === "high" && !partial && !out.dueTime) return { error: "High priority tasks need a due time." };
  if (out.priority && out.priority !== "high") out.dueTime = null;
  if (has("done")) out.done = !!b.done;
  if (has("doneAt")) out.doneAt = typeof b.doneAt === "number" ? b.doneAt : null;
  if (has("fav")) out.fav = !!b.fav;
  if (has("order") && typeof b.order === "number") out.order = b.order;
  return { ok: out };
}
