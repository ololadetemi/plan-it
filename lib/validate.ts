export const normEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
export const validPassword = (p: unknown): p is string => typeof p === "string" && p.length >= 8 && p.length <= 200;
