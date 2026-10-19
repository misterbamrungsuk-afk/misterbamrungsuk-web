import "server-only";

// ส่งอีเมลผ่าน Resend HTTP API — ไม่ตั้ง RESEND_API_KEY/EMAIL_FROM = ไม่ส่ง (log อย่างเดียว)
export const emailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export type Mail = { to: string | string[]; subject: string; html: string };

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Sent = { to: string[]; subject: string; html: string; at: number };
const outboxG = globalThis as unknown as { __mbOutbox?: Sent[] };
/** กล่องจดหมายจำลอง: เปิดเฉพาะไม่มี RESEND_API_KEY และไม่ได้รันบน Vercel (ชุดทดสอบอ่านผ่าน /api/admin/demo-outbox) */
export const demoOutboxOn = () => !process.env.RESEND_API_KEY && !process.env.VERCEL_ENV && !process.env.VERCEL;
export const demoOutbox = (): Sent[] => (demoOutboxOn() ? outboxG.__mbOutbox ?? [] : []);

export async function sendEmail(m: Mail): Promise<boolean> {
  const to = (Array.isArray(m.to) ? m.to : [m.to]).filter(Boolean);
  if (!to.length) return false;
  if (!emailEnabled()) {
    // ไม่ log อีเมลผู้รับ (PII) — หัวเรื่องพอ
    console.info(`[email:noop] subject=${m.subject}`);
    if (demoOutboxOn()) { const box = (outboxG.__mbOutbox ??= []); box.push({ to, subject: m.subject, html: m.html, at: Date.now() }); if (box.length > 100) box.splice(0, box.length - 100); }
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject: m.subject, html: m.html }),
    });
    if (!res.ok) console.error("resend failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("resend error", e);
    return false;
  }
}

function layout(title: string, rows: [string, unknown][], note = "") {
  const trs = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6152">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`).join("");
  return `<div style="font-family:'Noto Sans Thai',Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e6c97a;border-radius:16px;color:#1a1206">
<p style="margin:0;letter-spacing:.2em;font-size:12px;color:#8f5e00">MISTER BAMRUNGSUK</p>
<h2 style="margin:6px 0 16px">${esc(title)}</h2><table style="font-size:14px;border-collapse:collapse">${trs}</table>
${note ? `<p style="font-size:13px;color:#6b6152;margin-top:16px">${esc(note)}</p>` : ""}
<p style="font-size:11px;color:#9a8f7c;margin-top:24px">อีเมลอัตโนมัติ · กรุณาอย่าตอบกลับ</p></div>`;
}

export type ApplicantMail = { mb_code: string; first_name: string; last_name: string; nickname?: string; email: string; tel?: string; package?: string; amount?: number; /** ลิงก์เข้าโปรไฟล์ (/join/go?t=…) */ link?: string };

