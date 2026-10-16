"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { savePlace } from "@/lib/market/place-pick";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export type VenueCard = { id: string; name: string; province: string; area: string; img: string; tags: string; price: number | null; sample: boolean };
export type VenueFull = {
  id: string; name: string; type: "โรงแรม" | "สปา"; province: string; area: string; sample: boolean; description: string;
  gallery: string[]; facts: string[]; services: { name: string; desc: string; price: number; base: number }[];
  tel: string; telLabel: string; line: string; map: string;
};

const BD = "rgba(232,196,114,.38)";
const fmt = (n: number) => "฿" + n.toLocaleString("en-US");
const chipStyle = (on: boolean) => ({ border: `1px solid ${on ? "#e8c472" : BD}`, background: on ? "#e8c472" : "#211a18", color: on ? "#1b130b" : "#d9c9b4" });
const CHIP = "min-h-10 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap shrink-0";
const HROW = "flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function Back({ href, glass = false }: { href: string; glass?: boolean }) {
  return (
    <Link href={href} aria-label="ย้อนกลับ" className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#f3ead9]"
      style={glass ? { border: "1px solid rgba(246,239,228,.3)", background: "rgba(0,0,0,.45)" } : { border: `1px solid ${BD}` }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
    </Link>
  );
}

