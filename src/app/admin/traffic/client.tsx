"use client";

import Link from "next/link";
import { useState } from "react";
import type { TrafficSummary } from "@/lib/traffic";
import { csvCell } from "@/lib/csv";

const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.28)";
const CARD = "rounded-2xl border bg-[#1c1414]";
const n = (x: number) => x.toLocaleString("th-TH");
const dur = (ms: number) => { const s = Math.round(ms / 1000); if (s < 60) return `${s} วิ`; const m = Math.floor(s / 60), r = s % 60; return m < 60 ? `${m} นาที${r ? ` ${r} วิ` : ""}` : `${Math.floor(m / 60)} ชม. ${m % 60} นาที`; };
const dt = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const dshort = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const PAGE: Record<string, string> = { "/": "หน้าแรก", "/join": "รับสมัคร (หนุ่มหล่อ)", "/join/tom": "รับสมัคร (ทอมหล่อ)", "/join/pay": "หน้าจ่ายค่าสมัคร", "/map": "แผนที่", "/sales": "Recruit", "/join/me": "เข้าสู่ระบบ Part-Time", "/soon": "เร็ว ๆ นี้", "/partner": "พาร์ทเนอร์", "/market": "ร้านค้า" };
const pageName = (p: string) => PAGE[p] ?? (p.startsWith("/p/") ? "โปรไฟล์ Part-Time" : p.startsWith("/join/i/") ? "ลิงก์เชิญ" : p.startsWith("/join/profile/") ? "โปรไฟล์ของ Part-Time (หลังบ้าน PT)" : p.startsWith("/join/s/") ? "ลิงก์ชวนของ Recruit" : p);
const DEV: Record<string, string> = { mobile: "มือถือ", desktop: "คอมพิวเตอร์", tablet: "แท็บเล็ต" };
const PALETTE = ["#f0c75a", "#2f7a46", "#2563a8", "#c0577e", "#5b3fb0", "#ffb07a", "#8a7b75"];

function Bars({ rows, fmt = n, color = GOLD, label = (k: string) => k }: { rows: [string, number][]; fmt?: (x: number) => string; color?: string; label?: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="m-0 text-[13px] text-[#9a8a85]">ยังไม่มีข้อมูล</p>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1">
          <div className="flex justify-between gap-3 text-[13px]"><span className="truncate" title={k}>{label(k)}</span><b className="tabular-nums shrink-0">{fmt(v)}</b></div>
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,.06)]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (v / max) * 100)}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

