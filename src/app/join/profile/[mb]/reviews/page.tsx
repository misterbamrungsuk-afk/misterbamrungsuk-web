import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewsFor } from "@/lib/bookings/day";
import { Forbidden } from "../../../_kyc/ui";
import { PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "รีวิวของฉัน — Mister Bamrungsuk" };

// บอร์ด P-Reviews — หัวพื้น #251d1b · คะแนนรวม + แท่ง 5→1 · รายการรีวิวจริงจากลูกค้า (ไม่รวมรีวิวที่แอดมินซ่อน)
const AGAIN: Record<string, string> = { yes: "อยากจองอีก", maybe: "อาจจองอีก", no: "ไม่จองอีก" };
const date = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  // reviewsFor ตัดรีวิวที่ซ่อนแล้ว · กรองซ้ำกันพลาด (แหล่งข้อมูลเก่า)
  const list = (await reviewsFor(c.row.id).catch(() => [])).filter((r) => !r.hidden).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const n = list.length;
  const avg = n ? list.reduce((t, r) => t + r.rating, 0) / n : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => [s, list.filter((r) => Math.round(r.rating) === s).length] as const);
  const card = "rounded-[18px] bg-[#211a18]";
  const stars = (v: number) => "★★★★★".slice(0, Math.round(v)) + "☆☆☆☆☆".slice(0, 5 - Math.round(v));
  return (
    <PtPage>
      <header className="flex items-center gap-3 h-[68px] bg-[#251d1b]" style={{ padding: "12px 16px" }}>
        <Link href={ptHref(c)} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] text-[#f3ead9] grid place-items-center shrink-0 hover:text-[#f3ead9]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <h1 className="m-0 flex-1 text-[18px] font-semibold">รีวิวของฉัน</h1>
      </header>
      <main className="flex flex-col gap-3.5 max-w-[560px]" style={{ padding: "20px 16px 24px", lineHeight: 1.6 }}>
        <div className={`${card} flex gap-4 items-center`} style={{ padding: 16 }}>
          <div className="text-center shrink-0"><div className="font-semibold text-[36px] text-[#e8c472] leading-tight">{n ? avg.toFixed(1) : "—"}</div><div className="text-[12px] font-light text-[#b5a596]">{n} รีวิว</div></div>
          <div className="flex-1 flex flex-col gap-1">
            {dist.map(([s, k]) => (
              <div key={s} className="flex items-center gap-2 text-[12px] font-light text-[#b5a596]">
                <span className="w-2.5">{s}</span>
                <span className="flex-1 h-1.5 rounded-[3px] bg-[#251d1b] overflow-hidden"><span className="block h-full bg-[#e8c472]" style={{ width: `${n ? (k / n) * 100 : 0}%` }} /></span>
                <span className="w-5 text-right tabular-nums">{k}</span>
              </div>
            ))}
          </div>
        </div>
        {!n ? (
          <div className={`${card} flex flex-col items-center text-center gap-1`} style={{ padding: "28px 16px" }}>
            <span className="font-semibold">ยังไม่มีรีวิว</span>
            <span className="text-[14px] font-light text-[#d9c9b4]">ลูกค้าจะรีวิวได้หลังจบนัด</span>
          </div>
        ) : list.map((r) => (
          <article key={r.booking_id} className={`${card} flex flex-col gap-1.5`} style={{ padding: 14 }}>
            <div className="flex justify-between items-center gap-2"><span className="text-[#e8c472] text-[15px] tracking-[1px]" aria-label={`${r.rating} ดาว`}>{stars(r.rating)}</span><span className="text-[12px] font-light text-[#b5a596]">{date(r.created_at)}</span></div>
            {!!r.tags?.length && <div className="flex flex-wrap gap-1.5">{r.tags.map((t) => <span key={t} className="text-[12px] rounded-full font-light" style={{ padding: "2px 10px", background: "rgba(232,196,114,0.12)", color: "#e8c472" }}>{t}</span>)}</div>}
            {r.body && <p className="m-0 text-[14px] font-light text-[#f3ead9] break-words">{r.body}</p>}
            {r.again && AGAIN[r.again] && <span className="text-[12px] font-light text-[#d9c9b4]">{AGAIN[r.again]}</span>}
          </article>
        ))}
        <div className="text-[12px] font-light text-[#b5a596] text-center">รีวิวที่ไม่สุภาพหรือมีข้อมูลส่วนตัว แจ้งทีมงานทาง LINE ให้ซ่อนได้</div>
      </main>
      <PtNav c={c} active="home" />
    </PtPage>
  );
}
