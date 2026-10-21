import { NextResponse } from "next/server";
import { FileTypeError } from "@/lib/file-guard";
import { canResume } from "@/lib/join/resume";
import { addProfilePhoto, extraOf, getByMb, setProfilePhotos } from "@/lib/join/store";

export const runtime = "nodejs";

// รูปโปรไฟล์ (บอร์ด ProviderPhotos) — เพิ่มทีละรูป (multipart: file) · ลบ / ตั้งเป็นรูปหลัก (JSON: action, index) · สูงสุด 9 รูป
const MAX_FILE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const isJson = (req.headers.get("content-type") ?? "").includes("application/json");
  let mb = "", t = "", action = "add", index = -1;
  let f: File | null = null;
  if (isJson) {
    const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; action?: string; index?: number };
    mb = String(b.mb ?? ""); t = String(b.t ?? "").slice(0, 2048); action = String(b.action ?? ""); index = Number(b.index);
  } else {
    const form = await req.formData().catch(() => null);
    if (!form) return bad("ข้อมูลไม่ถูกต้อง");
    mb = String(form.get("mb") ?? ""); t = String(form.get("t") ?? "").slice(0, 2048);
    const x = form.get("file");
    f = x instanceof File && x.size > 0 ? x : null;
  }
  if (!/^M[BS]-\d{7,}$/.test(mb) || !(await canResume(mb, t || null))) return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);
  const photos = [...(extraOf(row).photos ?? [])];

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
