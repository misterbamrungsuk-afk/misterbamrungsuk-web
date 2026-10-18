"use client";

// ปุ่มเปิดแจ้งเตือนบนอุปกรณ์นี้ (#16) — Part-Time ส่ง mb+t · ลูกค้าใช้ session
// to = ผูกอุปกรณ์ผ่าน route ของพอร์ทัลเอง (พาร์ทเนอร์ /api/partner/push · ร้านค้า /api/market/vendor/push ใช้ cookie ของพอร์ทัล)
import { useEffect, useState } from "react";
import { enablePush, pushSupported, type PushResult } from "@/lib/push-client";

const b64ToBytes = (s: string) => {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
/** เหมือน enablePush แต่ส่ง subscription ไปที่ route ที่กำหนด */
async function enablePushAt(to: string): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const cfg = (await fetch("/api/push", { cache: "no-store" }).then((r) => r.json()).catch(() => null)) as { key?: string } | null;
    if (!cfg?.key) return "off";
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.key) }));
    const r = await fetch(to, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: sub.toJSON() }) });
    const out = (await r.json().catch(() => ({}))) as { off?: boolean };
    return r.ok ? "ok" : out.off ? "off" : "error";
  } catch { return "error"; }
}

const MSG = { ok: "เปิดแล้ว · งานใหม่และข้อความจะเด้งบนเครื่องนี้", denied: "เบราว์เซอร์ปิดไว้ · เปิดได้ในการตั้งค่าเบราว์เซอร์", off: "ระบบแจ้งเตือนบนเครื่องยังไม่เปิดใช้ · ดูแจ้งเตือนในแอปได้ตามปกติ", error: "ผูกอุปกรณ์ไม่สำเร็จ ลองใหม่อีกครั้ง", unsupported: "บน iPhone ให้กดแชร์ → เพิ่มไปยังหน้าจอโฮม แล้วเปิดจากไอคอนก่อน" } as const;

export function PushButton({ pt, admin, to, bound, label = "แจ้งเตือนบนเครื่องนี้", hint = "งานเข้าใหม่ต้องตอบภายใน 30 นาที · เปิดไว้จะไม่พลาดงาน" }: { pt?: { mb: string; t: string }; admin?: boolean; to?: string; /** to: เซิร์ฟเวอร์รู้ว่าผูกอุปกรณ์ไว้แล้ว (ไม่ดูจาก subscription ในเบราว์เซอร์ เพราะเครื่องเดียวกันอาจผูกกับบัญชีลูกค้าอยู่) */ bound?: boolean; label?: string; hint?: string }) {
  const [st, setSt] = useState<keyof typeof MSG | "idle" | "busy">("idle");
  useEffect(() => {
    if (!pushSupported()) { setSt("unsupported"); return; }
    if (to) { if (bound && Notification.permission === "granted") setSt("ok"); return; }
    if (Notification.permission === "granted") navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => { if (s) setSt("ok"); }).catch(() => {});
  }, [to, bound]);
  const on = st === "ok";
  return (
    <div className="rounded-[20px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
      <div className="flex items-center gap-2.5">
        <svg className="w-[22px] h-[22px] shrink-0 text-[#e8c472]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        <div className="text-[17px] font-medium flex-1">{label}</div>
        <button type="button" disabled={st === "busy" || on || st === "unsupported"} onClick={async () => { setSt("busy"); setSt(to ? await enablePushAt(to) : await enablePush(pt, admin)); }} className="h-9 rounded-full text-[13px] font-semibold disabled:opacity-60" style={{ padding: "0 14px", background: on ? "rgba(95,208,143,.16)" : "#e8c472", color: on ? "#5fd08f" : "#1b130b" }}>{on ? "เปิดอยู่" : st === "busy" ? "กำลังเปิด…" : "เปิดแจ้งเตือน"}</button>
      </div>
      <div className="text-[13px] font-light text-[#d9c9b4]">{st in MSG ? MSG[st as keyof typeof MSG] : hint}</div>
    </div>
  );
}
