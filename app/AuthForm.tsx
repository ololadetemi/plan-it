"use client";
import { useState } from "react";

type Props = {
  endpoint: string;
  title: string;
  sub: string;
  button: string;
  fields: ("email" | "password")[];
  extra?: Record<string, string>;
  done?: string; // message shown on success instead of redirecting
  links?: [string, string][];
};

export default function AuthForm({ endpoint, title, sub, button, fields, extra, done, links }: Props) {
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const body: Record<string, string> = { ...extra };
    new FormData(e.currentTarget).forEach((v, k) => (body[k] = String(v)));
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Something went wrong. Try again.");
    if (done) return setMsg(done);
    window.location.href = "/";
  }

  return (
    <div className="auth-wrap"><form className="auth-card" onSubmit={submit}>
      <h1>{title}</h1>
      <p className="sub">{sub}</p>
      {fields.includes("email") && (<><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></>)}
      {fields.includes("password") && (<><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={endpoint.includes("login") ? "current-password" : "new-password"} minLength={8} required /></>)}
      <button disabled={busy}>{busy ? "Working..." : button}</button>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}
      {links && <div className="links">{links.map(([h, t]) => <a key={h} href={h}>{t}</a>)}</div>}
    </form></div>
  );
}
