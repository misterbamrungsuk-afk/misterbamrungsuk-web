"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";

// สถานที่ที่บันทึก (♡ ที่หน้าโรงแรม/สปา) — เก็บในเครื่องนี้ (localStorage mb_fav_venues) · ข้อมูลร้านจาก /api/market/partners
type V = { id: string; name: string; type: "โรงแรม" | "สปา"; label?: string; area: string; cover?: string };
const KEY = "mb_fav_venues";

export function SavedVenues() {
  const [list, setList] = useState<V[] | null>(null);
  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { ids = []; }
    if (!ids.length) { setList([]); return; }
    fetch("/api/market/partners", { cache: "no-store" }).then((r) => r.json()).then((d: { hotels?: V[]; spas?: V[] }) => {
      const all = [...(d.hotels ?? []), ...(d.spas ?? [])];
      setList(ids.map((id) => all.find((v) => v.id === id)).filter((v): v is V => !!v));
    }).catch(() => setList([]));
  }, []);
  const remove = (id: string) => {
    try { const s = new Set<string>(JSON.parse(localStorage.getItem(KEY) ?? "[]")); s.delete(id); localStorage.setItem(KEY, JSON.stringify([...s])); } catch {}
    setList((l) => (l ?? []).filter((v) => v.id !== id));
  };
  if (list == null || !list.length) return null;
  return (
    <section className="flex flex-col gap-2.5" style={{ padding: "20px 16px 0" }}>
      <h2 className="m-0 font-semibold text-[17px]">สถานที่ที่บันทึก</h2>
      <div className="grid gap-2.5 md:grid-cols-2">
        {list.map((v) => (
          <div key={v.id} className="flex gap-3 items-center rounded-2xl bg-[#211a18]" style={{ padding: 10, border: "1px solid rgba(232,196,114,.25)" }}>
            <Link href={`/${v.type === "โรงแรม" ? "hotels" : "spas"}/${v.id}`} className="flex gap-3 items-center flex-1 min-w-0 text-[#f3ead9] hover:text-[#f3ead9]">
              <img src={v.cover || (v.type === "โรงแรม" ? "/brand/hotel1.jpg" : "/brand/venue.jpg")} alt="" className="w-[58px] h-[58px] rounded-xl object-cover shrink-0" />
              <span className="min-w-0"><span className="block font-semibold text-[14px] truncate">{v.name}</span><span className="block text-[12px] text-[#d9c9b4] truncate">{v.label || v.type} · {v.area}</span></span>
            </Link>
            <button type="button" onClick={() => remove(v.id)} aria-label={`นำ ${v.name} ออกจากที่บันทึก`} className="w-11 h-11 shrink-0 rounded-full text-[18px] text-[#ff6b7d]" style={{ border: "1px solid rgba(232,196,114,.25)" }}>♥</button>
          </div>
        ))}
      </div>
    </section>
  );
}
