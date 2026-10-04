"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, todayStr, writes, type Profile, type Task } from "@/lib/client";
import Icons from "./Icons";
import Planner from "./Planner";
import Setup from "./Setup";
import { usePwa } from "./usePwa";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState(false);
  const pwa = usePwa();
  const [loadErr, setLoadErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null); // theme being tried in setup

  const reload = useCallback(async () => {
    try {
      const s = await api<{ profile: Profile; tasks: Task[] }>("/api/state");
      setProfile(s.profile); setTasks(s.tasks); setLoadErr("");
    } catch (e: any) { setLoadErr(e.message); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Sync: pick up changes made on other devices when this tab is visible, on focus, and every 15s.
  const editingRef = useRef(false);
  editingRef.current = editing;
  useEffect(() => {
    const refresh = async () => {
      if (document.hidden) return;
      const started = Date.now();
      try {
        const s = await api<{ profile: Profile; tasks: Task[] }>("/api/state");
        // Drop the result if a local write was in flight or finished after this request began.
        if (writes.pending > 0 || writes.lastDone >= started) return;
        setTasks(s.tasks);
        if (!editingRef.current) setProfile(s.profile);
      } catch { /* offline or signed out: try again next tick */ }
    };
    const timer = setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, []);

  // App icon badge: today's open tasks (including anything overdue). Pushes keep it current while the app is closed.
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!profile?.setupDone || !nav.setAppBadge) return;
    const today = todayStr();
    const n = tasks.filter((t) => !t.done && t.date <= today).length;
    (n > 0 ? nav.setAppBadge(n) : nav.clearAppBadge!()).catch(() => {});
  }, [tasks, profile?.setupDone]);

  const saveProfile = useCallback(async (p: Partial<Profile>) => {
    setProfile((x) => (x ? { ...x, ...p } : x));
    const saved = await api<Profile>("/api/profile", "PUT", p);
    setProfile(saved);
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    (navigator as any).clearAppBadge?.().catch?.(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="pl" data-theme={preview ?? profile?.theme ?? "pink"}>
      <Icons />
      {!profile ? (
        <p style={{ color: "#8a6f8e" }}>{loadErr || "Loading your planner..."}</p>
      ) : !profile.setupDone || editing ? (
        <Setup
          editing={profile.setupDone}
          initial={profile}
          onPreviewTheme={setPreview}
          onCancel={() => { setPreview(null); setEditing(false); }}
          onFinish={async (d) => {
            const first = !profile.setupDone;
            await saveProfile({ ...d, name: d.name.trim(), setupDone: true });
            if (first) {
              const today = new Date();
              const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
              const starters = d.categories.slice(0, 2).map((c, i) => ({
                title: i === 0 ? "Try crossing this one off" : `Add your first ${c.toLowerCase()} task`,
                category: c, priority: "normal", date,
              }));
              for (const t of starters) await api("/api/tasks", "POST", t);
              await reload();
            }
            setPreview(null);
            setEditing(false);
          }}
        />
      ) : (
        <Planner profile={profile} tasks={tasks} setTasks={setTasks} reload={reload} saveProfile={saveProfile}
          onEditProfile={() => setEditing(true)} onSignOut={signOut} pwa={pwa} />
      )}
    </div>
  );
}
