import "server-only";
import { NOSHOW_DECISION_HOURS, NOSHOW_WAIT_MIN, type Evidence, type NoShowClaim } from "@/lib/noshow-rules";
import { BookingError, addEvent, listMessages, notify, transition, type Booking } from "./index";

// แจ้งผิดนัด (no-show) จากหน้าการจอง — ลูกค้าแจ้งเพื่อนไม่มา / Part-Time แจ้งลูกค้าไม่มา
// เปิดคำร้อง = นัดเป็น "disputed" (เงินพักใน escrow · จบงานอัตโนมัติไม่ทำงาน) → แอดมินตัดสินที่ /admin/orders แท็บผิดนัด
export type NoShowSide = "customer" | "provider";
export type NoShowState = { can: boolean; reason: string; at: string | null; counter: boolean; claim: { status: NoShowClaim["status"]; mine: boolean; other: boolean } | null };
const WAIT = NOSHOW_WAIT_MIN * 60_000;
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

/** แจ้งได้ไหม · ได้ตอนไหน · เหตุผล (ข้อความไทยให้หน้าเว็บแสดงตรง ๆ) */
export async function noShowState(b: Booking, side: NoShowSide): Promise<NoShowState> {
  const { claimFor } = await import("@/lib/noshow");
  const c = await claimFor(b.id).catch(() => null);
  const no = (reason: string, at: number | null = null): NoShowState => ({ can: false, reason, at: at ? new Date(at).toISOString() : null, counter: false, claim: c ? { status: c.status, mine: !!(side === "customer" ? c.customer_evidence : c.provider_evidence), other: !!(side === "customer" ? c.provider_evidence : c.customer_evidence) } : null });
  if (c) {
    const base = no("");
    if (c.status !== "pending") return { ...base, reason: "ทีมงานตัดสินคำร้องผิดนัดแล้ว" };
    if (base.claim?.mine) return { ...base, reason: `ส่งหลักฐานแล้ว · ทีมงานตัดสินภายใน ${NOSHOW_DECISION_HOURS} ชม.` };
    if (b.status !== "disputed") return { ...base, reason: "คำร้องนี้ปิดไปแล้ว" };
    // อีกฝ่ายแจ้งมาก่อน → ฝ่ายนี้ส่งหลักฐานโต้แย้งได้เสมอ
    return { ...base, can: true, counter: true, reason: side === "customer" ? "เพื่อนแจ้งว่าคุณไม่มาตามนัด · ส่งหลักฐานฝั่งคุณ" : "ลูกค้าแจ้งว่าคุณไม่มาตามนัด · ส่งหลักฐานฝั่งคุณ" };
  }
  if (!["accepted", "checked_in"].includes(b.status)) return no("แจ้งผิดนัดได้เฉพาะนัดที่ยืนยันแล้ว");
  if (b.pt_done_at) return no("เพื่อนแจ้งจบงานแล้ว · มีปัญหาให้กด แจ้งปัญหา");
  const start = Date.parse(b.starts_at);
  const { getArrival } = await import("@/lib/arrival");
  const arr = await getArrival(b.id).catch(() => null);
  const now = Date.now();
  if (side === "customer") {
    if (b.status === "checked_in" || arr) return no("เพื่อนกด \"ถึงจุดนัด\" แล้ว · ถ้าหากันไม่เจอ ให้แชทหรือกด แจ้งปัญหา");
    const at = start + WAIT;
    if (now < at) return no(`แจ้งได้ถ้าเพื่อนยังไม่ถึงหลัง ${hhmm(at)} น. (รอ ${NOSHOW_WAIT_MIN} นาทีหลังเวลานัด)`, at);
    return { can: true, counter: false, reason: "เพื่อนยังไม่ถึงจุดนัด", at: new Date(at).toISOString(), claim: null };
  }
  if (b.status !== "checked_in") return no(`กด "ถึงจุดนัด" ก่อน แล้วรอลูกค้า ${NOSHOW_WAIT_MIN} นาที`);
  // นับเวลารอจากเวลานัดหรือเวลาที่มาถึง (อันที่ช้ากว่า)
  const arrived = arr ? Date.parse(arr.arrived_at) : b.checked_in_at ? Date.parse(b.checked_in_at) : start;
  const at = Math.max(start, arrived) + WAIT;
  if (now < at) return no(`รอลูกค้าครบ ${NOSHOW_WAIT_MIN} นาที · แจ้งได้หลัง ${hhmm(at)} น.`, at);
  return { can: true, counter: false, reason: "รอครบเวลาแล้ว", at: new Date(at).toISOString(), claim: null };
}

