import webpush from "web-push";
import { pushSubs } from "./db";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys are not set");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
}

/** Sends to every device the user has subscribed. Returns how many deliveries were accepted. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  const col = await pushSubs();
  const subs = await col.find({ userId }).toArray();
  if (!subs.length) return 0;
  if (process.env.PUSH_DRY_RUN) {
    console.log(`[push dry run] ${userId}: ${payload.title} | ${payload.body}`);
    return subs.length;
  }
  configure();
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 });
      ok++;
    } catch (e: any) {
      // 404/410 mean the browser dropped this subscription for good.
      if (e?.statusCode === 404 || e?.statusCode === 410) await col.deleteOne({ endpoint: s.endpoint });
      else console.error("[push] send failed", e?.statusCode, e?.body ?? e?.message);
    }
  }));
  return ok;
}
