export type Task = {
  id: string; title: string; category: string; date: string;
  priority: "low" | "normal" | "high"; dueTime: string | null;
  done: boolean; doneAt: number | null; fav?: boolean; order: number;
};
export type Profile = {
  name: string; theme: string; categories: string[]; times: string[];
  planEnabled: boolean; planTime: string; timezone: string; setupDone: boolean;
  celebrated: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const todayStr = () => ymd(new Date());
export const tomorrowStr = () => addDays(1);

export function fmtTime(t: string) {
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12}:${t.slice(3, 5)} ${h >= 12 ? "pm" : "am"}`;
}
export function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export const PALETTE = ["#f7c6da", "#ddd0f5", "#cfd8f7", "#fbd9cc", "#cdeee0", "#f8ecc2", "#f3cdea"];
const PRIO = { high: 0, normal: 1, low: 2 };
export function sortTasks(a: Task, b: Task) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (PRIO[a.priority] !== PRIO[b.priority]) return PRIO[a.priority] - PRIO[b.priority];
  if (a.priority === "high") {
    const dt = (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99");
    if (dt !== 0) return dt;
  }
  return a.order - b.order;
}

// Tracks in-flight writes so a background refresh never overwrites a change that has not landed yet.
export const writes = { pending: 0, lastDone: 0 };

export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const isWrite = method !== "GET";
  if (isWrite) writes.pending++;
  try { return await request<T>(url, method, body); }
  finally { if (isWrite) { writes.pending--; writes.lastDone = Date.now(); } }
}

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method, cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { window.location.href = "/login"; throw new Error("signed out"); }
  if (!r.ok) throw new Error(j.error || "Something went wrong.");
  return j;
}