export type NoShowInput = { note: string; gps: { lat: number; lng: number; accuracy: number } | null; gpsError?: string; photo: File | null };

/** ส่งคำร้อง/หลักฐานผิดนัด — ตรวจกติกาเวลา · รูป (ตรวจ magic bytes) · GPS ตอนมาถึงจากเซิร์ฟเวอร์ · จำนวนครั้งที่ติดต่อจากแชทในแอป */
export async function reportNoShow(b: Booking, side: NoShowSide, input: NoShowInput): Promise<NoShowClaim> {
  const st = await noShowState(b, side);
  if (!st.can) throw new BookingError(st.reason || "แจ้งผิดนัดไม่ได้ในตอนนี้", "state");
  const { savePhoto, submitEvidence } = await import("@/lib/noshow");
  let photo: string | null = null;
  if (input.photo && input.photo.size > 0) {
    photo = await savePhoto(b.id, side, input.photo);
    if (!photo) throw new BookingError("รูปไม่ถูกต้อง · ใช้ JPG / PNG / WEBP ไม่เกิน 8 MB", "photo");
  }
  const note = input.note.trim().slice(0, 500);
  const at = new Date().toISOString();
  if (!st.counter) {
    // เปิดคำร้อง: แช่เงินไว้ (disputed) ก่อนบันทึกหลักฐาน — แข่งกับจบงาน/ยกเลิกแล้วแพ้ = ไม่เปิดคำร้อง
    const r = await transition(b.id, ["accepted", "checked_in"], { status: "disputed", resolution: { ...(b.resolution ?? {}), dispute: `แจ้งผิดนัด: ${side === "customer" ? "เพื่อนไม่มาตามนัด" : "ลูกค้าไม่มาตามนัด"}${note ? ` · ${note}` : ""}`, noshow: { by: side, at }, at } });
    if (!r) throw new BookingError("สถานะนัดเปลี่ยนไปแล้ว · ลองโหลดหน้าใหม่", "state");
  }
  const msgs = await listMessages(b.id).catch(() => []);
  const sender = side === "customer" ? "customer" : "parttime";
  let arrival: Evidence["arrival"] = null;
  if (side === "provider") {
    const a = await (await import("@/lib/arrival")).getArrival(b.id).catch(() => null);
    if (a) arrival = { at: a.arrived_at, gps: a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng, accuracy: a.accuracy ?? 0 } : null, ...(a.gps_error ? { gpsError: a.gps_error } : {}) };
  }
  const ev: Evidence = {
    at, gps: input.gps, ...(input.gps ? {} : { gpsError: input.gpsError?.slice(0, 120) || "ไม่มี GPS" }), photo,
    attempts: msgs.filter((m) => m.sender_type === sender && !m.blocked).length, attemptsSource: "chat_log", note: note || undefined, arrival,
  };
  const claim = await submitEvidence({ bookingId: b.id, side, evidence: ev, amount: b.total_satang / 100, customerName: b.customer_name || b.customer_email || "ลูกค้า", providerName: b.parttime_nick ?? b.parttime_mb, providerId: b.parttime_id });
  await addEvent(b.id, st.counter ? "noshow_evidence" : "noshow_reported", side === "customer" ? `customer:${b.customer_id}` : `parttime:${b.parttime_id}`, { side, photo: !!photo, gps: !!input.gps });
  if (!st.counter) {
    await notify({ user_type: "admin", user_id: "ops", kind: "noshow", title: `แจ้งผิดนัด ${b.code}`, body: side === "customer" ? "ลูกค้าแจ้ง: เพื่อนไม่มาตามนัด" : "Part-Time แจ้ง: ลูกค้าไม่มาตามนัด", url: "/admin/orders?tab=noshow" });
    // อีกฝ่ายส่งหลักฐานโต้แย้งได้
    if (side === "customer") await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "noshow", title: `ลูกค้าแจ้งว่าคุณไม่มาตามนัด ${b.code}`, body: `ส่งหลักฐานฝั่งคุณภายใน ${NOSHOW_DECISION_HOURS} ชม. · เงินพักไว้จนทีมงานตัดสิน`, url: `/join/profile/${b.parttime_mb}/jobs` });
    else await notify({ user_type: "customer", user_id: b.customer_id, kind: "noshow", title: `เพื่อนแจ้งว่าคุณไม่มาตามนัด ${b.code}`, body: `ส่งหลักฐานฝั่งคุณภายใน ${NOSHOW_DECISION_HOURS} ชม. · เงินพักไว้จนทีมงานตัดสิน`, url: `/order/${b.id}` });
  }
  return claim;
}
