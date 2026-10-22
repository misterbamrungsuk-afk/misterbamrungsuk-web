import { NextResponse } from "next/server";
import { FileTypeError } from "@/lib/file-guard";
import { ageError } from "@/lib/join/config";
import { ageFrom } from "@/lib/join/form";
import { canResume } from "@/lib/join/resume";
import { inThailand, snapCell } from "@/lib/geo";
import { nearestArea } from "@/lib/home/geo";
import { extraOf, getByMb, saveProfile, clearFixes } from "@/lib/join/store";
import { CONTACT_MSG, hasContact } from "@/lib/join/contact-guard";
import { CERT_MSG, GATE_MSG, dropMassage, isPtActive } from "@/lib/join/pt-ui";

export const runtime = "nodejs";

// ใบสมัครหลังชำระเงิน — step=1 (บอร์ด JoinForm) · step=2 (JoinForm2) · step=card (แท็บ "แก้ไข" ในโปรไฟล์ของฉัน)
// ต้องเป็นเจ้าของรหัส (cookie mb_resume หรือ t)
const MAX_FILE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const WEEK_DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const PERIODS = ["กลางวัน", "กลางคืน"];
const DAY_TH: Record<string, string> = { "จ": "จันทร์", "อ": "อังคาร", "พ": "พุธ", "พฤ": "พฤหัส", "ศ": "ศุกร์", "ส": "เสาร์", "อา": "อาทิตย์" };
const HOUR_BANDS: Record<string, number> = { "3–4 ชม.": 4, "5–6 ชม.": 6, "7–8 ชม.": 8, "มากกว่า 8 ชม.": 10 };
const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, fields }, { status });
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const uniq = (xs: FormDataEntryValue[], max = 40, len = 60) => [...new Set(xs.map((x) => String(x).trim().slice(0, len)))].filter(Boolean).slice(0, max);

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const s = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const mb = s("mb");
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, s("t", 2048) || null))) return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาติดต่อแอดมิน", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);
  const x = extraOf(row);
  const step = s("step");
  const done = new Set(x.form_done ?? []);

  const file = (k: string): File | undefined | "bad" => {
    const f = form.get(k);
    if (!(f instanceof File) || f.size === 0) return undefined;
    return IMAGE_TYPES.includes(f.type) && f.size <= MAX_FILE ? f : "bad";
  };

  try {
    if (step === "1") {
      const errors: string[] = [];
      for (const k of ["first_name", "last_name", "nickname", "line_id", "address"]) if (!s(k)) errors.push(k);
      if (extraOf(row).kyc_status === "approved" && (s("first_name") !== row.first_name || s("last_name") !== row.last_name || s("birthdate") !== (row.birthdate ?? "")))
        return bad("ชื่อ-นามสกุลและวันเกิดยืนยันกับบัตรแล้ว · ต้องการแก้ ติดต่อทีมงานทาง LINE", 409, ["first_name"]);
      if (!isDate(s("birthdate"))) errors.push("birthdate");
      else { const ae = ageError(row.package, ageFrom(s("birthdate"))); if (ae) return bad(ae, 400, ["birthdate"]); }
      const areas = uniq(form.getAll("areas"), 20, 120);
      if (!areas.length) errors.push("areas");
      const photo = file("photo"), body = file("other_doc");
      if (photo === "bad") errors.push("photo"); else if (!photo && !row.docs.photo) errors.push("photo");
      if (body === "bad") errors.push("other_doc"); else if (!body && !row.docs.other_doc) errors.push("other_doc");
      if (errors.length) return bad("กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, errors);
      done.add(1);
      await saveProfile(row.id, {
        first_name: s("first_name"), last_name: s("last_name"), nickname: s("nickname"), birthdate: s("birthdate"),
        line_id: s("line_id", 60), address: s("address", 300), areas, no_area: s("no_area", 300), form_done: [...done],
        ...(extraOf(row).group === "tom" ? { trans: s("trans") === "true" } : {}),
      }, { photo: photo instanceof File ? photo : undefined, other_doc: body instanceof File ? body : undefined });
      await clearFixes(row, ["info", ...(photo instanceof File ? ["photo"] : []), ...(body instanceof File ? ["other_doc"] : [])]);
      return NextResponse.json({ ok: true });
    }

    if (step === "2") {
      const errors: string[] = [];
      const weekDays = uniq(form.getAll("week_days")).filter((d) => WEEK_DAYS.includes(d));
      const periods = uniq(form.getAll("periods")).filter((d) => PERIODS.includes(d));
      const band = s("hours_band");
      if (!weekDays.length) errors.push("week_days");
      if (!periods.length) errors.push("periods");
      if (!(band in HOUR_BANDS)) errors.push("hours_band");
      if (s("ack_hours") !== "true") errors.push("ack_hours");
      if (s("ack_no_refuse") !== "true") errors.push("ack_no_refuse");
      const cert = file("cert_doc");
      if (cert === "bad") errors.push("cert_doc");
      if (errors.length) return bad("กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, errors);
      done.add(2);
      await saveProfile(row.id, {
        experience: s("experience", 500), intro: s("intro", 300),
        availability: { slots: periods, days: weekDays.length, hours: HOUR_BANDS[band], week_days: weekDays, hours_band: band },
        ack_hours: true, ack_no_refuse: true, form_done: [...done],
        ...((cert || row.docs.cert_doc) ? { massage_cert: true } : {}),
      }, { cert_doc: cert instanceof File ? cert : undefined });
      await clearFixes(row, ["schedule", ...(cert instanceof File ? ["cert_doc"] : [])]);
      return NextResponse.json({ ok: true });
    }

    // ตั้งค่า (ข้อความตอบกลับอัตโนมัติ + ข้อความสำเร็จรูป)
    if (step === "settings") {
      const quick = uniq(form.getAll("quick_replies"), 10, 80);
      if ([s("auto_reply", 300), ...quick].some(hasContact)) return bad(CONTACT_MSG, 400, ["auto_reply"]);
      await saveProfile(row.id, { pt_settings: { auto_reply_on: s("auto_reply_on") === "true", auto_reply: s("auto_reply", 300), quick_replies: quick } });
      return NextResponse.json({ ok: true });
    }
    // ประกาศ "วันนี้ว่าง" — สร้าง/แก้ หรือปิด
    if (step === "post") {
      if (s("close") === "true") {
        const cur = x.post;
        await saveProfile(row.id, { post: cur ? { ...cur, open: false } : null });
        return NextResponse.json({ ok: true });
      }
      // ยังไม่อนุมัติ/ยังไม่เปิดโปรไฟล์ → ลงประกาศไม่ได้ (ปิดประกาศเดิมได้เสมอ)
      if (!isPtActive(x)) return bad(GATE_MSG, 409);
      const text = s("text", 160), time = s("time", 40), zone = s("zone", 80);
      if (hasContact(text) || hasContact(zone)) return bad(CONTACT_MSG, 400, ["text"]);
      if (!text || !time || !zone) return bad("กรอกกิจกรรม เวลา และโซนให้ครบ", 400, ["text", "time", "zone"]);
      await saveProfile(row.id, { post: { text, time, zone, open: true, created_at: new Date().toISOString() } });
      return NextResponse.json({ ok: true });
    }
    // เวลาทำงานรายวัน (บอร์ด P-Availability) — sync วันที่เปิดไปที่ availability.week_days ด้วย
    if (step === "work") {
      let raw: Record<string, { on?: unknown; from?: unknown; to?: unknown }> = {};
      try { raw = JSON.parse(s("days", 2000) || "{}"); } catch { return bad("ข้อมูลเวลาไม่ถูกต้อง"); }
      // เวลาแบบ 24 ชม. ทีละ 30 นาที · เวลาเลิกใส่ "24:00" (เที่ยงคืน) ได้ · วันที่เปิดต้องเลิกหลังเริ่ม
      const hm = (v: unknown, d: string, end = false) => (typeof v === "string" && (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) || (end && v === "24:00")) ? v : d);
      const mins = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
      const days: Record<string, { on: boolean; from: string; to: string }> = {};
      for (const d of WEEK_DAYS) days[d] = { on: raw[d]?.on === true, from: hm(raw[d]?.from, "17:00"), to: hm(raw[d]?.to, "23:00", true) };
      const badDay = WEEK_DAYS.find((d) => days[d].on && mins(days[d].to) <= mins(days[d].from));
      if (badDay) return bad(`วัน${DAY_TH[badDay]}: เวลาเลิกต้องหลังเวลาเริ่ม`, 400, ["days"]);
      const radius = Math.min(20, Math.max(2, Math.round(Number(s("radius_km")) || 8)));
      const on = WEEK_DAYS.filter((d) => days[d].on);
      const av = x.availability ?? { slots: [], days: null, hours: null };
      await saveProfile(row.id, { work: { days, radius_km: radius, paused: s("paused") === "true", updated_at: new Date().toISOString() }, availability: { ...av, week_days: on, days: on.length } });
      return NextResponse.json({ ok: true });
    }
    // โพสต์โปรไฟล์ (บอร์ด P-Posts)
    if (step === "listing") {
      if (!isPtActive(x)) return bad(GATE_MSG, 409);
      const title = s("title", 80), rules = s("rules", 600);
      if (!title) return bad("กรอกหัวข้อโพสต์", 400, ["title"]);
      if (hasContact(title) || hasContact(rules)) return bad(CONTACT_MSG, 400, ["title"]);
      await saveProfile(row.id, { listing: { title, rules, hidden: s("hidden") === "true", updated_at: new Date().toISOString() } });
      return NextResponse.json({ ok: true });
    }
    // ขอลบบัญชีและข้อมูล (PDPA) — แอดมินดำเนินการและติดต่อกลับ
    if (step === "delete_request") {
      await saveProfile(row.id, { delete_requested_at: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }
    // ยกเลิกคำขอลบบัญชีที่ยังรอดำเนินการ → โปรไฟล์กลับมาแสดงตามปกติ (isLive ดู delete_requested_at)
    if (step === "delete_cancel") {
      if (!x.delete_requested_at) return NextResponse.json({ ok: true });
      await saveProfile(row.id, { delete_requested_at: null });
      await import("@/lib/bookings").then((m) => m.notify({ user_type: "admin", user_id: "kyc", kind: "delete_cancel", title: `${row.mb_code} ยกเลิกคำขอลบบัญชี`, body: row.nickname, url: "/admin/applicants" })).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    // ย่านที่แสดงบนแผนที่ (Part-Time ตั้งเอง: GPS หรือปักหมุด) — ปัดเป็นช่อง ~1 กม. ก่อนเก็บ · GPS คลาดเกิน 2 กม. ไม่รับ · clear=1 = กลับไปใช้ย่านตอนสมัคร
    if (step === "geo") {
      if (s("clear", 2) === "1") { await saveProfile(row.id, { geo: null }); return NextResponse.json({ ok: true, geo: null }); }
      const pt = { lat: Number(s("lat", 20)), lng: Number(s("lng", 20)) };
      if (!inThailand(pt)) return bad("ตำแหน่งต้องอยู่ในประเทศไทย", 400);
      const src = s("src", 5) === "gps" ? "gps" : "pin";
      const acc = Number(s("accuracy", 10));
      if (src === "gps" && Number.isFinite(acc) && acc > 2000) return bad("GPS ยังจับตำแหน่งไม่แม่น (คลาดเกิน 2 กม.) · ลองใหม่ที่โล่ง หรือปักหมุดเอง", 400);
      const c = snapCell(pt);
      const geo = { lat: c.lat, lng: c.lng, label: nearestArea(c.lat, c.lng), src: src as "gps" | "pin", at: new Date().toISOString() };
      await saveProfile(row.id, { geo });
      return NextResponse.json({ ok: true, geo });
    }

    // ตำแหน่งรูปหลักบนการ์ด (ลากปรับในหน้า "ดูตัวอย่างการ์ด")
    if (step === "photo_pos") {
      const path = s("path", 300), pos = s("pos", 20);
      const own = [...(x.photos ?? []), ...(row.docs.photo ? [row.docs.photo] : [])];
      if (!own.includes(path)) return bad("ไม่พบรูปนี้", 400);
      const m = /^(\d{1,3})% (\d{1,3})%$/.exec(pos);
      if (!m || +m[1] > 100 || +m[2] > 100) return bad("ตำแหน่งไม่ถูกต้อง", 400);
      await saveProfile(row.id, { photo_pos: { ...(x.photo_pos ?? {}), [path]: pos } });
      return NextResponse.json({ ok: true });
    }

    if (step === "card") {
      // นวดผ่อนคลายขึ้นการ์ดได้เมื่อมีใบรับรองการนวด (cert_doc) เท่านั้น — ไม่มี = ตัดออกก่อนบันทึก แล้วบอกหน้าเว็บว่าตัดอะไร
      const { card, dropped } = dropMassage({ activities: uniq(form.getAll("activities"), 20, 40), places: uniq(form.getAll("places"), 10, 40), partner_spas: uniq(form.getAll("partner_spas"), 10, 60), skills: uniq(form.getAll("skills"), 10, 40) }, !!row.docs.cert_doc);
      await saveProfile(row.id, { card });
      return NextResponse.json({ ok: true, card, dropped, ...(dropped.length ? { warning: CERT_MSG } : {}) });
    }
    return bad("ไม่รู้จักขั้นตอนนี้");
  } catch (e) {
    if (e instanceof FileTypeError) return bad(e.message, 400);
    console.error("profile save failed", e);
    return bad("บันทึกไม่สำเร็จ กรุณาลองใหม่", 500);
  }
}
