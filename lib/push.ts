import webpush from "web-push";
import { pushSubs } from "./db";

export type PushPayload = { title: string; body: string; url?: string; tag?: string; badgeCount?: number };

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys are not set");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
}

export type SendResult = { ok: number; errors: string[] };

/** Sends to every device the user has subscribed. Reports accepted deliveries and any failures. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  const col = await pushSubs();
  const subs = await col.find({ userId }).toArray();
  const errors: string[] = [];
  if (!subs.length) return { ok: 0, errors: ["no subscribed device"] };
  if (process.env.PUSH_DRY_RUN) {
    console.log(`[push dry run] ${userId}: ${payload.title} | ${payload.body} | badge=${payload.badgeCount}`);
    return { ok: subs.length, errors };
  }
  try { configure(); } catch (e: any) { console.error("[push]", e.message); return { ok: 0, errors: [e.message] }; }
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 });
      ok++;
    } catch (e: any) {
      // 404/410 mean the browser dropped this subscription for good.
      if (e?.statusCode === 404 || e?.statusCode === 410) await col.deleteOne({ endpoint: s.endpoint });
      else {
        const host = new URL(s.endpoint).host;
        console.error("[push] send failed", host, e?.statusCode, e?.body ?? e?.message);
        errors.push(`${host} ${e?.statusCode ?? ""} ${String(e?.body ?? e?.message).slice(0, 120)}`.trim());
      }
    }
  }));
  return { ok, errors };
}