export function LuxHeader({ back, eyebrow, title, right }: { back: string; eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-[18px] py-4 h-[77px] bg-[#171211]" style={{ borderBottom: `1px solid ${BD}` }}>
      <Back href={back} />
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">{eyebrow}</div>
        <h1 className="m-0 font-lux font-semibold text-[20px] truncate">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export const Badge = () => (
  <span className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full text-[11px] font-semibold text-[#e8c472]" style={{ border: "1px solid rgba(212,175,55,.55)", background: "rgba(232,196,114,.18)" }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 12 5 5 9-10" /></svg>ทำงานร่วมกับ Mister Bamrungsuk
  </span>
);

function Toast({ text }: { text: string }) {
  if (!text) return null;
  return <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[100px] w-[calc(min(100vw,480px)-36px)] px-3.5 py-3 rounded-xl bg-[#21191a] text-[#7fd6a3] text-[13px] z-50" style={{ border: "1px solid #3f8f63" }}>{text}</div>;
}
function useToast() {
  const [t, setT] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (s: string) => { setT(s); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setT(""), 1800); };
  return [t, flash] as const;
}

/* ───────── List ───────── */
export function VenueListView({ type, items }: { type: "โรงแรม" | "สปา"; items: VenueCard[] }) {
  const hotel = type === "โรงแรม";
  const base = hotel ? "/hotels" : "/spas";
  const [prov, setProv] = useState("ทั้งหมด");
  const [sort, setSort] = useState<"rec" | "price">("rec");
  const provs = useMemo(() => ["ทั้งหมด", ...[...new Set(items.map((i) => i.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"))], [items]);
  let list = items.filter((d) => prov === "ทั้งหมด" || d.province === prov);
  if (sort === "price") list = list.slice().sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  return (
    <main className="min-h-dvh bg-[#171211] text-[#f3ead9] mb-v7 mb-c">
      <div className="max-w-[480px] md:max-w-[760px] lg:max-w-[1120px] mx-auto">
        <SiteHeader />
        <LuxHeader back="/market" eyebrow={hotel ? "HOTEL PARTNERS" : "SPA PARTNERS"} title={hotel ? "โรงแรมพาร์ทเนอร์" : "สปาพาร์ทเนอร์"} />
        <div className="px-[18px] pt-3.5 pb-6 flex flex-col gap-3">
          <div className={HROW} role="group" aria-label="กรองตามจังหวัด">
            {provs.map((p) => <button key={p} type="button" onClick={() => setProv(p)} aria-pressed={prov === p} className={CHIP} style={chipStyle(prov === p)}>{p}</button>)}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12.5px] text-[#d9c9b4]">{list.length} {hotel ? "โรงแรม" : "สปา"} · {prov === "ทั้งหมด" ? "ทุกจังหวัด" : prov}</span>
            <button type="button" onClick={() => setSort(sort === "rec" ? "price" : "rec")} className="min-h-10 px-3 rounded-full bg-[#211a18] text-[#e8c472] text-[12px] font-semibold" style={{ border: `1px solid ${BD}` }}>
              เรียง: {sort === "rec" ? "แนะนำ" : "ราคาต่ำ → สูง"}
            </button>
          </div>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
          {list.map((h) => (
            <Link key={h.id} href={`${base}/${h.id}`} className="lux-card block no-underline text-[#f3ead9] rounded-2xl overflow-hidden bg-[#211a18]" style={{ border: `1px solid ${BD}` }}>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.img} alt={h.name} className="w-full h-40 object-cover block" />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(14,10,10,.8)]"><Badge /></span>
              </div>
              <div className="p-3">
                <div className="font-lux font-semibold text-[16px]">{h.name}</div>
                <div className="text-[12.5px] text-[#d9c9b4]">{h.province} · {h.area}</div>
                <div className="flex justify-between items-baseline gap-2 mt-1.5 text-[12.5px]">
                  <span className="text-[#d9c9b4]">{h.tags}</span>
                  <span className="font-lux font-semibold text-[#e8c472] text-[14px] shrink-0">{h.price != null ? `เริ่ม ${fmt(h.price)}${hotel ? "/คืน" : ""}` : "ราคา [รอกำหนด]"}</span>
                </div>
              </div>
            </Link>
          ))}
          </div>
          {!list.length && (
            <div className="p-3.5 rounded-2xl bg-[#211a18] text-center text-[#d9c9b4] text-[13px] leading-[1.7]" style={{ border: `1px solid ${BD}` }}>
              ยังไม่มี{hotel ? "โรงแรม" : "สปา"}พาร์ทเนอร์ใน{prov}<br />เปิดรับพาร์ทเนอร์ [รอกำหนด] · <Link href="/partner" className="text-[#e8c472]">สมัครเป็นพาร์ทเนอร์</Link>
            </div>
          )}
          <div className="text-[11.5px] text-[#b5a596] leading-[1.6]">
            {items.some((i) => i.sample) ? "ข้อมูลและราคาเป็นตัวอย่าง รอรายชื่อพาร์ทเนอร์จริง · " : ""}ราคาจริงและส่วนลดสมาชิก [รอกำหนด]
          </div>
        </div>
      </div>
    </main>
  );
}

/* ───────── Detail ───────── */
const TH_DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const TH_MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function VenueDetailView({ v }: { v: VenueFull }) {
  const router = useRouter();
  const hotel = v.type === "โรงแรม";
  const noun = hotel ? "โรงแรม" : "สปา";
  // ราคาห้องค้างคืนแสดง "/คืน" ตามบอร์ด — ห้องรายชั่วโมงไม่ต่อท้าย
  const unitOf = (s: { desc: string }) => (hotel && s.desc === "ค้างคืน" ? " /คืน" : "");
  const [g, setG] = useState(0);
  const [fav, setFav] = useState(false);
  const [svc, setSvc] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>(["วันนี้", "พรุ่งนี้"]);
  const [toast, flash] = useToast();
  const G = v.gallery;
  const sv = v.services[svc];

  useEffect(() => {
    try { setFav(JSON.parse(localStorage.getItem("mb_fav_venues") ?? "[]").includes(v.id)); } catch {}
    const d = new Date();
    const extra = [2, 3].map((n) => { const x = new Date(d); x.setDate(d.getDate() + n); return `${TH_DAY[x.getDay()]} ${x.getDate()} ${TH_MON[x.getMonth()]}`; });
    setDates(["วันนี้", "พรุ่งนี้", ...extra]);
  }, [v.id]);

  const toggleFav = () => {
    const on = !fav; setFav(on);
    try { const s = new Set<string>(JSON.parse(localStorage.getItem("mb_fav_venues") ?? "[]")); if (on) s.add(v.id); else s.delete(v.id); localStorage.setItem("mb_fav_venues", JSON.stringify([...s])); } catch {}
    flash(on ? `บันทึก${noun}นี้แล้ว` : "นำออกจากที่บันทึกแล้ว");
  };
  const meet = () => { savePlace({ kind: hotel ? "hotel" : "spa", id: v.id, name: v.name, area: v.area }); router.push(`/home?place=${encodeURIComponent(v.id)}`); };
  const canReq = !!date && !!(v.line || v.tel);
  // ยังไม่มีระบบจองในแพลตฟอร์ม → ส่งคำขอผ่าน LINE ของสถานที่ (หรือโทร)
  const sendReq = () => {
    if (!date) return;
    if (v.line) window.open(v.line, "_blank", "noopener");
    else if (v.tel) window.location.href = `tel:${v.tel}`;
    else return flash(`ช่องทางจองของ${noun}นี้ [รอกำหนด]`);
    setSheet(false);
  };

  return (
    <main className="min-h-dvh bg-[#171211] text-[#f3ead9] mb-v7 mb-c">
      <div className="max-w-[480px] md:max-w-[760px] mx-auto pb-[92px]">
        <SiteHeader />
        <div className="relative h-[270px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={G[g]} alt={`${v.name} ภาพที่ ${g + 1}`} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,10,10,.45), rgba(14,10,10,0) 35%, rgba(14,10,10,.7))" }} />
          <div className="absolute top-4 left-[18px] right-[18px] flex justify-between">
            <Back href={hotel ? "/hotels" : "/spas"} glass />
            <button type="button" onClick={toggleFav} aria-pressed={fav} aria-label="บันทึกไว้" className="w-11 h-11 rounded-full text-[18px]" style={{ border: "1px solid rgba(246,239,228,.3)", background: "rgba(0,0,0,.45)", color: fav ? "#ff6b7d" : "#f3ead9" }}>{fav ? "♥" : "♡"}</button>
          </div>
          {G.length > 1 && <>
            <button type="button" onClick={() => setG((g + G.length - 1) % G.length)} aria-label="ภาพก่อนหน้า" className="absolute left-2.5 top-[112px] w-11 h-11 rounded-full bg-[rgba(0,0,0,.45)] text-white text-[18px]">‹</button>
            <button type="button" onClick={() => setG((g + 1) % G.length)} aria-label="ภาพถัดไป" className="absolute right-2.5 top-[112px] w-11 h-11 rounded-full bg-[rgba(0,0,0,.45)] text-white text-[18px]">›</button>
          </>}
          <span className="absolute right-3.5 bottom-3 px-[9px] py-[3px] rounded-full bg-[rgba(0,0,0,.6)] text-[11.5px]">{g + 1}/{G.length}</span>
        </div>
        {G.length > 1 && (
          <div className={`${HROW} px-[18px] pt-2.5`}>
            {G.map((img, i) => (
              <button key={img + i} type="button" onClick={() => setG(i)} aria-label={`ดูภาพที่ ${i + 1}`} className="w-[72px] h-[52px] shrink-0 p-0 rounded-[10px] overflow-hidden bg-[#211a18]" style={{ border: `2px solid ${i === g ? "#e8c472" : BD}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover block" style={{ opacity: i === g ? 1 : 0.6 }} />
              </button>
            ))}
          </div>
        )}
        <div className="px-[18px] pt-3 pb-5 flex flex-col gap-3">
          <div>
            <Badge />
            <h1 className="mt-2 mb-0.5 font-lux font-bold text-[24px]">{v.name}</h1>
            <div className="text-[12.5px] text-[#d9c9b4]">{v.province} · {v.area}</div>
          </div>
          <div className={HROW}>{v.facts.map((t) => <span key={t} className="shrink-0 px-2.5 py-1.5 rounded-[10px] bg-[#211a18] text-[11.5px] text-[#d9c9b4]" style={{ border: `1px solid ${BD}` }}>{t}</span>)}</div>
          {v.description && <p className="m-0 text-[13px] text-[#d9c9b4] leading-[1.7] whitespace-pre-line">{v.description}</p>}
          <div className="font-lux font-semibold text-[16px] mt-1">{hotel ? "ห้องพักและราคา" : "บริการและราคา"}</div>
          {v.services.length ? (
            <div role="radiogroup" aria-label={hotel ? "ห้องพักและราคา" : "บริการและราคา"} className="flex flex-col gap-2">
              {v.services.map((s, i) => {
                const on = i === svc;
                return (
                  <button key={s.name + i} type="button" role="radio" aria-checked={on} onClick={() => setSvc(i)} className="flex items-center gap-2.5 p-3 rounded-[14px] text-[#f3ead9] text-left min-h-14" style={{ border: `1px solid ${on ? "#e8c472" : BD}`, background: on ? "rgba(176,24,44,.14)" : "#211a18" }}>
                    <span className="shrink-0 w-5 h-5 rounded-full box-border" style={{ border: `2px solid ${on ? "#e8c472" : "#5a4a3a"}`, background: on ? "#e8c472" : "transparent" }} />
                    <span className="flex-1 min-w-0"><span className="block font-semibold text-[14px]">{s.name}</span><span className="block text-[12px] text-[#d9c9b4]">{s.desc}</span></span>
                    <span className="text-right">
                      {s.price < s.base && <span className="block text-[11px] text-[#b5a596] line-through">{fmt(s.base)}</span>}
                      <span className="font-lux font-semibold text-[#e8c472]">{fmt(s.price)}{unitOf(s)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : <div className="text-[13px] text-[#d9c9b4]">ราคา [รอกำหนด] — สอบถาม{noun}โดยตรง</div>}
          <div className="text-[11.5px] text-[#b5a596]">{v.sample ? "ราคาตัวอย่าง · " : ""}ราคาสมาชิก Mister Bamrungsuk [รอกำหนด]</div>
          <div className="p-3.5 rounded-2xl bg-[#211a18] flex flex-col gap-2.5" style={{ border: `1px solid ${BD}` }}>
            <div className="h-[110px] rounded-xl overflow-hidden bg-[#21191a]">
              <svg width="100%" height="110" viewBox="0 0 320 110" preserveAspectRatio="xMidYMid slice" aria-label="แผนที่ตำแหน่ง"><rect width="320" height="110" fill="#1d1717" /><path d="M0 70 C80 50 140 95 220 62 S300 40 320 48" stroke="#2c3a4a" strokeWidth="18" fill="none" /><path d="M40 0v110M150 0v110M260 0v110M0 30h320M0 90h320" stroke="#2a2224" strokeWidth="5" /><circle cx="160" cy="52" r="14" fill="#b0182c" opacity=".3" /><path d="M160 34c-7 0-12 5-12 12 0 9 12 20 12 20s12-11 12-20c0-7-5-12-12-12z" fill="#c21d33" stroke="#e8c472" /><circle cx="160" cy="46" r="4" fill="#fff" /></svg>
            </div>
            <div className="text-[12.5px] text-[#d9c9b4]">{v.area} · {v.province} · ที่อยู่เต็ม [รอกำหนด]</div>
            <a href={v.map} target="_blank" rel="noreferrer" className="min-h-11 rounded-xl bg-[#21191a] text-[#e8c472] font-semibold grid place-items-center no-underline" style={{ border: `1px solid ${BD}` }}>เปิดใน Google Maps ↗</a>
          </div>
          <div className="text-[12px] text-[#b5a596] leading-[1.6]">อยากหาเพื่อนไปด้วย? กด &quot;นัดเพื่อนที่นี่&quot; เพื่อเลือก Part-Time และตั้งสถานที่นัดเป็น{noun}นี้</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] px-[18px] pt-3 pb-[22px] bg-[#171211] flex gap-2.5 z-20" style={{ borderTop: `1px solid ${BD}` }}>
        <button type="button" onClick={() => setSheet(true)} className="basis-[132px] shrink-0 h-[52px] rounded-[14px] bg-[#211a18] text-[#e8c472] font-lux font-semibold text-[15px]" style={{ border: "1px solid #e8c472" }}>ติดต่อ/จอง</button>
        <button type="button" onClick={meet} className="btn-red-lux flex-1 h-[52px] rounded-[14px] font-lux font-semibold text-white text-[15px]">นัดเพื่อนที่นี่</button>
      </div>

      {sheet && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.6)] z-40" onClick={() => setSheet(false)}>
          <div role="dialog" aria-label="ติดต่อหรือจอง" onClick={(e) => e.stopPropagation()} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] px-[18px] pt-[18px] pb-6 rounded-t-[22px] bg-[#211a18] flex flex-col gap-2.5" style={{ borderTop: `1px solid ${BD}` }}>
            <div className="flex justify-between items-center gap-2">
              <div className="font-lux font-semibold text-[17px] min-w-0">ติดต่อ/จอง · {v.name}</div>
              <button type="button" onClick={() => setSheet(false)} aria-label="ปิด" className="w-11 h-11 shrink-0 rounded-full bg-[#21191a] text-[#f3ead9]" style={{ border: `1px solid ${BD}` }}>✕</button>
            </div>
            {sv && <div className="text-[12.5px] text-[#d9c9b4]">เลือก: <span className="text-[#f3ead9]">{sv.name}</span> · {fmt(sv.price)}{unitOf(sv)}</div>}
            <div className="flex flex-col gap-[5px] text-[12px] text-[#d9c9b4]">วันที่ต้องการ
              <div className={HROW} role="group" aria-label="เลือกวันที่">{dates.map((d) => <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={date === d} className={CHIP} style={chipStyle(date === d)}>{d}</button>)}</div>
            </div>
            <button type="button" onClick={sendReq} className="btn-red-lux h-[52px] rounded-[14px] font-lux font-semibold text-white text-[15px] w-full" style={{ opacity: canReq ? 1 : 0.45 }}>
              {date ? `ส่งคำขอจอง · ${date}` : "เลือกวันที่ก่อน"}
            </button>
            <div className="flex gap-2">
              {v.line ? <a href={v.line} target="_blank" rel="noreferrer" className="flex-1 h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center no-underline" style={{ border: `1px solid ${BD}` }}>LINE</a>
                : <span className="flex-1 h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center opacity-60" style={{ border: `1px solid ${BD}` }}>LINE [รอกำหนด]</span>}
              {v.tel ? <a href={`tel:${v.tel}`} className="flex-1 h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center no-underline" style={{ border: `1px solid ${BD}` }}>โทร {v.telLabel}</a>
                : <span className="flex-1 h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center opacity-60" style={{ border: `1px solid ${BD}` }}>โทร [รอกำหนด]</span>}
            </div>
            <div className="text-[11.5px] text-[#b5a596]">{noun}ยืนยันการจองและรับชำระเอง · Mister Bamrungsuk ไม่เก็บเงินในขั้นตอนนี้ [รอกำหนด]</div>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </main>
  );
}
