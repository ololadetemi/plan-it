"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

function keyToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type Pwa = {
  pushSupported: boolean; subscribed: boolean; canInstall: boolean;
  toggleNotifications: () => Promise<string>; install: () => Promise<string>;
};

/** Registers the service worker, tracks the push subscription and the browser install prompt. */
export function usePwa(): Pwa {
  const [subscribed, setSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const deferred = useRef<any>(null);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported || ios);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(async (reg) => {
          if (!supported) return;
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub && Notification.permission === "granted");
          // Keep the server's copy fresh in case it was dropped.
          if (sub && Notification.permission === "granted") api("/api/push/subscribe", "POST", { subscription: sub.toJSON() }).catch(() => {});
        })
        .catch(() => {});
    }
    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e; setCanInstall(true); };
    const onInstalled = () => { deferred.current = null; setCanInstall(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (ios && !standalone) setCanInstall(true);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, [ios, standalone]);

  const toggleNotifications = useCallback(async () => {
    if (ios && !standalone) return "On iPhone and iPad, add Plan-it to your Home Screen first (Share, then Add to Home Screen). Then turn notifications on from the installed app.";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "This browser cannot receive push notifications.";
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await api("/api/push/unsubscribe", "POST", { endpoint: existing.endpoint }).catch(() => {});
      await existing.unsubscribe();
      setSubscribed(false);
      return "Notifications are off on this device.";
    }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return "Notifications are not set up on the server yet.";
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "Notifications are blocked. Allow them for this site in your browser settings, then try again.";
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) as BufferSource });
    await api("/api/push/subscribe", "POST", { subscription: sub.toJSON() });
    setSubscribed(true);
    await api("/api/push/test", "POST").catch(() => {});
    return "Notifications are on. A test is on its way.";
  }, [ios, standalone]);

  const install = useCallback(async () => {
    if (deferred.current) {
      deferred.current.prompt();
      const r = await deferred.current.userChoice;
      deferred.current = null; setCanInstall(false);
      return r.outcome === "accepted" ? "Plan-it is installing." : "Install cancelled.";
    }
    return "To install: tap Share, then Add to Home Screen.";
  }, []);

  return { pushSupported, subscribed, canInstall, toggleNotifications, install };
}
