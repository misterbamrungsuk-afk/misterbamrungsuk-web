// ฝั่งเบราว์เซอร์: ขอสิทธิ์ + สร้าง push subscription + ผูกกับบัญชี (#16)
// ต้องเรียกจากการกดปุ่ม (Safari) · iPhone ต้องเพิ่มเว็บไว้ที่หน้าจอโฮมก่อนถึงจะมี PushManager
export type PushResult = "ok" | "unsupported" | "denied" | "off" | "error";

const b64ToBytes = (s: string) => {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";

export async function enablePush(pt?: { mb: string; t: string }): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const cfg = (await fetch("/api/push", { cache: "no-store" }).then((r) => r.json()).catch(() => null)) as { enabled?: boolean; key?: string } | null;
    if (!cfg?.key) return "off";
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.key) }));
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: sub.toJSON(), ...(pt ?? {}) }) });
    return r.ok ? "ok" : "error";
  } catch { return "error"; }
}
