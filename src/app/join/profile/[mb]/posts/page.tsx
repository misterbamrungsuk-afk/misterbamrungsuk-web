/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEarnings } from "@/lib/join/earnings-settings";
import { TRAINING } from "@/lib/join/training";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, baht, loadPt, ptHref } from "../_pt";
import { ListingForm } from "../_ptc2";
import { GATE_MSG, GATE_SHORT, isPtActive } from "@/lib/join/pt-ui";
import { interestsForPt } from "@/lib/interests";

export const dynamic = "force-dynamic";
export const metadata = { title: "โพสต์ของฉัน — Mister Bamrungsuk" };

// บอร์ด P-Posts — โพสต์ได้บัญชีละ 1 โพสต์ · รูป 6 รูปแรกจากรูปโปรไฟล์ (รูปแรก = ปก) · กิจกรรม/สถานที่/สปาจากการ์ดโปรไฟล์ · ราคาตามระดับ (แอดมินกำหนด)
export default async function PostsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const file = (p: string) => `/api/join/file?mb=${c.mb}&path=${encodeURIComponent(p)}${c.t ? `&t=${encodeURIComponent(c.t)}` : ""}`;
  const photos = (c.x.photos ?? []).slice(0, 6).map(file);
  const card = c.x.card ?? { activities: [], places: [], partner_spas: [], skills: [] };
  const cfg = await getEarnings();
  const svc = c.row.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  const top = c.x.tier === "top";
  const l = c.x.listing;
  const chip = "inline-flex items-center min-h-9 rounded-full text-[13px] font-light";
  // คนที่สนใจประกาศ "วันนี้ว่าง" (ลูกค้ากด "สนใจ" ในโปรไฟล์) — ชื่อแรกปิดบัง · ไม่มีข้อมูลติดต่อ
  const fans = await interestsForPt(c.row).catch(() => ({ count: 0, list: [] as { label: string; at: string }[] }));
  const when = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="โพสต์ของฉัน" right={<span className="text-[12px] font-light text-[#d9c9b4]">บัญชีละ 1 โพสต์</span>} />
      <div className="px-4 flex flex-col gap-[18px] md:grid md:grid-cols-2 md:items-start md:gap-6">
        <div className="flex flex-col gap-[18px] min-w-0">
          <div className="rounded-2xl bg-[#211a18] flex items-center gap-2.5" style={{ padding: "12px 14px", border: "1px solid rgba(243,234,217,0.07)" }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l?.hidden ? "#b5a596" : "#e8c472" }} />
            <div className="flex-grow text-[14px]">{!l ? "ยังไม่ได้สร้างโพสต์" : l.hidden ? "ซ่อนอยู่ชั่วคราว" : c.x.listed ? "แสดงต่อลูกค้าอยู่" : "บันทึกแล้ว"}{c.x.listed ? "" : ` · ลูกค้าเห็นเมื่อเปิดบริการ ${TRAINING.openService}`}</div>
          </div>
          <div id="interested" className="rounded-2xl bg-[#211a18] flex flex-col gap-2" style={{ padding: "12px 14px", border: "1px solid rgba(243,234,217,0.07)" }}>
            <div className="flex justify-between items-baseline gap-2"><span className="text-[14px] font-semibold">คนที่สนใจประกาศวันนี้ว่าง</span><b className="text-[22px] text-[#e8c472] font-bold" data-interest-count={fans.count}>{fans.count}</b></div>
            {!c.x.post?.open
              ? <span className="text-[13px] font-light text-[#b5a596]">ยังไม่ได้ลงประกาศวันนี้ว่าง · ลงได้ที่ <Link href={ptHref(c, "jobs")} className="text-[#e8c472]">งานและประกาศ ›</Link></span>
              : !fans.count
                ? <span className="text-[13px] font-light text-[#b5a596]">ยังไม่มีคนกดสนใจ · ลูกค้าเห็นประกาศในโปรไฟล์ของคุณ</span>
                : <>
                  <div className="flex flex-wrap gap-1.5">{fans.list.slice(0, 30).map((f, i) => <span key={i} className={chip} style={{ padding: "0 12px", border: "1px solid rgba(243,234,217,0.14)", color: "#f3ead9" }}>{f.label} · {when(f.at)}</span>)}</div>
                  <span className="text-[12.5px] font-light text-[#d9c9b4]">ลูกค้าที่สนใจกดจองได้จากโปรไฟล์ของคุณ · คำขอจองจะขึ้นที่ &quot;งานเข้า&quot; ให้กดตอบรับ</span>
                </>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-[#d9c9b4]">รูปภาพ · 6 รูปแรกจากรูปโปรไฟล์</span>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={src} className="relative aspect-[3/4] rounded-[14px] overflow-hidden"><img src={src} alt={`รูปที่ ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 h-5 rounded-md bg-[#e8c472] text-[#1b130b] text-[12px] font-semibold flex items-center px-[7px]">ปก</span>}</div>
              ))}
              {photos.length < 6 && <Link href={ptHref(c, "photos")} aria-label="เพิ่มรูป" className="aspect-[3/4] rounded-[14px] grid place-items-center text-[#e8c472] hover:text-[#e8c472]" style={{ border: "1px dashed #e8c472" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></Link>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center"><span className="text-[13px] text-[#d9c9b4]">กิจกรรม · สถานที่ · สปาพาร์ทเนอร์</span><Link href={ptHref(c)} className="min-h-10 inline-flex items-center pl-2 shrink-0 text-[13px] text-[#e8c472] font-light">แก้ที่การ์ดโปรไฟล์ ›</Link></div>
            <div className="flex flex-wrap gap-2">
              {[...card.activities, ...card.places, ...card.partner_spas].map((a) => <span key={a} className={chip} style={{ padding: "0 14px", border: "1px solid #e8c472", color: "#e8c472", background: "rgba(212,175,55,.12)" }}>{a}</span>)}
              {!card.activities.length && !card.places.length && <span className="text-[13px] font-light text-[#b5a596]">ยังไม่ได้เลือก</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">ราคา 3 ชม.</span><div className="h-12 rounded-[14px] bg-[#211a18] flex items-center px-3.5 text-[15px]" style={{ border: "1px solid rgba(243,234,217,0.07)" }}>{baht(top ? svc.top : svc.silver)}</div></div>
            <div className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">ช่วงเวลา</span><div className="h-12 rounded-[14px] bg-[#211a18] flex items-center px-3.5 text-[15px]" style={{ border: "1px solid rgba(243,234,217,0.07)" }}>3 ชม. / 5 ชม.</div></div>
          </div>
          <span className="text-[12px] font-light text-[#b5a596] -mt-2">ราคาตามระดับ {top ? "TOP" : "Silver"} · ทีมงานเป็นผู้กำหนด</span>
        </div>
        {/* ยังไม่อนุมัติ/ยังไม่เปิดโปรไฟล์ → ลงโพสต์ไม่ได้ (API ตอบ 409) */}
        {isPtActive(c.x)
          ? <ListingForm mb={c.mb} t={c.t} init={l ?? null} previewHref={ptHref(c)} />
          : <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1" style={{ padding: 16 }}><b className="font-semibold text-[#e8c472]">{GATE_SHORT}</b><span className="text-[14px] font-light text-[#d9c9b4]">{GATE_MSG} · ระหว่างนี้จัดรูปและการ์ดโปรไฟล์ให้พร้อมได้เลย</span></div>}
      </div>
      <PtNav c={c} active="jobs" />
    </PtPage>
  );
}
