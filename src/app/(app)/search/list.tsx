"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { priceOf, type Act, type Person } from "@/lib/home/people";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const LABEL: Record<Act, string> = { eat: "กิน & เที่ยว", massage: "นวดผ่อนคลาย", cafe: "คาเฟ่", photo: "ถ่ายรูป", movie: "ดูหนัง", gym: "ออกกำลัง", chill: "นั่งชิล" };
const SORT: [string, string][] = [["top", "แนะนำ"], ["rating", "คะแนนสูงสุด"], ["price", "ราคาต่ำสุด"]];
type F = { acts: Act[]; pmin: number; pmax: number; amin: number; amax: number; prov: string; r45: boolean; top: boolean };

// บอร์ด C-SearchList + C-Filter: ค้นจากชื่อ ย่าน กิจกรรม · ตัวกรอง กิจกรรม / ราคาต่อ 3 ชม. / อายุ / จังหวัด / ★4.5+ / TOP (จากข้อมูลจริงในโปรไฟล์)
export function SearchList({ people, sample, q0 }: { people: Person[]; sample: boolean; q0: string }) {
  const [q, setQ] = useState(q0);
  const [sort, setSort] = useState("top");
  const bounds = useMemo(() => {
    const ps = people.map(priceOf), as = people.map((p) => p.age).filter(Boolean);
    return { pmin: ps.length ? Math.min(...ps) : 0, pmax: ps.length ? Math.max(...ps) : 0, amin: as.length ? Math.min(...as) : 20, amax: as.length ? Math.max(...as) : 20 };
  }, [people]);
  const init: F = { acts: [], pmin: bounds.pmin, pmax: bounds.pmax, amin: bounds.amin, amax: bounds.amax, prov: "", r45: false, top: false };
  const [fl, setFl] = useState<F>(init);
  const [draft, setDraft] = useState<F>(init);
  const [open, setOpen] = useState(false);
  const provs = useMemo(() => [...new Set(people.map((p) => p.prov).filter(Boolean) as string[])].sort(), [people]);
  const pass = (p: Person, x: F) => (!x.acts.length || x.acts.some((a) => p.acts.includes(a))) && priceOf(p) >= x.pmin && priceOf(p) <= x.pmax
    && (!p.age || (p.age >= x.amin && p.age <= x.amax)) && (!x.prov || p.prov === x.prov) && (!x.r45 || (Number.parseFloat(p.rating) || 0) >= 4.5) && (!x.top || p.top);
  const active = fl.acts.length + (fl.pmin > bounds.pmin || fl.pmax < bounds.pmax ? 1 : 0) + (fl.amin > bounds.amin || fl.amax < bounds.amax ? 1 : 0) + (fl.prov ? 1 : 0) + (fl.r45 ? 1 : 0) + (fl.top ? 1 : 0);
  const t = q.trim().toLowerCase();
  const num = (s: string) => Number.parseFloat(s) || 0;
  const list = people.filter((p) => pass(p, fl) && (!t || [p.nick, p.area, p.prov ?? "", ...p.acts.map((a) => LABEL[a])].some((x) => x.toLowerCase().includes(t))))
    .sort((a, b) => sort === "rating" ? num(b.rating) - num(a.rating) : sort === "price" ? priceOf(a) - priceOf(b) : Number(b.top) - Number(a.top));
  const chip = (on: boolean) => ({ background: on ? "rgba(212,175,55,.12)" : "#251d1b", border: `1px solid ${on ? GOLD : LN}`, color: on ? GOLD : "#f3ead9" });

  return (
    <div className="pb-6">
      <div className="flex gap-2 items-center" style={{ padding: "16px 16px 10px" }}>
        <Link href="/" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center shrink-0 text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <label className="flex-1 min-w-0 h-11 rounded-[14px] bg-[#211a18] flex items-center gap-2 px-3" style={{ border: `1px solid ${LN}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9c9b4" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อ ย่าน กิจกรรม" aria-label="ค้นหา" className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[#f3ead9] placeholder:text-[#b5a596]" />
        </label>
        <button type="button" onClick={() => { setDraft(fl); setOpen(true); }} aria-label="ตัวกรอง" className="relative w-11 h-11 rounded-[14px] grid place-items-center shrink-0 text-[#f3ead9]" style={{ border: `1px solid ${active ? GOLD : LN}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          {active > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold grid place-items-center text-[#1b130b]" style={{ background: GOLD }}>{active}</span>}
        </button>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2" style={{ padding: "0 16px 8px" }}>
        <span className="text-[13px] font-light text-[#d9c9b4]">พบ {list.length} คน{sample ? " (ตัวอย่าง)" : ""}</span>
        <div className="flex gap-1">{SORT.map(([k, l]) => <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k} className="h-8 px-2.5 rounded-full text-[12px]" style={{ border: `1px solid ${sort === k ? GOLD : LN}`, color: sort === k ? GOLD : "#d9c9b4" }}>{l}</button>)}
          <Link href="/map" aria-label="แผนที่" className="w-10 h-8 rounded-full grid place-items-center text-[#d9c9b4] hover:text-[#d9c9b4]" style={{ border: `1px solid ${LN}` }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /></svg></Link>
        </div>
      </div>
      <div style={{ padding: "0 16px" }}>
        {!list.length && <p className="text-center text-[14px] text-[#d9c9b4]" style={{ padding: 28 }}>ไม่พบเพื่อนที่ตรงกับคำค้น{active ? "หรือตัวกรอง" : ""} · ลองปรับใหม่</p>}
        {list.map((p, i) => (
          <Link key={p.id} href={`/p/${p.id}`} className="flex gap-3 text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "12px 0", borderBottom: i < list.length - 1 ? `1px solid ${LN}` : "none" }}>
            <img src={p.img} alt={p.nick} className="w-[92px] h-[112px] rounded-[14px] object-cover shrink-0" style={{ objectPosition: p.pos }} />
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex justify-between gap-2"><b className="font-medium text-[17px]">{p.nick}{p.age ? `, ${p.age}` : ""} <span className="text-[12px] font-light" style={{ color: GOLD }}>✓</span></b><span className="text-[12px] font-light shrink-0" style={{ color: GOLD }}>★ {p.rating}</span></div>
              <div className="text-[13px] font-light text-[#d9c9b4]">{p.prov ? `${p.area} · ${p.prov}` : p.area}</div>
              <div className="flex gap-1 flex-wrap">{p.acts.slice(0, 3).map((a) => <span key={a} className="h-[22px] px-2 rounded-full text-[12px] text-[#d9c9b4] inline-flex items-center" style={{ border: `1px solid ${LN}` }}>{LABEL[a]}</span>)}</div>
              <div className="font-medium mt-auto" style={{ color: GOLD }}>฿{priceOf(p).toLocaleString("en-US")} / 3 ชม.</div>
            </div>
          </Link>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(5,5,6,.7)" }} onClick={() => setOpen(false)}>
          <section role="dialog" aria-label="ตัวกรอง" onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] max-h-[88dvh] overflow-y-auto rounded-t-[28px] bg-[#211a18] flex flex-col gap-[18px]" style={{ padding: "10px 20px 0", borderTop: `1px solid ${LN}` }}>
            <div className="w-10 h-1 rounded self-center" style={{ background: LN }} />
            <div className="flex justify-between items-center">
              <h2 className="m-0 font-semibold text-[22px]">ตัวกรอง</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="w-10 h-10 rounded-full bg-[#251d1b] grid place-items-center text-[#f3ead9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
            </div>
            <div>
              <div className="font-medium text-[16px]">กิจกรรม</div>
              <div className="flex flex-wrap gap-2 mt-2.5">{(Object.keys(LABEL) as Act[]).map((a) => { const on = draft.acts.includes(a); return <button key={a} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, acts: on ? draft.acts.filter((x) => x !== a) : [...draft.acts, a] })} className="h-[38px] px-[14px] rounded-full text-[13px] font-medium" style={chip(on)}>{LABEL[a]}</button>; })}</div>
            </div>
            {bounds.pmax > bounds.pmin && (
              <div>
                <div className="flex justify-between"><span className="font-medium text-[16px]">ราคาต่อ 3 ชม.</span><b className="font-medium" style={{ color: GOLD }}>฿{draft.pmin.toLocaleString("en-US")} – ฿{draft.pmax.toLocaleString("en-US")}</b></div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input type="range" aria-label="ราคาต่ำสุด" min={bounds.pmin} max={bounds.pmax} step={100} value={draft.pmin} onChange={(e) => setDraft({ ...draft, pmin: Math.min(Number(e.target.value), draft.pmax) })} className="accent-[#e8c472]" />
                  <input type="range" aria-label="ราคาสูงสุด" min={bounds.pmin} max={bounds.pmax} step={100} value={draft.pmax} onChange={(e) => setDraft({ ...draft, pmax: Math.max(Number(e.target.value), draft.pmin) })} className="accent-[#e8c472]" />
                </div>
              </div>
            )}
            {bounds.amax > bounds.amin && (
              <div>
                <div className="flex justify-between"><span className="font-medium text-[16px]">อายุ</span><b className="font-medium" style={{ color: GOLD }}>{draft.amin} – {draft.amax} ปี</b></div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input type="range" aria-label="อายุต่ำสุด" min={bounds.amin} max={bounds.amax} value={draft.amin} onChange={(e) => setDraft({ ...draft, amin: Math.min(Number(e.target.value), draft.amax) })} className="accent-[#e8c472]" />
                  <input type="range" aria-label="อายุสูงสุด" min={bounds.amin} max={bounds.amax} value={draft.amax} onChange={(e) => setDraft({ ...draft, amax: Math.max(Number(e.target.value), draft.amin) })} className="accent-[#e8c472]" />
                </div>
              </div>
            )}
            {provs.length > 1 && (
              <label className="flex flex-col gap-2"><span className="font-medium text-[16px]">จังหวัด</span>
                <select value={draft.prov} onChange={(e) => setDraft({ ...draft, prov: e.target.value })} className="h-[50px] rounded-[14px] bg-[#251d1b] px-[14px] text-[15px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><option value="">ทุกจังหวัด</option>{provs.map((p) => <option key={p}>{p}</option>)}</select>
              </label>
            )}
            <div>
              <div className="font-medium text-[16px]">อื่น ๆ</div>
              <div className="flex flex-wrap gap-2 mt-2.5">{([["r45", "★ 4.5+"], ["top", "ระดับ TOP"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={draft[k]} onClick={() => setDraft({ ...draft, [k]: !draft[k] })} className="h-[38px] px-[14px] rounded-full text-[13px] font-medium" style={chip(draft[k])}>{l}</button>)}</div>
            </div>
            <div className="sticky bottom-0 flex gap-2.5 bg-[#211a18]" style={{ padding: "16px 0 calc(26px + env(safe-area-inset-bottom))", borderTop: `1px solid ${LN}` }}>
              <button type="button" onClick={() => setDraft(init)} className="h-[54px] px-[22px] rounded-2xl font-semibold text-[15px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ล้างทั้งหมด</button>
              <button type="button" onClick={() => { setFl(draft); setOpen(false); }} className="flex-1 h-[54px] rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[16px]">แสดงผล {people.filter((p) => pass(p, draft)).length} คน</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
