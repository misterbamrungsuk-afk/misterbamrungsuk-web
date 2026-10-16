import Link from "next/link";
import { getLiveApplicants, getLivePeople, publicId, mainPos } from "@/lib/home/live";
import { personById } from "@/lib/home/people";
import { extraOf, type Applicant } from "@/lib/join/store";
import { listForParttime, priceFor } from "@/lib/bookings";
import { listPartners } from "@/lib/partner/store";
import { PARTNER_SPAS } from "@/lib/booking";
import { BookFlow, type Avail } from "./flow";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "นัดเพื่อน — Mister Bamrungsuk" };

const JS_DAY: Record<string, number> = { "อา": 0, "จ": 1, "อ": 2, "พ": 3, "พฤ": 4, "ศ": 5, "ส": 6 };
const hr = (s: string) => Number(s.split(":")[0]) || 0;

/** ช่วงเวลาที่รับงานต่อวัน (0=อาทิตย์) จากหน้า "วันเวลาที่รับงาน" ของ Part-Time · ไม่ได้ตั้ง = 10:00–22:00 ทุกวัน */
function availOf(a: Applicant): Avail {
  const x = extraOf(a);
  const out: Avail = {};
  if (x.work?.days && Object.values(x.work.days).some((d) => d.on)) {
    for (const [k, d] of Object.entries(x.work.days)) if (d.on && k in JS_DAY) out[JS_DAY[k]] = [hr(d.from), hr(d.to) || 24];
    return out;
  }
  const days = x.availability?.week_days ?? [];
  const slots = x.availability?.slots ?? [];
  const from = slots.includes("กลางวัน") ? 10 : 17, to = slots.includes("กลางคืน") ? 24 : 18;
  for (const k of days.length ? days : Object.keys(JS_DAY)) if (k in JS_DAY) out[JS_DAY[k]] = slots.length ? [from, to] : [10, 22];
  return out;
}

// บอร์ด C-Booking → C-Schedule → C-Checkout · จองได้เฉพาะ Part-Time จริงที่เปิดรับงาน · คนตัวอย่างแสดงข้อความแจ้ง
export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const live = /^r[0-9a-f]{10}$/.test(id) ? (await getLiveApplicants().catch(() => [])).find((a) => publicId(a.mb_code) === id) : undefined;
  if (!live) {
    const sample = personById(id);
    return (
      <div className="flex flex-col items-center text-center gap-3" style={{ padding: "80px 24px" }}>
        <h1 className="m-0 font-semibold text-[22px]">{sample ? `${sample.nick} เป็นข้อมูลตัวอย่าง` : "ไม่พบเพื่อนคนนี้"}</h1>
        <p className="m-0 text-[14px] text-[#d9c9b4]">{sample ? "ตัวอย่างใช้แสดงหน้าตาแอป ยังจองจริงไม่ได้ · เลือกเพื่อนที่เปิดรับงานจากหน้าแรก" : "เพื่อนอาจปิดรับงานชั่วคราว ลองเลือกคนอื่นจากหน้าแรก"}</p>
        <Link href="/" className="mt-2 h-12 px-6 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">กลับหน้าแรก</Link>
      </div>
    );
  }
  const person = (await getLivePeople()).find((p) => p.id === id)!;
  const [p3, p5, theirs] = await Promise.all([priceFor(live, 3), priceFor(live, 5), listForParttime(live.id).catch(() => [])]);
  // ช่วงที่เพื่อนมีนัดแล้ว (เฉพาะเวลา ไม่ส่งข้อมูลลูกค้าคนอื่น) → ขีดฆ่าในหน้าเลือกเวลา ตรงกับเงื่อนไขกันนัดซ้อนฝั่งเซิร์ฟเวอร์
  const busy = theirs.filter((b) => ["requested", "accepted", "checked_in"].includes(b.status) && Date.parse(b.starts_at) > Date.now() - 24 * 3600_000).map((b) => ({ s: Date.parse(b.starts_at), h: b.hours }));
  const real = await listPartners().then((l) => l.filter((x) => x.type === "สปา" && (x.account_status === "active" || x.status === "active")).map((x) => ({ id: x.id, name: x.business_name, area: x.province, price: 0 }))).catch(() => []);
  const spas = (real.length ? real : PARTNER_SPAS).map((s) => ({ id: s.id, name: s.name, area: s.area, price: s.price }));
  const me = await currentCustomer().catch(() => null);
  const prof = me ? await getProfile(me.sub, me.email).catch(() => null) : null;
  if (prof?.blocked.includes(id)) return <div className="text-center" style={{ padding: "80px 24px" }}><p className="text-[#d9c9b4]">คุณบล็อกเพื่อนคนนี้ไว้ · ยกเลิกบล็อกได้ที่ บัญชี › ผู้ใช้ที่บล็อก</p><Link href="/profile/blocked" className="text-[#e8c472]">จัดการผู้ใช้ที่บล็อก</Link></div>;
  return <BookFlow p={{ id, nick: person.nick, img: person.img, pos: mainPos(live) ?? null, area: person.area, rating: person.rating }} price={{ 3: p3, 5: p5 }} avail={availOf(live)} busy={busy} spas={spas} saved={prof?.addresses ?? []} />;
}
