import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { partnerFromTokenOrSession } from "@/lib/partner/identify";
import { MAX_FILE, QC_TYPES, putPartnerFile } from "@/lib/partner/portal";
import { QC_DOC_DEFS, QC_TIMES, qcDays, type QcDocKey, type QcDocs } from "@/lib/partner/status";
import { updatePartner } from "@/lib/partner/store";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const MAX_PHOTOS = 10;

// นัด QC สถานที่ (/partner/qc) — ผู้เรียก: ผู้สมัครที่ถือ token (?t=) หรือพาร์ทเนอร์ที่ล็อกอิน
// multipart: action=upload (key, files…) | remove (key, path) | book (date YYYY-MM-DD, time HH:MM)
export async function POST(req: Request) {
  if (await limited(`pqc:${clientIp(req)}`, 40, 10 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่", 429);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("ข้อมูลไม่ถูกต้อง");
  }
  const p = await partnerFromTokenOrSession(String(form.get("token") ?? "") || null);
  if (!p) return bad("กรุณาเข้าสู่ระบบ", 401);
  const action = String(form.get("action") ?? "");
  const docs: QcDocs = { ...(p.qc_docs ?? {}) };

  try {
    if (action === "upload" || action === "remove") {
      const key = String(form.get("key") ?? "") as QcDocKey;
      const def = QC_DOC_DEFS.find((d) => d.key === key);
      if (!def) return bad("ประเภทเอกสารไม่ถูกต้อง");
      if (action === "remove") {
        const path = String(form.get("path") ?? "");
        docs[key] = (docs[key] ?? []).filter((x) => x !== path);
      } else {
        const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
        if (!files.length) return bad("เลือกไฟล์ก่อน");
        for (const f of files) if (!QC_TYPES.includes(f.type) || f.size > MAX_FILE) return bad("ไฟล์ต้องเป็น JPG/PNG/WEBP/PDF ไม่เกิน 5MB");
        const list = def.multi ? files.slice(0, MAX_PHOTOS) : files.slice(0, 1);
        const paths: string[] = [];
        for (const f of list) paths.push(await putPartnerFile(p.id, "qc", f));
        docs[key] = def.multi ? [...(docs[key] ?? []), ...paths].slice(-MAX_PHOTOS) : paths;
      }
      const row = await updatePartner(p.id, { qc_docs: docs });
      return NextResponse.json({ ok: true, docs: row?.qc_docs ?? docs });
    }
    if (action === "book") {
      const date = String(form.get("date") ?? "");
      const time = String(form.get("time") ?? "");
      if (!qcDays().some((d) => d.date === date)) return bad("เลือกวันที่นัดได้");
      if (!(QC_TIMES as readonly string[]).includes(time)) return bad("เลือกเวลา");
      if (p.qc === "passed") return bad("ผ่าน QC แล้ว ไม่ต้องนัดใหม่");
      const slot = new Date(`${date}T${time}:00+07:00`).toISOString();
      const row = await updatePartner(p.id, { qc_slot: slot, qc_status: "booked", qc: "pending" });
      return NextResponse.json({ ok: true, qc_slot: row?.qc_slot ?? slot });
    }
    return bad("action");
  } catch (e) {
    console.error("partner qc", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่ (ตรวจว่ารัน supabase/partner/0005_qc.sql แล้ว)", 500);
  }
}
