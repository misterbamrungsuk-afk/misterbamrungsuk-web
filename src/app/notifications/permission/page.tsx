"use client";

// บอร์ด C-NotifPermission "การแจ้งเตือน" — ขอสิทธิ์แจ้งเตือน + เลือกหัวข้อ 4 อย่าง · ตอบแล้ว → ไปหน้าหลัก / เปลี่ยนการตั้งค่า
import { useEffect, useState } from "react";
import Link from "next/link";
import { enablePush } from "@/lib/push-client";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const PREFS: [string, string, string][] = [["status", "สถานะนัด", "ยืนยันนัด / กำลังเดินทาง / ถึงแล้ว"], ["chat", "ข้อความแชท", "จากเพื่อนและทีมงาน"], ["safety", "ความปลอดภัย", "SOS และเรื่องสำคัญที่ต้องรู้"], ["promo", "โปรโมชัน", "สิทธิพิเศษสมาชิก"]];
const KEY = "mb_notify_prefs";
const T = {
  ask: ["ไม่พลาดทุกนัดสำคัญ", "รู้ทันทีเมื่อเพื่อนยืนยันนัด กำลังออกเดินทาง หรือส่งข้อความหาคุณ"],
  allow: ["เปิดการแจ้งเตือนแล้ว", "เราจะแจ้งเฉพาะเรื่องที่คุณเลือกไว้ด้านล่าง"],
  deny: ["ปิดการแจ้งเตือนไว้", "คุณเปิดได้ภายหลังที่ บัญชี > การแจ้งเตือน แต่อาจพลาดความคืบหน้าของนัดไปบ้าง"],
} as const;

export default function NotifyPermissionPage() {
  const [perm, setPerm] = useState<"ask" | "allow" | "deny">("ask");
  const [pr, setPr] = useState<Record<string, boolean>>({ status: true, chat: true, safety: true, promo: false });
  const [note, setNote] = useState("");

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v) setPr(v); } catch {}
    if (typeof Notification !== "undefined") { if (Notification.permission === "granted") setPerm("allow"); else if (Notification.permission === "denied") setPerm("deny"); }
  }, []);
  const save = (v: Record<string, boolean>) => { setPr(v); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const allow = async () => {
    if (typeof Notification === "undefined") { setNote("อุปกรณ์นี้ไม่รองรับการแจ้งเตือน · บน iPhone ให้เพิ่มเว็บไว้ที่หน้าจอโฮมก่อน"); setPerm("deny"); return; }
    const r = await enablePush();
    if (r === "unsupported") { setNote("บน iPhone ให้กดแชร์ → เพิ่มไปยังหน้าจอโฮม แล้วเปิดจากไอคอนก่อน จึงรับแจ้งเตือนได้"); setPerm("deny"); return; }
    setPerm(r === "denied" ? "deny" : "allow");
    if (r === "denied") setNote("เบราว์เซอร์ปิดไว้ · เปิดได้ในการตั้งค่าเบราว์เซอร์");
    else if (r === "error") setNote("ยังผูกอุปกรณ์ไม่สำเร็จ · ระหว่างนี้ดูแจ้งเตือนได้ในแอป (ต้องเข้าสู่ระบบก่อน)");
  };
  const off = perm === "deny";

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <main className="mx-auto w-full max-w-[480px] md:max-w-[520px] md:pt-8 flex flex-col gap-[14px]" style={{ padding: "12px 18px 24px" }}>
        <div className="flex justify-between items-center"><Link href="/" className="text-[13px] min-h-11 flex items-center font-light text-[#e8c472]">ข้าม</Link></div>
        <div className="flex flex-col items-center text-center gap-3" style={{ paddingTop: 24 }}>
          <div className="w-[120px] h-[120px] rounded-full grid place-items-center" style={{ background: "radial-gradient(circle,#2a1d12,#171211 70%)", border: "1px solid rgba(232,196,114,0.55)", color: GOLD }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          </div>
          <h1 className="m-0 font-semibold text-[24px]" style={{ color: GOLD }}>{T[perm][0]}</h1>
          <p className="m-0 text-[14px] text-[#d9c9b4]">{T[perm][1]}</p>
          {note && <p className="m-0 text-[12px] font-light text-[#b5a596]">{note}</p>}
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-[#211a18]" style={{ padding: 14, border: `1px solid ${LN}` }}>
          {PREFS.map(([k, label, sub]) => {
            const on = pr[k] && !off;
            return (
              <button key={k} type="button" role="switch" aria-checked={on} disabled={off} onClick={() => save({ ...pr, [k]: !pr[k] })} className="flex items-center gap-3 min-h-[52px] text-left text-[#f3ead9]">
                <span className="flex-1 flex flex-col"><span className="text-[14px]">{label}</span><span className="text-[12px] text-[#d9c9b4] font-light">{sub}</span></span>
                <span className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: on ? GOLD : "rgba(232,196,114,0.14)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-[#f3ead9] transition-all" style={{ left: on ? 21 : 3 }} /></span>
              </button>
            );
          })}
        </div>
        {perm === "ask" ? (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={allow} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold">เปิดการแจ้งเตือน</button>
            <button type="button" onClick={() => setPerm("deny")} className="h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold" style={{ border: `1px solid ${LN}` }}>ไว้ทีหลัง</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href="/" className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center hover:text-[#1b130b]">ไปหน้าหลัก</Link>
            <button type="button" onClick={() => { setPerm("ask"); setNote(""); }} className="h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold" style={{ border: `1px solid ${LN}` }}>เปลี่ยนการตั้งค่า</button>
          </div>
        )}
      </main>
    </div>
  );
}
