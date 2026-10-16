"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { priceOf, type Act, type Person } from "@/lib/home/people";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const LABEL: Record<Act, string> = { eat: "กิน & เที่ยว", massage: "นวดผ่อนคลาย", cafe: "คาเฟ่", photo: "ถ่ายรูป", movie: "ดูหนัง", gym: "ออกกำลัง", chill: "นั่งชิล" };
const SORT: [string, string][] = [["top", "แนะนำ"], ["rating", "คะแนนสูงสุด"], ["price", "ราคาต่ำสุด"]];

export function SearchList({ people, sample, q0 }: { people: Person[]; sample: boolean; q0: string }) {
  const [q, setQ] = useState(q0);
  const [sort, setSort] = useState("top");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = people.filter((p) => !t || [p.nick, p.area, p.prov ?? "", ...p.acts.map((a) => LABEL[a])].some((x) => x.toLowerCase().includes(t)));
    const num = (s: string) => Number.parseFloat(s) || 0;
    return [...r].sort((a, b) => sort === "rating" ? num(b.rating) - num(a.rating) : sort === "price" ? priceOf(a) - priceOf(b) : Number(b.top) - Number(a.top));
  }, [people, q, sort]);

  return (
    <div className="pb-6">
      <div className="flex gap-2 items-center" style={{ padding: "16px 16px 10px" }}>
        <Link href="/" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center shrink-0 text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <label className="flex-1 h-11 rounded-[14px] bg-[#211a18] flex items-center gap-2 px-3" style={{ border: `1px solid ${LN}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9c9b4" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อ ย่าน กิจกรรม" aria-label="ค้นหา" className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[#f3ead9] placeholder:text-[#b5a596]" />
        </label>
      </div>
      <div className="flex justify-between items-center gap-2" style={{ padding: "0 16px 8px" }}>
        <span className="text-[13px] font-light text-[#d9c9b4]">พบ {list.length} คน{sample ? " (ตัวอย่าง)" : ""}</span>
        <div className="flex gap-1">{SORT.map(([k, l]) => <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k} className="h-8 px-2.5 rounded-full text-[12px]" style={{ border: `1px solid ${sort === k ? GOLD : LN}`, color: sort === k ? GOLD : "#d9c9b4" }}>{l}</button>)}
          <Link href="/map" aria-label="แผนที่" className="w-10 h-8 rounded-full grid place-items-center text-[#d9c9b4] hover:text-[#d9c9b4]" style={{ border: `1px solid ${LN}` }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /></svg></Link>
        </div>
      </div>
      <div style={{ padding: "0 16px" }}>
        {!list.length && <p className="text-center text-[14px] text-[#d9c9b4]" style={{ padding: 28 }}>ไม่พบเพื่อนที่ตรงกับคำค้น · ลองคำอื่น</p>}
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
    </div>
  );
}
