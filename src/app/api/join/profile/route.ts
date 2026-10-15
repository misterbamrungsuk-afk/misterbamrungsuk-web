import { NextResponse } from "next/server";
import { ageError } from "@/lib/join/config";
import { ageFrom } from "@/lib/join/form";
import { canResume } from "@/lib/join/resume";
import { extraOf, getByMb, saveProfile, clearFixes } from "@/lib/join/store";
import { CONTACT_MSG, hasContact } from "@/lib/join/contact-guard";

export const runtime = "nodejs";

// ใบสมัครหลังชำระเงิน — step=1 (บอร์ด JoinForm) · step=2 (JoinForm2) · step=card (แท็บ "แก้ไข" ในโปรไฟล์ของฉัน)
// ต้องเป็นเจ้าของรหัส (cookie mb_resume หรือ t)
const MAX_FILE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const WEEK_DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const PERIODS = ["กลางวัน", "กลางคืน"];
const HOUR_BANDS: Record<string, number> = { "3–4 ชม.": 4, "5–6 ชม.": 6, "7–8 ชม.": 8, "มากกว่า 8 ชม.": 10 };
const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, fields }, { status });
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const uniq = (xs: FormDataEntryValue[], max = 40, len = 60) => [...new Set(xs.map((x) => String(x).trim().slice(0, len)))].filter(Boolean).slice(0, max);

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const s = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const mb = s("mb");
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, s("t", 2048) || null))) return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาติดต่อแอดมิน", 403);
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
        ...(row.package === "B" && (cert || row.docs.cert_doc) ? { massage_cert: true } : {}),
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
      const hm = (v: unknown, d: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
      const days: Record<string, { on: boolean; from: string; to: string }> = {};
      for (const d of WEEK_DAYS) days[d] = { on: raw[d]?.on === true, from: hm(raw[d]?.from, "17:00"), to: hm(raw[d]?.to, "23:00") };
      const radius = Math.min(20, Math.max(2, Math.round(Number(s("radius_km")) || 8)));
      const on = WEEK_DAYS.filter((d) => days[d].on);
      const av = x.availability ?? { slots: [], days: null, hours: null };
      await saveProfile(row.id, { work: { days, radius_km: radius, paused: s("paused") === "true", updated_at: new Date().toISOString() }, availability: { ...av, week_days: on, days: on.length } });
      return NextResponse.json({ ok: true });
    }
    // โพสต์โปรไฟล์ (บอร์ด P-Posts)
    if (step === "listing") {
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
      await saveProfile(row.id, {
        card: { activities: uniq(form.getAll("activities"), 20, 40), places: uniq(form.getAll("places"), 10, 40), partner_spas: uniq(form.getAll("partner_spas"), 10, 60), skills: uniq(form.getAll("skills"), 10, 40) },
      });
      return NextResponse.json({ ok: true });
    }
    return bad("ไม่รู้จักขั้นตอนนี้");
  } catch (e) {
    console.error("profile save failed", e);
    return bad("บันทึกไม่สำเร็จ กรุณาลองใหม่", 500);
  }
}
