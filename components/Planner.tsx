"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PALETTE, addDays, api, fmtDate, fmtTime, sortTasks, todayStr, tomorrowStr, ymd, type Profile, type Task,
} from "@/lib/client";
import type { Pwa } from "./usePwa";
import {
  COUNT_LINES, ENCOURAGE, ENCOURAGE_ALL, QUOTES, STREAK_LINES, STREAK_MILESTONES, THEME_META, isCountMilestone,
} from "@/lib/content";

type View = "today" | "tomorrow" | "later" | "done";
const NEW_CAT = "__new__";
const CONFETTI_COLORS = ["#e58fb0", "#c2467f", "#9b83cf", "#f7c6da", "#fbd9cc"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

type Toast = { text: string; action?: { label: string; fn: () => void } } | null;
type Overlay = { title: string; sub: string } | null;

export default function Planner({ profile, tasks, setTasks, reload, saveProfile, onEditProfile, onSignOut, pwa }: {
  profile: Profile; tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; reload: () => void;
  saveProfile: (p: Partial<Profile>) => Promise<void>; onEditProfile: () => void; onSignOut: () => void; pwa: Pwa;
}) {
  const meta = THEME_META[profile.theme] ?? THEME_META.pink;
  const [view, setView] = useState<View>("today");
  useEffect(() => { // opened from a notification, e.g. /?view=tomorrow
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "tomorrow" || v === "later" || v === "done") setView(v);
  }, []);
  const [quote, setQuote] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [celebration, setCelebration] = useState<Overlay>(null);
  const [recap, setRecap] = useState(false);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [prioOpen, setPrioOpen] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [, tick] = useState(0);

  // form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(profile.categories[0] ?? "");
  const [newCat, setNewCat] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [dueTime, setDueTime] = useState("");
  const [formErr, setFormErr] = useState("");

  const newQuote = useCallback(() => setQuote((q) => { let n; do { n = pick(QUOTES); } while (QUOTES.length > 1 && n === q); return n; }), []);
  useEffect(() => { newQuote(); }, [newQuote]);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { setDate(""); }, [view]);
  useEffect(() => {
    if (!profile.categories.includes(category) && category !== NEW_CAT) setCategory(profile.categories[0] ?? "");
  }, [profile.categories, category]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".prio-wrap")) setPrioOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const today = todayStr(), tomorrow = tomorrowStr();
  const catColor = (c: string) => PALETTE[Math.max(0, profile.categories.indexOf(c)) % PALETTE.length];

  function showToast(text: string, action?: { label: string; fn: () => void }) {
    setToast({ text, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2800);
  }

  function fireConfetti(count = 70) {
    const layer = confettiRef.current;
    if (!layer) return;
    const w = layer.clientWidth || 380;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      const size = 5 + Math.random() * 6, circle = Math.random() < 0.4;
      p.style.width = size + "px";
      p.style.height = (circle ? size : size * 1.8) + "px";
      p.style.left = Math.random() * w + "px";
      p.style.background = pick(CONFETTI_COLORS);
      if (circle) p.style.borderRadius = "50%";
      const dur = 1.6 + Math.random() * 1.2, delay = Math.random() * 0.35;
      p.style.setProperty("--spin", (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360) + "deg");
      p.style.animation = `confettiFall ${dur}s ease-in ${delay}s forwards`;
      layer.append(p);
      setTimeout(() => p.remove(), (dur + delay) * 1000 + 100);
    }
  }
  function celebrate(t: string, s: string) { setCelebration({ title: t, sub: s }); fireConfetti(); }

  /* ---------- derived ---------- */
  const viewTasks = useMemo(() => {
    if (view === "today") return tasks.filter((t) => t.date === today || (t.date < today && (!t.done || (t.doneAt && ymd(new Date(t.doneAt)) === today))));
    if (view === "tomorrow") return tasks.filter((t) => t.date === tomorrow);
    if (view === "done") return tasks.filter((t) => t.done && t.doneAt);
    return tasks.filter((t) => t.date > tomorrow);
  }, [tasks, view, today, tomorrow]);

  /* ---------- mutations (optimistic, then server) ---------- */
  function patch(id: string, p: Partial<Task>) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
    api(`/api/tasks/${id}`, "PATCH", p).catch((e) => { showToast(e.message); reload(); });
  }

  function toggleDone(t: Task) {
    const done = !t.done;
    const doneAt = done ? Date.now() : null;
    const before = tasks;
    patch(t.id, { done, doneAt });
    if (!done) return;
    const after = before.map((x) => (x.id === t.id ? { ...x, done, doneAt } : x));
    const total = after.filter((x) => x.done).length;
    const firstToday = !before.some((x) => x.done && x.doneAt && ymd(new Date(x.doneAt)) === today);
    const days = new Set(after.filter((x) => x.done && x.doneAt).map((x) => ymd(new Date(x.doneAt!))));
    let streak = 0;
    for (let i = 0; days.has(addDays(-i)); i++) streak++;

    const seen = new Set(profile.celebrated);
    const countKey = `count-${total}`, streakKey = `streak-${streak}-${today}`;
    if (isCountMilestone(total) && !seen.has(countKey)) {
      const [a, b] = COUNT_LINES[total] ?? [`${total} tasks completed`, days.size > 1 ? `Across ${days.size} days. That's real momentum.` : "That's real momentum. Be proud of this stretch."];
      celebrate(a, b);
      saveProfile({ celebrated: [...seen, countKey] });
    } else if (firstToday && STREAK_MILESTONES.includes(streak) && !seen.has(streakKey)) {
      const [a, b] = STREAK_LINES[streak];
      celebrate(a, b);
      saveProfile({ celebrated: [...seen, streakKey] });
    } else {
      const list = viewTasks.map((x) => (x.id === t.id ? { ...x, done } : x));
      const all = view === "today" && list.length > 0 && list.every((x) => x.done);
      showToast(pick(all ? ENCOURAGE_ALL : ENCOURAGE));
    }
  }

  function removeTask(t: Task) {
    setTasks((ts) => ts.filter((x) => x.id !== t.id));
    api(`/api/tasks/${t.id}`, "DELETE").catch(reload);
    showToast(`Deleted "${t.title}"`, {
      label: "Undo",
      fn: () => {
        setTasks((ts) => [...ts, t]);
        const { id, ...rest } = t;
        api("/api/tasks", "POST", { id, ...rest }).catch((e) => { showToast(e.message); reload(); });
      },
    });
  }

  function moveTask(t: Task, dir: -1 | 1, tier: Task[]) {
    const i = tier.findIndex((x) => x.id === t.id), o = tier[i + dir];
    if (!o) return;
    const a = t.order, b = o.order;
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, order: b } : x.id === o.id ? { ...x, order: a } : x)));
    Promise.all([api(`/api/tasks/${t.id}`, "PATCH", { order: b }), api(`/api/tasks/${o.id}`, "PATCH", { order: a })]).catch(reload);
  }

  async function addTask() {
    const name = title.trim();
    if (!name) { titleRef.current?.focus(); return; }
    let cat = category;
    let cats = profile.categories;
    if (cat === NEW_CAT) {
      const n = newCat.trim();
      if (!n) return showErr("Type a name for the new category.");
      const ex = cats.find((c) => c.toLowerCase() === n.toLowerCase());
      if (ex) cat = ex;
      else if (cats.length >= 5) return showErr("You can have up to 5 categories.");
      else { cat = n; cats = [...cats, n]; }
    }
    if (priority === "high" && !dueTime) return showErr("High priority tasks need a due time.");
    const t: Task = {
      id: uid(), title: name, category: cat, priority, date: date || defaultDate(), dueTime: priority === "high" ? dueTime : null,
      done: false, doneAt: null, order: Math.max(0, ...tasks.map((x) => x.order)) + 1,
    };
    try {
      if (cats !== profile.categories) await saveProfile({ categories: cats });
      setTasks((ts) => [...ts, t]);
      await api("/api/tasks", "POST", t);
    } catch (e: any) { showErr(e.message); reload(); return; }
    setTitle(""); setNewCat(""); setCategory(cat); setPriority("normal"); setDueTime("");
    setReuseOpen(false);
    titleRef.current?.focus();
  }
  function showErr(m: string) { setFormErr(m); setTimeout(() => setFormErr((x) => (x === m ? "" : x)), 3500); }
  const defaultDate = () => (view === "tomorrow" ? tomorrow : view === "later" ? addDays(2) : today);

  /* ---------- reuse ---------- */
  const favorites = useMemo(() => { const m = new Map<string, Task>(); tasks.forEach((t) => t.fav && m.set(t.title.toLowerCase(), t)); return [...m.values()]; }, [tasks]);
  const recents = useMemo(() => {
    const fav = new Set(favorites.map((t) => t.title.toLowerCase()));
    const seen = new Map<string, Task>();
    [...tasks].sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0) || b.date.localeCompare(a.date)).forEach((t) => {
      const k = t.title.toLowerCase();
      if (!fav.has(k) && !seen.has(k) && seen.size < 8) seen.set(k, t);
    });
    return [...seen.values()];
  }, [tasks, favorites]);
  function applyReuse(t: Task) {
    setTitle(t.title); setPriority(t.priority);
    setCategory(profile.categories.includes(t.category) ? t.category : profile.categories[0] ?? "");
    setReuseOpen(false); titleRef.current?.focus();
  }
  const reuseChip = (t: Task, fav: boolean) => (
    <button key={t.id} className="reuse-chip" type="button" onClick={() => applyReuse(t)}>
      <span className="r-dot" style={{ background: catColor(t.category) }} />{t.title}{fav && <span className="r-star">★</span>}
    </button>
  );

  /* ---------- rendering pieces ---------- */
  const hr = new Date().getHours();
  const greeting = `${hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening"}, ${profile.name}`;
  const dateLine = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const doneCount = viewTasks.filter((t) => t.done).length;
  const progMsg = !viewTasks.length ? "A clear page" : doneCount === viewTasks.length ? "All done. Rest well" : doneCount === 0 ? "Small steps count" : doneCount / viewTasks.length >= 0.5 ? "More than halfway" : "Nice start";
  const n = viewTasks.length;
  const progCount = view === "today" ? `${doneCount} of ${n} done` : view === "tomorrow" ? `${n} planned for tomorrow` : view === "done" ? `${n} crossed off recently` : `${n} saved for later`;
  const progPct = view === "today" && n ? Math.round((doneCount / n) * 100) : 0;

  function taskRow(t: Task, showCat: boolean, tier: Task[]) {
    const i = tier.findIndex((x) => x.id === t.id);
    return (
      <div className={"task" + (t.done ? " done" : "")} key={t.id}>
        <button className="check" title={t.done ? "Mark as not done" : "Mark as done"} aria-label={t.title} onClick={() => toggleDone(t)}>
          {t.done && (meta.checkIcon ? <svg><use href={`#${meta.checkIcon}`} /></svg> : meta.checkGlyph)}
        </button>
        <div className="t-body">
          <div className="t-title">{t.title}</div>
          {(t.priority !== "normal" || (view === "today" && t.date < today) || showCat) && (
            <div className="t-meta">
              {t.priority === "high" && <span className="tag high">{t.dueTime ? `high · by ${fmtTime(t.dueTime)}` : "high"}</span>}
              {t.priority === "low" && <span className="tag low">low</span>}
              {view === "today" && t.date < today && <span className="tag early">from {fmtDate(t.date)}</span>}
              {showCat && <span className="tag cat" style={{ background: catColor(t.category) }}>{t.category}</span>}
            </div>
          )}
        </div>
        <div className="acts">
          {!t.done && tier.length > 1 && (<>
            <button className="act" title="Move up" aria-label="Move up" disabled={i <= 0} onClick={() => moveTask(t, -1, tier)}>↑</button>
            <button className="act" title="Move down" aria-label="Move down" disabled={i >= tier.length - 1} onClick={() => moveTask(t, 1, tier)}>↓</button>
          </>)}
          <button className={"star" + (t.fav ? " on" : "")} title={t.fav ? "Remove from favorites" : "Save as a favorite task"} aria-label="Toggle favorite" onClick={() => patch(t.id, { fav: !t.fav })}>{t.fav ? "★" : "☆"}</button>
          {!t.done && view === "today" && <button className="act" title="Move to tomorrow" aria-label="Move to tomorrow" onClick={() => patch(t.id, { date: tomorrow })}>↷</button>}
          <button className="act" title="Delete" aria-label="Delete task" onClick={() => removeTask(t)}>×</button>
        </div>
      </div>
    );
  }
  // reorder arrows only move a task within its own priority tier
  const tierOf = (t: Task, items: Task[]) => items.filter((x) => !x.done && x.priority === t.priority);

  function renderList() {
    if (!viewTasks.length) {
      const msg = view === "today" ? "Nothing on for today yet ♡" : view === "tomorrow" ? "Tomorrow is a blank page. Add a few things below." : view === "done" ? "Nothing crossed off yet. Finish a task and it will show up here." : "Nothing saved for later. Add a task with a future date.";
      return <div className="empty"><svg className="empty-bow" aria-hidden="true"><use href={`#${meta.icon}`} /></svg>{msg}</div>;
    }
    if (view === "done") {
      const keys = Array.from({ length: 7 }, (_, i) => addDays(-i));
      const byDay = new Map<string, Task[]>(keys.map((k) => [k, []]));
      let older = 0;
      for (const t of viewTasks) {
        const k = ymd(new Date(t.doneAt!));
        if (byDay.has(k)) byDay.get(k)!.push(t); else older++;
      }
      const days = keys.filter((k) => byDay.get(k)!.length);
      return (<>
        {!days.length && <div className="empty">Nothing crossed off in the last 7 days.</div>}
        {days.map((k) => {
          const items = byDay.get(k)!.sort((a, b) => b.doneAt! - a.doneAt!);
          const label = k === today ? "Today" : k === addDays(-1) ? "Yesterday" : fmtDate(k);
          return <div className="done-day" key={k}><div className="done-day-label">{label} · {items.length} done</div>{items.map((t) => taskRow(t, true, []))}</div>;
        })}
        {older > 0 && <div className="archived-note">{older} {older === 1 ? "task" : "tasks"} from before that {older === 1 ? "is" : "are"} archived, not deleted.</div>}
      </>);
    }
    if (view === "later") {
      return <>{[...new Set(viewTasks.map((t) => t.date))].sort().map((d) => {
        const items = viewTasks.filter((t) => t.date === d).sort(sortTasks);
        return <div className="group" key={d}><div className="g-head">{fmtDate(d)}</div>{items.map((t) => taskRow(t, true, tierOf(t, items)))}</div>;
      })}</>;
    }
    const used = [...new Set(viewTasks.map((t) => t.category))];
    const order = [...profile.categories.filter((c) => used.includes(c)), ...used.filter((c) => !profile.categories.includes(c))];
    return <>{order.map((c) => {
      const items = viewTasks.filter((t) => t.category === c).sort(sortTasks);
      return (
        <div className="group" key={c}>
          <div className="g-head"><span className="dot" style={{ background: catColor(c) }} />{c}<span className="g-count">{items.filter((t) => t.done).length}/{items.length}</span></div>
          {items.map((t) => taskRow(t, false, tierOf(t, items)))}
        </div>
      );
    })}</>;
  }

  // weekly recap
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
  const recent = tasks.filter((t) => t.done && t.doneAt && t.doneAt >= weekAgo.getTime());
  const byCat: Record<string, number> = {};
  recent.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + 1; });
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const prioLabel = { low: "Low priority", normal: "Normal priority", high: "High priority" }[priority];

  return (
    <div className="pl-win" id="win" data-theme={profile.theme}>
      <div className="card">
        <div className="lace" />
        <svg className="topbow" aria-hidden="true"><use href={`#${meta.icon}`} /></svg>
        <div className="confetti-layer" ref={confettiRef} style={{ zIndex: 45 }} />
        <div className={"celebrate" + (celebration ? " show" : "")}>
          <svg className="c-icon" aria-hidden="true"><use href={`#${meta.icon}`} /></svg>
          <p className="c-title">{celebration?.title}</p>
          <p className="c-sub">{celebration?.sub}</p>
          <button className="c-close" onClick={() => setCelebration(null)}>Keep going</button>
        </div>
        <div className={"recap" + (recap ? " show" : "")}>
          <svg className="c-icon" aria-hidden="true" style={{ width: 40, height: 40 }}><use href={`#${meta.icon}`} /></svg>
          <p className="recap-title">Your week</p>
          <p className="recap-count">{recent.length}</p>
          <p className="recap-count-label">tasks crossed off in the last 7 days</p>
          <div className="recap-cats">
            {topCats.length ? topCats.map(([c, k]) => <div className="recap-row" key={c}><span>{c}</span><span className="recap-n">{k}</span></div>)
              : <div className="recap-empty">Nothing crossed off yet. This fills in as you go.</div>}
          </div>
          <button className="c-close" onClick={() => setRecap(false)}>Nice</button>
        </div>

        <div className="top">
          <span className="spark">{meta.spark}</span>
          <span style={{ display: "flex", gap: 2 }}>
            <button className="x pl-top-btn" onClick={() => { setRecap(true); fireConfetti(35); }}>This week</button>
            {pwa.canInstall && <button className="x pl-top-btn" title="Install Plan-it as an app" onClick={async () => showToast(await pwa.install())}>Install</button>}
            {pwa.pushSupported && <button className="x" title={pwa.subscribed ? "Notifications are on. Tap to turn off." : "Turn on notifications"} aria-label="Notifications" style={{ fontSize: 14, opacity: pwa.subscribed ? 1 : 0.55 }} onClick={async () => showToast(await pwa.toggleNotifications().catch((e) => e.message))}>{pwa.subscribed ? "🔔" : "🔕"}</button>}
            <button className="x" title="Edit profile" aria-label="Edit profile" style={{ fontSize: 14 }} onClick={onEditProfile}>⚙</button>
            <button className="x pl-top-btn" onClick={onSignOut}>Sign out</button>
          </span>
        </div>
        <header>
          <h1>{greeting}</h1>
          <p className="dateline">{dateLine}</p>
        </header>
        <p className="quote" role="button" tabIndex={0} title="Tap for another" onClick={newQuote} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && newQuote()}>{quote}</p>

        <section className="progress">
          <div className="prog-row"><span className="prog-count">{progCount}</span><span className="prog-msg">{view === "today" ? progMsg : ""}</span></div>
          <div className="bar"><div style={{ width: `${progPct}%` }} /></div>
        </section>

        <nav className="tabs">
          {(["today", "tomorrow", "later", "done"] as View[]).map((v) => (
            <button key={v} className={"tab" + (view === v ? " on" : "")} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </nav>

        <main>{renderList()}</main>

        <footer className="add">
          <div className={"toast" + (toast ? " show" : "")} role="status" aria-live="polite">
            {toast && !toast.action && <svg aria-hidden="true"><use href={`#${meta.icon}`} /></svg>}
            <span className="toast-text">{toast?.text}</span>
            {toast?.action && <button className="toast-action" onClick={() => { toast.action!.fn(); setToast(null); clearTimeout(toastTimer.current); }}>{toast.action.label}</button>}
          </div>
          <div className={"reuse-panel" + (reuseOpen ? " show" : "")}>
            <div className="reuse-head"><span className="reuse-title">Reuse a task</span><button className="reuse-close" aria-label="Close" onClick={() => setReuseOpen(false)}>×</button></div>
            <div>
              {!favorites.length && !recents.length && <div className="reuse-empty">Nothing saved yet. Star a task, or finish a few, and they will show up here.</div>}
              {favorites.length > 0 && (<><div className="reuse-sec-label">Favorites</div><div className="reuse-list">{favorites.map((t) => reuseChip(t, true))}</div></>)}
              {recents.length > 0 && (<><div className="reuse-sec-label">Recently used</div><div className="reuse-list">{recents.map((t) => reuseChip(t, false))}</div></>)}
            </div>
          </div>
          <div className="titlerow">
            <input type="text" id="titleIn" ref={titleRef} placeholder="Add a task ♡" maxLength={120} autoComplete="off" value={title}
              onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <button className="reuse-btn" type="button" title="Reuse a past task" onClick={() => setReuseOpen((o) => !o)}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 10a6 6 0 1 1 1.8 4.3M4 10V5m0 5h5" /></svg>Reuse
            </button>
          </div>
          <div className="row">
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {profile.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              {profile.categories.length < 5 && <option value={NEW_CAT}>＋ New category</option>}
            </select>
            {category === NEW_CAT && <input type="text" placeholder="New category" maxLength={24} autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />}
            <input type="date" aria-label="Due date" min={today} value={date || defaultDate()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="row">
            <div className="prio-wrap">
              <button type="button" className="prio-btn" data-p={priority} onClick={() => setPrioOpen((o) => !o)}><span className="p-dot" /><span>{prioLabel}</span></button>
              <div className={"prio-pop" + (prioOpen ? " show" : "")}>
                {(["low", "normal", "high"] as const).map((p) => (
                  <button key={p} type="button" className="prio-opt" data-p={p} onClick={() => { setPriority(p); setPrioOpen(false); }}>
                    <span className="p-dot" />{p === "high" ? "High (needs a time)" : p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {priority === "high" && <input type="time" aria-label="Due time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />}
            <button id="addBtn" onClick={addTask}>Add</button>
          </div>
          <p className="err">{formErr}</p>
        </footer>
      </div>
    </div>
  );
}
