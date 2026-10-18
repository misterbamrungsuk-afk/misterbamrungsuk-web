"use client";

// ตัวช่วยฝั่งเบราว์เซอร์สำหรับโทรผ่านแอป (ไม่มี UI) — ใช้ร่วมกันระหว่างปุ่มโทร / หน้าจอโทร / ตัวรอสายเรียกเข้า
export type CallAuth = { as: "customer" | "pt"; mb?: string; t?: string };
export const qs = (a: CallAuth) => {
  const p = new URLSearchParams({ as: a.as });
  if (a.mb) p.set("mb", a.mb);
  if (a.t) p.set("t", a.t);
  return p.toString();
};
export const authBody = (a: CallAuth) => ({ as: a.as, ...(a.mb ? { mb: a.mb } : {}), ...(a.t ? { t: a.t } : {}) });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = Record<string, any>;
export async function getJ(url: string): Promise<J | null> {
  try { const r = await fetch(url, { cache: "no-store" }); return (await r.json()) as J; } catch { return null; }
}
export async function postJ(url: string, body: unknown, keepalive = false): Promise<J> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive });
    return ((await r.json().catch(() => ({}))) as J) ?? {};
  } catch { return { ok: false, error: "เชื่อมต่ออินเทอร์เน็ตไม่ได้" }; }
}

/** เปิดในเบราว์เซอร์ในแอป LINE (ไมค์/WebRTC มักใช้ไม่ได้) */
export const inLine = () => typeof navigator !== "undefined" && /Line\//i.test(navigator.userAgent);
/** ลิงก์เปิดหน้านี้นอก LINE (LINE รองรับ openExternalBrowser=1) */
export const externalHref = () => {
  if (typeof location === "undefined") return "#";
  const u = new URL(location.href);
  u.searchParams.set("openExternalBrowser", "1");
  return u.toString();
};
export const canWebRtc = () => typeof window !== "undefined" && !!window.RTCPeerConnection && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false;

export function micError(e: unknown): string {
  const n = (e as { name?: string })?.name ?? "";
  if (n === "NotAllowedError" || n === "SecurityError" || n === "PermissionDeniedError") return "ไม่ได้รับอนุญาตให้ใช้ไมค์ · เปิดสิทธิ์ไมค์ของเว็บนี้ในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่";
  if (n === "NotFoundError" || n === "OverconstrainedError" || n === "DevicesNotFoundError") return "ไม่พบไมค์ในเครื่องนี้";
  if (n === "NotReadableError" || n === "TrackStartError" || n === "AbortError") return "ไมค์กำลังถูกใช้โดยแอปอื่น · ปิดแอปนั้นแล้วลองใหม่";
  return "เปิดไมค์ไม่ได้ · ลองใหม่ หรือเปิดใน Chrome/Safari";
}

/** รอรวบรวม ICE ให้ครบก่อนส่ง SDP ครั้งเดียว (ไม่ส่งทีละชิ้น) · เกิน 3 วิ = ส่งเท่าที่มี */
export function gathered(pc: RTCPeerConnection, ms = 3000): Promise<void> {
  return new Promise((res) => {
    if (pc.iceGatheringState === "complete") return res();
    const done = () => { clearTimeout(t); pc.removeEventListener("icegatheringstatechange", chk); res(); };
    const chk = () => { if (pc.iceGatheringState === "complete") done(); };
    const t = setTimeout(done, ms);
    pc.addEventListener("icegatheringstatechange", chk);
  });
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** มีสายอยู่ในหน้านี้แล้ว (กันซ้อนสายเรียกเข้าระหว่างคุย) */
export const callBusy = { on: false };
