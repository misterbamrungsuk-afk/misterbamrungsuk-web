import { NextResponse } from "next/server";
import { FileTypeError } from "@/lib/file-guard";
import { canResume } from "@/lib/join/resume";
import { addProfilePhoto, extraOf, getByMb, saveProfile, setProfilePhotos } from "@/lib/join/store";
import { DEFAULT_BOX, cleanBox } from "@/lib/join/face-blur";

export const runtime = "nodejs";

// รูปโปรไฟล์ (บอร์ด ProviderPhotos) — เพิ่มทีละรูป (multipart: file) · ลบ / ตั้งเป็นรูปหลัก (JSON: action, index) · สูงสุด 9 รูป
const MAX_FILE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const isJson = (req.headers.get("content-type") ?? "").includes("application/json");
  let mb = "", t = "", action = "add", index = -1;
  let extra: Record<string, unknown> = {};
  let f: File | null = null;
  if (isJson) {
    const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; action?: string; index?: number } & Record<string, unknown>;
    mb = String(b.mb ?? ""); t = String(b.t ?? "").slice(0, 2048); action = String(b.action ?? ""); index = Number(b.index); extra = b;
  } else {
    const form = await req.formData().catch(() => null);
    if (!form) return bad("ข้อมูลไม่ถูกต้อง");
    mb = String(form.get("mb") ?? ""); t = String(form.get("t") ?? "").slice(0, 2048);
    const x = form.get("file");
    f = x instanceof File && x.size > 0 ? x : null;
  }
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, t || null))) return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);
  const photos = [...(extraOf(row).photos ?? [])];

  const x = extraOf(row);
  // เปิดเผย/ไม่เปิดเผยใบหน้า (ไม่เปิดเผยต้องรับทราบผลต่อจำนวนงาน) · ตั้งจุดเบลอต่อรูป
  if (action === "disclose") {
    const v = extra.value === "no" ? "no" : extra.value === "yes" ? "yes" : null;
    if (!v) return bad("เลือกการเปิดเผยใบหน้า");
    if (v === "no" && extra.ack !== true) return bad("ติ๊กรับทราบว่าการเบลอหน้ามีผลต่อจำนวนงาน");
    await saveProfile(row.id, { disclose: v, blur_ack: v === "no" });
    return NextResponse.json({ ok: true, photos, disclose: v });
  }
  if (action === "blur") {
    if (!(index >= 0 && index < photos.length)) return bad("ไม่พบรูป");
    const box = cleanBox(extra.box) ?? DEFAULT_BOX;
    const face_blur = { ...(x.face_blur ?? {}), [photos[index]]: box };
    for (const k of Object.keys(face_blur)) if (!photos.includes(k)) delete face_blur[k];
    await saveProfile(row.id, { face_blur });
    return NextResponse.json({ ok: true, photos, face_blur });
  }
  try {
    if (action === "add") {
      if (!f || !IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) return bad("รูป JPG/PNG/WEBP ไม่เกิน 10MB");
      if (photos.length >= 9) return bad("ใส่ได้สูงสุด 9 รูป");
      photos.push(await addProfilePhoto(row.id, f));
    } else if (action === "remove" || action === "main") {
      if (!(index >= 0 && index < photos.length)) return bad("ไม่พบรูป");
      const [p] = photos.splice(index, 1);
      if (action === "main") photos.unshift(p);
    } else return bad("ไม่รู้จักคำสั่ง");
    await setProfilePhotos(row.id, photos);
    return NextResponse.json({ ok: true, photos });
  } catch (e) {
    if (e instanceof FileTypeError) return bad(e.message, 400);
    console.error("photos failed", e);
    return bad("บันทึกไม่สำเร็จ กรุณาลองใหม่", 500);
  }
}
