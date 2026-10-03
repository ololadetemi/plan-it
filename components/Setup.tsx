"use client";
import { useEffect, useRef, useState } from "react";
import { fmtTime, type Profile } from "@/lib/client";
import { THEMES, THEME_META } from "@/lib/content";

const MAX_CATS = 5, MAX_TIMES = 4;
type Draft = Pick<Profile, "name" | "theme" | "categories" | "times" | "planEnabled" | "planTime">;

export default function Setup({ initial, editing, onFinish, onCancel, onPreviewTheme }: {
  initial: Draft; editing: boolean; onPreviewTheme: (t: string) => void; onFinish: (d: Draft & { timezone: string }) => Promise<void>; onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [catIn, setCatIn] = useState("");
  const [removed, setRemoved] = useState<{ name: string; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tz, setTz] = useState("");
  useEffect(() => { try { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { setTz(""); } }, []);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const set = (p: Partial<Draft>) => { if (p.theme) onPreviewTheme(p.theme); setD((x) => ({ ...x, ...p })); };
  const atMax = d.categories.length >= MAX_CATS;

  function addCat() {
    const v = catIn.trim();
    if (!v || atMax) return;
    if (!d.categories.some((c) => c.toLowerCase() === v.toLowerCase())) set({ categories: [...d.categories, v] });
    setCatIn("");
  }
  function removeCat(i: number) {
    const name = d.categories[i];
    set({ categories: d.categories.filter((_, j) => j !== i) });
    setRemoved({ name, index: i });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 4000);
  }
  function undoCat() {
    if (!removed) return;
    const cats = [...d.categories];
    cats.splice(Math.min(removed.index, cats.length), 0, removed.name);
    set({ categories: cats });
    setRemoved(null);
    clearTimeout(undoTimer.current);
  }

  async function finish() {
    setBusy(true); setErr("");
    try { await onFinish({ ...d, times: d.times.filter(Boolean), timezone: tz || "UTC" }); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const hr = new Date().getHours();
  const part = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const sorted = [...d.times].sort();
  let timesText = sorted.map(fmtTime).join(", ");
  if (d.planEnabled) timesText += (sorted.length ? ", and " : "") + fmtTime(d.planTime) + " for planning tomorrow";

  return (
    <div className="pl-stage">
      <div className="wizard" id="wizWin" data-theme={d.theme}>
        <div className="dots">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= Math.min(step, 3) ? "on" : ""} />)}</div>

        {step === 0 && (
          <div className="step on">
            <p className="eyebrow">Step 1 of 4</p>
            <h2>Please enter your name or nickname</h2>
            <p className="help">This is how your planner will greet you each time it opens.</p>
            <input className="name-input" placeholder="Your name" maxLength={30} autoComplete="off" autoFocus
              value={d.name} onChange={(e) => set({ name: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter" && d.name.trim()) setStep(1); }} />
            <div className="nav">
              {editing ? <button className="btn-back" onClick={onCancel}>Cancel</button> : <div />}
              <button className="btn-next" disabled={!d.name.trim()} onClick={() => setStep(1)}>Continue</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="step on">
            <p className="eyebrow">Step 2 of 4</p>
            <h2>Pick a look</h2>
            <p className="help">You can change this any time later.</p>
            <div className="swatches">
              {THEMES.map((t) => (
                <button key={t} className={`swatch ${t}${d.theme === t ? " on" : ""}`} onClick={() => set({ theme: t })}>
                  <span className="ring"><svg><use href={`#${THEME_META[t].icon}`} /></svg></span>
                  <span>{THEME_META[t].label}</span>
                </button>
              ))}
            </div>
            <div className="nav"><button className="btn-back" onClick={() => setStep(0)}>Back</button><button className="btn-next" onClick={() => setStep(2)}>Continue</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="step on">
            <p className="eyebrow">Step 3 of 4</p>
            <h2>Your categories</h2>
            <p className="help">Two are already added below. Up to three more can be added.</p>
            <div className="chiprow">
              {d.categories.map((c, i) => (
                <span className="cat-chip" key={c}>{c}<button aria-label={`Remove ${c}`} onClick={() => removeCat(i)}>×</button></span>
              ))}
            </div>
            <div className="cat-add">
              <input placeholder="Add a category" maxLength={18} disabled={atMax} value={catIn}
                onChange={(e) => setCatIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCat(); }} />
              <button disabled={atMax} onClick={addCat}>Add</button>
            </div>
            <p className="cat-note">
              {removed ? (<>Removed &quot;{removed.name}&quot;. <button onClick={undoCat} style={{ border: 0, background: "transparent", color: "var(--wz-rose-deep,#c2467f)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "0 2px", textDecoration: "underline" }}>Undo</button></>)
                : atMax ? "That's the most you can add for now (5)." : `${d.categories.length} of ${MAX_CATS} used.`}
            </p>
            <div className="nav"><button className="btn-back" onClick={() => setStep(1)}>Back</button><button className="btn-next" disabled={!d.categories.length} onClick={() => setStep(3)}>Continue</button></div>
          </div>
        )}

        {step === 3 && (
          <div className="step on">
            <p className="eyebrow">Step 4 of 4</p>
            <h2>Please select your preferred check-in times</h2>
            <p className="help">Up to 4 times a day. Edit any of them, or remove one.</p>
            <div className="time-list">
              {d.times.map((t, i) => (
                <div className="time-row" key={i}>
                  <input type="time" value={t} onChange={(e) => set({ times: d.times.map((x, j) => (j === i ? e.target.value : x)) })} />
                  <button aria-label="Remove this check-in" onClick={() => set({ times: d.times.filter((_, j) => j !== i) })}>×</button>
                </div>
              ))}
            </div>
            <button className="time-add" disabled={d.times.length >= MAX_TIMES} onClick={() => set({ times: [...d.times, "09:00"] })}>+ Add a check-in time</button>
            <div className="toggle-row">
              <div><div className="toggle-label">Plan tomorrow at night</div><div className="toggle-sub">A prompt to set up the next day</div></div>
              <label className="switch"><input type="checkbox" checked={d.planEnabled} onChange={(e) => set({ planEnabled: e.target.checked })} /><span className="slider" /></label>
            </div>
            {d.planEnabled && <div className="plan-time"><input type="time" value={d.planTime} onChange={(e) => set({ planTime: e.target.value })} /></div>}
            <div className="nav"><button className="btn-back" onClick={() => setStep(2)}>Back</button><button className="btn-next" onClick={() => setStep(4)}>Finish setup</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="step on">
            <p className="eyebrow">All set</p>
            <p className="final-greet">{part}, {d.name.trim() || "there"}</p>
            <p className="final-sub">Here is what you chose.</p>
            <div className="summary-row"><div className="summary-label">Look</div><div className="summary-val">{THEME_META[d.theme].label}</div></div>
            <div className="summary-row"><div className="summary-label">Categories</div><div className="summary-val">{d.categories.map((c) => <span className="mini-chip" key={c}>{c}</span>)}</div></div>
            <div className="summary-row"><div className="summary-label">Check-ins</div><div className="summary-val">{timesText || "None set yet"}</div></div>
            <div className="summary-row"><div className="summary-label">Time zone</div><div className="summary-val">{tz ? `${tz} (detected automatically)` : "Not detected. You can set this manually later."}</div></div>
            {err && <p className="err" style={{ margin: "10px 0 0" }}>{err}</p>}
            <button className="enter-btn" disabled={busy} onClick={finish}>{busy ? "Saving..." : "Enter your planner"}</button>
            <button className="edit-link" onClick={() => setStep(0)}>Change something</button>
          </div>
        )}
      </div>
    </div>
  );
}
