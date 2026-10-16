import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile, updateProfile } from "@/lib/customer/profile";
import { listForCustomer, listNotices } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// โปรไฟล์ลูกค้า (บอร์ด C-Account / C-EditProfile) — GET = ข้อมูล + ตัวนับ · POST = แก้ชื่อ / ผู้ติดต่อฉุกเฉิน / เพื่อนที่ถูกใจ
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const p = await getProfile(me.sub, me.email);
  const [bookings, notices] = await Promise.all([listForCustomer(me.sub).catch(() => []), listNotices("customer", me.sub).catch(() => [])]);
  return NextResponse.json({ ok: true, profile: { ...p, id: undefined }, counts: { bookings: bookings.length, favorites: p.favorites.length, unread: notices.filter((n) => !n.read_at).length } });
}

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; emergency?: { name?: string; tel?: string; relation?: string } | null; favorite?: string; on?: boolean };
  const p = await getProfile(me.sub, me.email);
  const patch: Parameters<typeof updateProfile>[2] = {};
  if (b.name !== undefined) {
    const name = String(b.name).trim().slice(0, 60);
    if (!name) return NextResponse.json({ ok: false, error: "กรอกชื่อที่แสดง" }, { status: 400 });
    patch.name = name;
  }
  if (b.emergency !== undefined) {
    if (b.emergency === null) patch.emergency = null;
    else {
      const tel = String(b.emergency.tel ?? "").replace(/\D/g, "");
      if (!String(b.emergency.name ?? "").trim() || !/^0\d{8,9}$/.test(tel)) return NextResponse.json({ ok: false, error: "กรอกชื่อและเบอร์ผู้ติดต่อฉุกเฉินให้ถูกต้อง" }, { status: 400 });
      patch.emergency = { name: String(b.emergency.name).trim().slice(0, 60), tel, relation: String(b.emergency.relation ?? "").slice(0, 30) };
    }
  }
  if (b.favorite !== undefined) {
    const id = String(b.favorite);
    if (!/^[a-z0-9-]{2,20}$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
    const set = new Set(p.favorites);
    if (b.on === false) set.delete(id); else set.add(id);
    patch.favorites = [...set].slice(-100);
  }
  try {
    const n = await updateProfile(me.sub, me.email, patch);
    return NextResponse.json({ ok: true, profile: { ...n, id: undefined } });
  } catch (e) {
    console.error("me update", e);
    return NextResponse.json({ ok: false, error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
