import Link from "next/link";
import { notFound } from "next/navigation";
import { getLiveApplicants, getLivePeople, publicId } from "@/lib/home/live";
import { reviewsFor } from "@/lib/bookings/day";
import { listForParttime } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "รีวิวทั้งหมด — Mister Bamrungsuk", robots: { index: false } };

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const ago = (iso: string) => { const d = Math.floor((Date.now() - Date.parse(iso)) / 86400e3); return d < 1 ? "วันนี้" : d < 7 ? `${d} วันก่อน` : d < 30 ? `${Math.floor(d / 7)} สัปดาห์ก่อน` : new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }); };

// บอร์ด C-Reviews "รีวิวของ…" — คะแนนเฉลี่ย + กราฟแท่ง 5 ระดับ · กรอง ทั้งหมด / ★5 / ★4 / ต่ำกว่า 4 · รีวิวจากลูกค้าที่จองจริงเท่านั้น
export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const { id } = await params;
  const { f = "all" } = await searchParams;
  if (!/^r[0-9a-f]{10}$/.test(id)) notFound();
  const [p, a] = await Promise.all([getLivePeople().then((l) => l.find((x) => x.id === id)).catch(() => undefined), getLiveApplicants().then((l) => l.find((x) => publicId(x.mb_code) === id)).catch(() => undefined)]);
  if (!p || !a) notFound();
  const [all, bookings] = await Promise.all([reviewsFor(a.id).catch(() => []), listForParttime(a.id).catch(() => [])]);
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const avg = all.length ? (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1) : null;
  const count = (n: number) => all.filter((r) => r.rating === n).length;
  const shown = f === "5" ? all.filter((r) => r.rating === 5) : f === "4" ? all.filter((r) => r.rating === 4) : f === "low" ? all.filter((r) => r.rating < 4) : all;
  const chips: [string, string][] = [["all", "ทั้งหมด"], ["5", "★ 5"], ["4", "★ 4"], ["low", "ต่ำกว่า 4"]];
  return (
    <div className="min-h-dvh pb-10" style={{ background: "#171211", color: "#f3ead9" }}>
      <main className="mx-auto w-full max-w-[480px] md:max-w-[640px]">
        <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
          <Link href={`/p/${id}`} aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
          <h1 className="m-0 font-semibold text-[19px]">รีวิวของ{p.nick}</h1>
        </div>
        <div className="flex gap-[18px] items-center" style={{ padding: "0 16px" }}>
          <div className="text-center shrink-0"><div className="font-bold text-[48px] leading-none">{avg ?? "–"}</div><div className="text-[14px]" style={{ color: GOLD }}>{"★".repeat(Math.round(Number(avg ?? 0)))}{"☆".repeat(5 - Math.round(Number(avg ?? 0)))}</div><div className="text-[12px] font-light text-[#d9c9b4]">{all.length} รีวิว</div></div>
          <div className="flex-1 flex flex-col gap-[5px]">
            {[5, 4, 3, 2, 1].map((n) => <div key={n} className="flex items-center gap-2 text-[12px] text-[#d9c9b4]"><span className="w-2.5">{n}</span><div className="flex-1 h-[5px] rounded-[5px] overflow-hidden" style={{ background: LN }}><span className="block h-full" style={{ width: `${all.length ? (count(n) / all.length) * 100 : 0}%`, background: GOLD }} /></div></div>)}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ padding: "18px 16px 4px" }}>
          {chips.map(([k, l]) => <Link key={k} href={`/p/${id}/reviews${k === "all" ? "" : `?f=${k}`}`} className="h-10 px-4 rounded-full text-[13.5px] flex items-center whitespace-nowrap" style={f === k ? { background: "#f3ead9", color: "#171211", border: "1px solid #f3ead9" } : { border: `1px solid ${LN}`, color: "#f3ead9" }}>{l}</Link>)}
        </div>
        <div style={{ padding: "0 16px" }}>
          {!shown.length && <p className="text-center text-[14px] text-[#d9c9b4] font-light" style={{ padding: 28 }}>{all.length ? "ไม่มีรีวิวในตัวกรองนี้" : "ยังไม่มีรีวิว · รีวิวจะขึ้นหลังจบนัดแรก"}</p>}
          {shown.map((r, i) => {
            const b = byId.get(r.booking_id);
            const who = b?.customer_name?.trim() ? `คุณ ${b.customer_name.trim()[0]}.` : "ลูกค้าที่จองจริง";
            return (
              <div key={r.booking_id} className="flex flex-col gap-1.5" style={{ padding: "14px 0", borderBottom: i < shown.length - 1 ? `1px solid ${LN}` : "none" }}>
                <div className="flex justify-between"><b className="font-medium">{who}</b><span className="text-[12px] font-light text-[#d9c9b4]">{ago(r.created_at)}</span></div>
                <div className="text-[13px] font-light" style={{ color: GOLD }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}{b ? <span className="text-[#d9c9b4]"> · {b.place.label} {b.hours} ชม.</span> : null}</div>
                {r.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{r.tags.map((t) => <span key={t} className="h-6 px-2.5 rounded-full text-[12px] flex items-center text-[#d9c9b4]" style={{ border: `1px solid ${LN}` }}>{t}</span>)}</div>}
                {r.body && <div className="text-[14px] leading-[1.55]">{r.body}</div>}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