/** อีเมลลิงก์เข้าโปรไฟล์ Part-Time — ปุ่มเปิด + วิธีเก็บลิงก์ · rows = รายละเอียดการชำระ (ตอนสมัคร) */
export function profileLinkMail(a: { to: string; mb_code: string; nickname?: string; link: string; rows?: [string, unknown][]; note?: string }): Mail {
  const trs = (a.rows ?? []).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6152">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`).join("");
  return {
    to: a.to, subject: `ลิงก์เข้าโปรไฟล์ Part-Time ของคุณ · ${a.mb_code}`,
    html: `<div style="font-family:'Noto Sans Thai',Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e6c97a;border-radius:16px;color:#1a1206">
<p style="margin:0;letter-spacing:.2em;font-size:12px;color:#8f5e00">MISTER BAMRUNGSUK</p>
<h2 style="margin:6px 0 12px">ลิงก์เข้าโปรไฟล์ Part-Time${a.nickname ? ` ของคุณ${esc(a.nickname)}` : ""}</h2>
${a.note ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px">${esc(a.note)}</p>` : ""}
${trs ? `<table style="font-size:14px;border-collapse:collapse;margin-bottom:12px">${trs}</table>` : ""}
<p style="margin:16px 0"><a href="${esc(a.link)}" style="display:inline-block;background:#e8c472;color:#1b130b;border-radius:10px;padding:12px 20px;font-weight:600;text-decoration:none">เข้าโปรไฟล์ของฉัน</a></p>
<ul style="font-size:13.5px;line-height:1.7;color:#4a3f33;padding-left:18px;margin:0">
<li>กดปุ่มแล้วเปิดใน Chrome หรือ Safari ได้เลย เครื่องนั้นจะจำไว้ 30 วัน</li>
<li>เก็บอีเมลนี้ไว้ ใช้เข้าโปรไฟล์จากเครื่องอื่นหรือจากแอป LINE</li>
<li>ลิงก์ใช้ได้ 30 วัน · ขอลิงก์ใหม่ได้ที่หน้า "โปรไฟล์ Part-Time" บนเว็บ</li>
<li>อย่าส่งลิงก์นี้ให้คนอื่น เพราะเปิดแล้วเข้าโปรไฟล์ของคุณได้</li>
</ul>
<p style="font-size:12px;color:#6b6152;word-break:break-all;margin-top:14px">ถ้ากดปุ่มไม่ได้ คัดลอกลิงก์นี้ไปเปิด: ${esc(a.link)}</p>
<p style="font-size:11px;color:#9a8f7c;margin-top:20px">อีเมลอัตโนมัติ · กรุณาอย่าตอบกลับ · ถ้าคุณไม่ได้ขอลิงก์นี้ ไม่ต้องทำอะไร</p></div>`,
  };
}

export function applicantRegistered(a: ApplicantMail): Mail[] {
  const rows: [string, unknown][] = [["รหัสผู้สมัคร", a.mb_code], ["ชื่อ", `${a.first_name} ${a.last_name}`], ["รูปแบบที่สมัคร", a.package ?? "-"], ["ยอดชำระ", a.amount != null ? `฿${a.amount.toLocaleString("th-TH")}` : "-"]];
  const out: Mail[] = [a.link
    ? profileLinkMail({ to: a.email, mb_code: a.mb_code, nickname: a.nickname, link: a.link, rows, note: "ได้รับสลิปแล้ว ทีมงานตรวจภายใน 2 ชม. (09:00–22:00) ระหว่างนี้กรอกรายละเอียดในโปรไฟล์ต่อได้เลย" })
    : { to: a.email, subject: `ได้รับใบสมัครแล้ว · ${a.mb_code}`, html: layout("ได้รับใบสมัครของคุณแล้ว", rows, "ทีมงานจะตรวจสลิปและติดต่อกลับภายใน 1–2 วันทำการ") }];
  const admin = process.env.ADMIN_NOTIFY_EMAIL;
  if (admin) out.push({ to: admin.split(",").map((x) => x.trim()), subject: `[ผู้สมัครใหม่] ${a.mb_code} ${a.first_name}`, html: layout("มีผู้สมัครใหม่", [...rows, ["อีเมล", a.email], ["โทร", a.tel ?? "-"]], "ตรวจสลิปได้ที่ /admin/applicants") });
  return out;
}

export type BookingMail = { code: string; customerEmail?: string; customerName?: string; providerEmail?: string; providerName: string; date?: string; time?: string; minutes?: string | number; total?: number; place?: string };

const bookingRows = (b: BookingMail): [string, unknown][] => [
  ["รหัสจอง", b.code], ["เพื่อน", b.providerName], ["วันเวลา", `${b.date || "-"} ${b.time || ""}`], ["ระยะเวลา", b.minutes ? `${Number(b.minutes) / 60} ชม.` : "-"],
  ["สถานที่", b.place || "-"], ["ยอดรวม", b.total != null ? `฿${Number(b.total).toLocaleString("th-TH")}` : "-"],
];

export function bookingConfirmed(b: BookingMail): Mail[] {
  const out: Mail[] = [];
  if (b.customerEmail) out.push({ to: b.customerEmail, subject: `ยืนยันการจอง · ${b.code}`, html: layout("จองสำเร็จ", bookingRows(b), "เงินพักไว้กับเราจนจบนัด") });
  if (b.providerEmail) out.push({ to: b.providerEmail, subject: `มีงานใหม่ · ${b.code}`, html: layout("คุณมีนัดใหม่", [...bookingRows(b), ["ลูกค้า", b.customerName || "-"]]) });
  return out;
}

export function bookingStatusChanged(b: BookingMail, status: string): Mail[] {
  const to = [b.customerEmail, b.providerEmail].filter(Boolean) as string[];
  return to.length ? [{ to, subject: `สถานะการจอง ${b.code}: ${status}`, html: layout(`สถานะการจองเปลี่ยนเป็น "${status}"`, bookingRows(b)) }] : [];
}

// ── อีเมลคู่กับแจ้งเตือนในแอป (บอร์ด A-Notify) — ส่งเฉพาะเรื่องสำคัญ ไม่ส่งทุกข้อความแชท ──
export const EMAIL_KINDS = new Set([
  "booking_accepted", "booking_declined", "booking_expired", "booking_resolved", "quick_matched", "quick_expired",
  "topup_credited", "topup_rejected", "booking_new", "withdraw_paid", "withdraw_failed", "spa_full",
  // ถอนเงินลูกค้า · เปลี่ยนเวลา/ต่อเวลานัด · จองห้องพักโรงแรม
  "withdraw", "booking_reschedule", "booking_extend",
  "stay_booked", "stay_confirmed", "stay_declined", "stay_cancelled", "stay_refunded", "stay_expired", "stay_completed",
]);
const SUBJECT: Record<string, string> = {
  booking_accepted: "จองสำเร็จ", booking_declined: "เพื่อนไม่สะดวก · คืนเงินแล้ว", booking_expired: "ไม่มีการตอบรับ · คืนเงินแล้ว", booking_resolved: "ผลพิจารณาการจอง",
  quick_matched: "เรียกด่วนสำเร็จ", quick_expired: "เรียกด่วนยังไม่มีเพื่อนรับ", topup_credited: "เติมเงินเข้ากระเป๋าแล้ว", topup_rejected: "เติมเงินไม่ผ่าน",
  booking_new: "มีงานเข้าใหม่", withdraw_paid: "โอนเงินแล้ว", withdraw_failed: "โอนเงินไม่สำเร็จ", spa_full: "สปาแจ้งห้องเต็ม",
  withdraw: "คำขอถอนเงิน", booking_reschedule: "เปลี่ยนเวลานัด", booking_extend: "ต่อเวลานัด",
  stay_booked: "ส่งคำขอจองห้องแล้ว", stay_confirmed: "โรงแรมยืนยันการจอง", stay_declined: "โรงแรมปฏิเสธ · คืนเงินแล้ว", stay_cancelled: "ยกเลิกการจองห้อง",
  stay_refunded: "คืนเงินการจองห้อง", stay_expired: "การจองห้องหมดเวลา · คืนเงินแล้ว", stay_completed: "ขอบคุณที่เข้าพัก",
};
/** อีเมลแบรนด์: หัวข้อ + เนื้อความ + ปุ่มเปิดในแอป */
export function noticeMail(to: string, kind: string, title: string, body: string | null, url: string | null): Mail {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://misterbamrungsuk.com").replace(/\/$/, "");
  const href = url ? (url.startsWith("http") ? url : site + url) : site;
  return {
    to, subject: `${SUBJECT[kind] ?? "แจ้งเตือน"} · Mister Bamrungsuk`,
    html: `<div style="font-family:'Noto Sans Thai',Tahoma,sans-serif;max-width:520px;margin:auto;border:1px solid #e6c97a;border-radius:16px;overflow:hidden;color:#1a1206">
<div style="background:#171211;color:#e8c472;padding:16px 22px;font-weight:800;font-size:18px;letter-spacing:.02em">Mister Bamrungsuk</div>
<div style="padding:22px"><h2 style="margin:0 0 10px;font-size:20px">${esc(title)}</h2>${body ? `<p style="margin:0 0 16px;color:#4a3f33;line-height:1.6">${esc(body)}</p>` : ""}
<a href="${esc(href)}" style="display:inline-block;background:#e8c472;color:#1b130b;border-radius:10px;padding:12px 20px;font-weight:600;text-decoration:none">เปิดในแอป</a>
<p style="font-size:11px;color:#9a8f7c;margin-top:22px">อีเมลอัตโนมัติจาก Mister Bamrungsuk · กรุณาอย่าตอบกลับ</p></div></div>`,
  };
}

/** ส่งหลายฉบับแบบไม่รอ/ไม่โยน error */
export function sendAll(mails: Mail[]) {
  return Promise.allSettled(mails.map(sendEmail));
}

/** ส่งอีเมลทดสอบ (แอดมินกดจากหน้าภาพรวม) — คืนข้อความผิดพลาดจาก Resend ตรง ๆ เพื่อดูว่าโดเมนยืนยันแล้วหรือยัง */
export async function sendTestEmail(to: string): Promise<{ ok: boolean; error: string }> {
  if (!emailEnabled()) return { ok: false, error: "ยังไม่ได้ตั้ง RESEND_API_KEY / EMAIL_FROM" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: "ทดสอบอีเมล Mister Bamrungsuk", html: layout("อีเมลระบบใช้งานได้", [["ส่งถึง", to], ["เวลา", new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })]], "ถ้าได้รับอีเมลนี้ แปลว่าระบบส่งอีเมล (ลืมรหัสผ่าน · แจ้งเตือน SOS) พร้อมใช้งาน") }),
    });
    if (res.ok) return { ok: true, error: "" };
    const j = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: `${res.status} ${j.message ?? ""}`.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "เชื่อมต่อไม่ได้" };
  }
}