export function TrafficBoard({ s, days, ready }: { s: TrafficSummary; days: number; ready: boolean }) {
  const [tab, setTab] = useState<"pages" | "who" | "recent">("pages");
  const maxDay = Math.max(1, ...s.daily.map((d) => d.views));
  const maxHour = Math.max(1, ...s.hours);
  const peak = s.hours.indexOf(Math.max(...s.hours));
  const bestSrc = s.sources[0]?.[0];
  const longest = [...s.pages].filter((p) => p.views >= 3).sort((a, b) => b.avgMs - a.avgMs)[0];
  const devTotal = s.devices.reduce((t, [, v]) => t + v, 0) || 1;
  const mobilePct = Math.round(((s.devices.find(([k]) => k === "mobile")?.[1] ?? 0) / devTotal) * 100);
  const audience = s.who.filter((w) => w.mk && w.type === "customer");
  const exportAudience = () => {
    const head = ["อีเมล", "ประเภท", "จำนวนครั้งที่เข้า", "หน้าที่ดู", "เวลารวม (วินาที)", "เข้าล่าสุด"];
    const body = audience.map((w) => [w.label, "ลูกค้า", String(w.sessions), w.pages.join(" "), String(Math.round(w.ms / 1000)), dt(w.last)].map((v) => csvCell(v)).join(","));
    const blob = new Blob(["﻿" + [head.map((v) => csvCell(v)).join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `audience-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  const kpi: [string, string, string][] = [
    ["ผู้เข้าชม", n(s.visitors), `${n(s.sessions)} รอบการเข้าชม`],
    ["เปิดหน้าทั้งหมด", n(s.views), `${s.pagesPerSession} หน้า / รอบ`],
    ["เวลาเฉลี่ยต่อรอบ", dur(s.avgSession), "นับเฉพาะตอนเปิดหน้าอยู่"],
    ["ดูหน้าเดียวแล้วออก", `${s.bounce}%`, "ยิ่งต่ำยิ่งดี"],
    ["เข้าจากมือถือ", `${mobilePct}%`, "ของรอบการเข้าชม"],
    ["ผู้ใช้ที่ระบุตัวได้", n(s.known), "ล็อกอิน + ยินยอมคุกกี้"],
  ];
  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      <div className="flex flex-wrap items-center gap-2">
        {([1, 7, 30, 90] as const).map((d) => (
          <Link key={d} href={`/admin/traffic?d=${d}`} data-range={d} className="h-9 px-4 rounded-full border text-[12.5px] font-semibold grid place-items-center" style={d === days ? { background: GOLD, borderColor: GOLD, color: "#1a1206" } : { borderColor: LINE, color: "#5c4f48" }}>{d === 1 ? "24 ชม." : `${d} วัน`}</Link>
        ))}
        <span className="ml-auto text-[12px] text-[#9a8a85]">ข้อมูลสดจากเว็บ · โหลดหน้าใหม่เพื่ออัปเดต</span>
      </div>

      {!ready && <p className="m-0 rounded-xl border border-[rgba(255,155,122,.5)] px-4 py-3 text-[13px] text-[#ffb59c]">ยังไม่ได้สร้างตารางเก็บสถิติ · รัน SQL <code>supabase/site/0003_site_events.sql</code> ใน Supabase ก่อน แล้วระบบจะเริ่มนับทันที</p>}

      <div data-traffic-kpi className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {kpi.map(([k, v, sub], i) => (
          <div key={k} className={`${CARD} px-4 py-3.5`} style={{ borderColor: LINE, background: i === 0 ? "linear-gradient(150deg, rgba(240,200,90,.16), #1c1414 70%)" : undefined }}>
            <div className="text-[12px] text-[#cdbfb3]">{k}</div>
            <div className="font-lux font-bold text-[26px] leading-tight" style={{ color: i === 0 ? "#ffd76a" : "#2a1d1a" }}>{v}</div>
            <div className="text-[11.5px] text-[#9a8a85]">{sub}</div>
          </div>
        ))}
      </div>

      {/* ข้อแนะนำสำหรับยิงโฆษณา (สรุปจากข้อมูลจริงในช่วงนี้) */}
      {s.views > 0 && (
        <div data-ad-insights className={`${CARD} px-4 py-3.5 flex flex-col gap-1.5`} style={{ borderColor: "rgba(127,214,163,.45)", background: "linear-gradient(150deg, rgba(127,214,163,.10), #1c1414 70%)" }}>
          <b className="text-[14.5px] text-[#7fd6a3]">ข้อแนะนำสำหรับยิงโฆษณา</b>
          <ul className="m-0 pl-5 flex flex-col gap-1 text-[13px] text-[#e7ddd4]">
            <li>คนเข้าเว็บมากที่สุดช่วง <b>{String(peak).padStart(2, "0")}:00–{String((peak + 1) % 24).padStart(2, "0")}:00 น.</b> · ตั้งเวลาโฆษณาให้ครอบช่วงนี้</li>
            {bestSrc && <li>ช่องทางที่พาคนมามากที่สุด: <b>{bestSrc}</b> ({n(s.sources[0][1])} รอบ)</li>}
            <li>เข้าจากมือถือ <b>{mobilePct}%</b> · {mobilePct >= 60 ? "ทำภาพ/วิดีโอโฆษณาแนวตั้ง (9:16) เป็นหลัก" : "ใช้ทั้งภาพแนวตั้งและแนวนอน"}</li>
            {longest && <li>หน้าที่คนอยู่นานที่สุด: <b>{pageName(longest.path)}</b> (เฉลี่ย {dur(longest.avgMs)}) · ใช้เป็นหน้าปลายทางของโฆษณาได้</li>}
            <li>ติด <code className="text-[#f0c75a]">?utm_source=facebook&amp;utm_campaign=ชื่อแคมเปญ</code> ท้ายลิงก์โฆษณา เพื่อดูผลแยกแคมเปญในหน้านี้</li>
          </ul>
        </div>
      )}

      {/* รายวัน */}
      <div className={`${CARD} p-4 flex flex-col gap-3`} style={{ borderColor: LINE }}>
        <div className="flex flex-wrap items-center gap-3"><b className="text-[15px]">ผู้เข้าชมรายวัน</b>
          <span className="flex items-center gap-1.5 text-[12px] text-[#cdbfb3]"><span className="w-3 h-3 rounded-sm" style={{ background: "rgba(240,200,90,.35)" }} />เปิดหน้า</span>
          <span className="flex items-center gap-1.5 text-[12px] text-[#cdbfb3]"><span className="w-3 h-3 rounded-sm" style={{ background: GOLD }} />ผู้เข้าชม</span></div>
        <div data-daily className="flex items-end gap-1 h-[180px]">
          {s.daily.map((d) => (
            <div key={d.day} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1 group" title={`${dshort(d.day)} · ผู้เข้าชม ${d.visitors} · เปิดหน้า ${d.views}`}>
              <div className="relative w-full flex-1 flex items-end justify-center">
                <div className="w-full max-w-[34px] rounded-t-md" style={{ height: `${(d.views / maxDay) * 100}%`, background: "rgba(240,200,90,.28)" }} />
                <div className="absolute bottom-0 w-[55%] max-w-[18px] rounded-t-md" style={{ height: `${(d.visitors / maxDay) * 100}%`, background: GOLD }} />
              </div>
              {(s.daily.length <= 14 || s.daily.indexOf(d) % Math.ceil(s.daily.length / 10) === 0) && <span className="text-[10.5px] text-[#9a8a85] whitespace-nowrap">{days === 1 ? "วันนี้" : dshort(d.day)}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${CARD} p-4 flex flex-col gap-3`} style={{ borderColor: LINE }}>
          <b className="text-[15px]">มาจากไหน</b>
          <Bars rows={s.sources} />
          {!!s.campaigns.length && <><b className="text-[13.5px] mt-1 text-[#cdbfb3]">แคมเปญ (utm_campaign)</b><Bars rows={s.campaigns} color="#2f7a46" /></>}
        </div>
        <div className={`${CARD} p-4 flex flex-col gap-3`} style={{ borderColor: LINE }}>
          <b className="text-[15px]">อุปกรณ์</b>
          <div className="flex h-3 rounded-full overflow-hidden">{s.devices.map(([k, v], i) => <div key={k} style={{ width: `${(v / devTotal) * 100}%`, background: PALETTE[i] }} title={`${DEV[k] ?? k} ${v}`} />)}</div>
          <div className="flex flex-wrap gap-3 text-[12.5px]">{s.devices.map(([k, v], i) => <span key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i] }} />{DEV[k] ?? k} {Math.round((v / devTotal) * 100)}%</span>)}</div>
          <b className="text-[15px] mt-2">จังหวัด / เมือง</b>
          <Bars rows={s.cities} color="#2563a8" />
        </div>
        <div className={`${CARD} p-4 flex flex-col gap-3`} style={{ borderColor: LINE }}>
          <b className="text-[15px]">ช่วงเวลาที่คนเข้า (เวลาไทย)</b>
          <div data-hours className="grid grid-cols-12 gap-1">
            {s.hours.map((v, h) => <div key={h} className="aspect-square rounded-md grid place-items-center text-[10px]" title={`${h}:00 · ${v} ครั้ง`} style={{ background: v ? `rgba(240,200,90,${0.12 + (v / maxHour) * 0.88})` : "rgba(255,255,255,.04)", color: v / maxHour > 0.55 ? "#1a1206" : "#8a7b75" }}>{h}</div>)}
          </div>
          <b className="text-[15px] mt-2">หน้าแรกที่คนเข้ามา (Landing)</b>
          <Bars rows={s.landing} label={pageName} color="#c0577e" />
        </div>
      </div>

      <div className={`${CARD} p-4 flex flex-col gap-3`} style={{ borderColor: LINE }}>
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {([["pages", "หน้าที่ดู"], ["who", `ผู้ใช้ที่ระบุตัวได้ (${s.who.length})`], ["recent", "การเข้าชมล่าสุด"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-traffic-tab={k} onClick={() => setTab(k)} className="h-9 px-4 rounded-full border text-[12.5px] font-semibold" style={tab === k ? { background: GOLD, borderColor: GOLD, color: "#1a1206" } : { borderColor: LINE, color: "#5c4f48" }}>{l}</button>
          ))}
          {tab === "who" && <button type="button" data-export-audience disabled={!audience.length} onClick={exportAudience} className="ml-auto h-9 px-4 rounded-full border text-[12.5px] font-semibold disabled:opacity-40" style={{ borderColor: "#2f7a46", color: "#2f7a46" }}>ส่งออกรายชื่อทำโฆษณา ({audience.length})</button>}
        </div>

        {tab === "pages" && (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-[13px]">
            <thead><tr className="text-left text-[12px] text-[#9a8a85]"><th className="font-normal py-1.5">หน้า</th><th className="font-normal text-right">เปิดหน้า</th><th className="font-normal text-right">ผู้เข้าชม</th><th className="font-normal text-right">อยู่นานเฉลี่ย</th></tr></thead>
            <tbody>{s.pages.map((p) => (
              <tr key={p.path} className="border-t" style={{ borderColor: "rgba(240,200,90,.12)" }}>
                <td className="py-2"><div className="font-medium">{pageName(p.path)}</div><div className="text-[11.5px] text-[#9a8a85] truncate max-w-[360px]">{p.path}</div></td>
                <td className="text-right tabular-nums">{n(p.views)}</td><td className="text-right tabular-nums">{n(p.visitors)}</td><td className="text-right tabular-nums">{p.avgMs ? dur(p.avgMs) : "—"}</td>
              </tr>))}
              {!s.pages.length && <tr><td colSpan={4} className="py-5 text-center text-[#9a8a85]">ยังไม่มีข้อมูลในช่วงนี้</td></tr>}
            </tbody></table></div>
        )}

        {tab === "who" && (
          <>
            <p className="m-0 text-[12px] text-[#9a8a85]">แสดงเฉพาะคนที่ล็อกอินและกดยินยอมคุกกี้วิเคราะห์ · ส่งออกรายชื่อได้เฉพาะลูกค้าที่ยินยอมคุกกี้การตลาด (PDPA) — ใช้ทำ Custom Audience ใน Facebook / Google Ads</p>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-[13px]">
              <thead><tr className="text-left text-[12px] text-[#9a8a85]"><th className="font-normal py-1.5">ผู้ใช้</th><th className="font-normal">ประเภท</th><th className="font-normal text-right">เข้า (รอบ)</th><th className="font-normal text-right">เวลารวม</th><th className="font-normal">หน้าที่ดูบ่อย</th><th className="font-normal">ล่าสุด</th></tr></thead>
              <tbody>{s.who.map((w) => (
                <tr key={w.id} data-who-row className="border-t" style={{ borderColor: "rgba(240,200,90,.12)" }}>
                  <td className="py-2 font-medium break-all">{w.label}{w.mk && <span className="ml-1.5 rounded-full px-1.5 text-[10.5px] text-[#7fd6a3]" style={{ background: "rgba(127,214,163,.14)" }}>การตลาด ✓</span>}</td>
                  <td>{w.type === "customer" ? "ลูกค้า" : "Part-Time"}</td><td className="text-right tabular-nums">{w.sessions}</td><td className="text-right tabular-nums">{dur(w.ms)}</td>
                  <td className="text-[12px] text-[#cdbfb3]">{w.pages.map(pageName).join(" · ")}</td><td className="text-[12px] text-[#cdbfb3] whitespace-nowrap">{dt(w.last)}</td>
                </tr>))}
                {!s.who.length && <tr><td colSpan={6} className="py-5 text-center text-[#9a8a85]">ยังไม่มีผู้ใช้ที่ระบุตัวได้ในช่วงนี้</td></tr>}
              </tbody></table></div>
          </>
        )}

        {tab === "recent" && (
          <div className="flex flex-col">
            {s.recent.map((r) => (
              <div key={r.sid + r.at} className="flex flex-wrap items-start gap-x-3 gap-y-1 border-t py-2.5" style={{ borderColor: "rgba(240,200,90,.12)" }}>
                <span className="text-[12px] text-[#cdbfb3] w-[118px] shrink-0">{dt(r.at)}</span>
                <span className="text-[12px] w-[140px] shrink-0"><b className="text-[#f6efe4]">{r.who ?? "ไม่ระบุตัวตน"}</b><span className="block text-[#9a8a85]">{r.source} · {DEV[r.device ?? ""] ?? r.device ?? "-"}{r.city ? ` · ${r.city}` : ""}</span></span>
                <span className="flex-1 min-w-[220px] flex flex-wrap items-center gap-1 text-[12px]">{r.path.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-[#9a8a85]">›</span>}<span className="rounded-md px-1.5 py-0.5 bg-[rgba(255,255,255,.05)]">{pageName(p)}</span></span>)}</span>
                <span className="text-[12px] tabular-nums text-[#ffd76a] shrink-0">{dur(r.ms)}</span>
              </div>
            ))}
            {!s.recent.length && <p className="m-0 py-5 text-center text-[#9a8a85]">ยังไม่มีข้อมูลในช่วงนี้</p>}
          </div>
        )}
      </div>
    </div>
  );
}
