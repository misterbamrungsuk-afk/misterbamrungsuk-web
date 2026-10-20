"use client";

import { useEffect, useState } from "react";
import PromptPayCard from "@/components/promptpay-qr";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";

// โปรโมทโปรไฟล์ — จ่ายแล้วขึ้นอันดับต้นหน้าแรก + ป้าย "แนะนำ" · จ่ายจากกระเป๋า หรือ QR พร้อมเพย์ + แนบสลิป
type Plan = { id: string; name: string; desc: string; days: number; price: number };
const GOLD = "#e8c472";
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const until = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

export function BoostPanel({ mb, t }: { mb: string; t?: string | null }) {
  const [info, setInfo] = useState<{ plans: Plan[]; until: string | null; pending: number; available: number; codes?: { code: string; days: number }[] } | null>(null);
  const [plan, setPlan] = useState("d3");
  const [qr, setQr] = useState(false);
  const [slip, setSlip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const qs = `mb=${encodeURIComponent(mb)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;
  const load = () => fetch(`/api/pt/boost?${qs}`, { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setInfo(d)).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const p = info?.plans.find((x) => x.id === plan);
  const enough = !!p && (info?.available ?? 0) >= p.price * 100;
  const done = (d: { ok?: boolean; status?: string; until?: string | null; error?: string } | null) => {
    setBusy(false);
    if (!d?.ok) return setMsg({ ok: false, text: d?.error || "ทำรายการไม่สำเร็จ" });
    setMsg({ ok: true, text: d.status === "active" ? `โปรโมทแล้ว · ขึ้นหน้าแนะนำถึง ${d.until ? until(d.until) : ""}` : "ส่งสลิปแล้ว · ทีมงานตรวจแล้วเปิดโปรโมทให้ (ภายใน 2 ชม. 09:00–22:00)" });
    setQr(false); setSlip(null); load();
  };
  const payWallet = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/pt/boost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, plan, pay: "wallet" }) }).catch(() => null);
    done((await r?.json().catch(() => null)) ?? null);
  };
  const useCode = async (code: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/pt/boost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, code }) }).catch(() => null);
    done((await r?.json().catch(() => null)) ?? null);
  };
  const paySlip = async () => {
    if (!slip) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append("mb", mb); if (t) fd.append("t", t); fd.append("plan", plan); fd.append("slip", slip);
    const r = await fetch("/api/pt/boost", { method: "POST", body: fd }).catch(() => null);
    done((await r?.json().catch(() => null)) ?? null);
  };

  return (
    <div className="flex flex-col gap-2 pt-1">
      {info?.until
        ? <div className="rounded-xl text-[13px] font-semibold text-[#1b130b]" style={{ padding: "8px 12px", background: GOLD }}>★ โปรโมทอยู่ · ขึ้นหน้าแนะนำถึง {until(info.until)} · ซื้อเพิ่มได้ ต่อเวลาให้อัตโนมัติ</div>
        : <div className="text-[13px] text-[#d9c9b4] font-light">จ่ายแล้วโปรไฟล์ขึ้นอันดับต้นในหน้าแรก พร้อมป้าย &quot;แนะนำ&quot; ตามจำนวนวัน</div>}
      {!!info?.pending && <div className="text-[12.5px] text-[#e8c472]">มีสลิปรอทีมงานตรวจ {info.pending} รายการ</div>}
      {(info?.codes ?? []).map((c) => (
        <div key={c.code} data-free-code={c.code} className="flex items-center gap-3 rounded-xl" style={{ padding: "10px 12px", background: "rgba(127,214,163,0.12)", boxShadow: "inset 0 0 0 1px rgba(127,214,163,.45)" }}>
          <span className="flex-1 min-w-0 leading-[1.4]"><b className="block text-[14px] text-[#7fd6a3]">โค้ดโปรโมทฟรี {c.days} วัน</b><span className="text-[12.5px] font-light text-[#d9c9b4] tracking-[1px]">{c.code}</span></span>
          <button type="button" disabled={busy} onClick={() => useCode(c.code)} className="shrink-0 min-h-11 px-4 rounded-xl text-[13.5px] font-semibold bg-[#7fd6a3] text-[#10261a] disabled:opacity-40">ใช้โค้ด</button>
        </div>
      ))}
      {(info?.plans ?? []).map((x) => {
        const on = plan === x.id;
        return (
          <button key={x.id} type="button" aria-pressed={on} onClick={() => setPlan(x.id)} className="min-h-[52px] rounded-xl flex items-center gap-[10px] text-left text-[#f3ead9]" style={{ padding: "8px 12px", background: on ? "rgba(232,196,114,0.18)" : "rgba(243,234,217,0.06)", boxShadow: on ? `inset 0 0 0 1.5px ${GOLD}` : "none" }}>
            <span className="shrink-0 w-5 h-5 rounded-full grid place-items-center" style={{ background: on ? GOLD : "rgba(243,234,217,0.12)" }}><span className="w-2 h-2 rounded-full" style={{ background: on ? "#1b130b" : "transparent" }} /></span>
            <span className="flex-1 min-w-0 flex flex-col leading-[1.35]"><span className="text-[14px] font-semibold">{x.name}</span><span className="text-[12.5px] text-[#d9c9b4] font-light">{x.desc}</span></span>
            <span className="text-[15px] font-semibold text-[#e8c472]">{baht(x.price)}</span>
          </button>
        );
      })}
      {p && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy || !enough} onClick={payWallet} className="min-h-[46px] rounded-xl text-[13.5px] font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-40">{enough ? `จ่ายจากกระเป๋า ${baht(p.price)}` : "ยอดในกระเป๋าไม่พอ"}</button>
          <button type="button" disabled={busy} onClick={() => setQr(!qr)} aria-expanded={qr} className="min-h-[46px] rounded-xl text-[13.5px] font-semibold text-[#f3ead9]" style={{ background: "rgba(243,234,217,0.1)" }}>{qr ? "ปิด QR" : "จ่ายด้วย QR พร้อมเพย์"}</button>
        </div>
      )}
      {qr && p && (
        <div className="flex flex-col gap-2 rounded-xl" style={{ padding: 12, background: "rgba(243,234,217,0.05)" }}>
          <PromptPayCard amount={p.price} />
          <label className="min-h-[46px] rounded-xl flex items-center justify-center text-[13.5px] text-[#e8c472] cursor-pointer" style={{ border: "1px dashed rgba(232,196,114,.6)" }}>
            {slip ? `แนบแล้ว: ${slip.name.slice(0, 28)}` : "แนบสลิปการโอน"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return setSlip(null); try { setSlip(await dataUrlToFile(await resizeImage(f, 1400, 0.85), f.name.replace(/\.[^.]+$/, "") + ".jpg")); } catch { setSlip(f); } }} />
          </label>
          <button type="button" disabled={busy || !slip} onClick={paySlip} className="min-h-[46px] rounded-xl text-[14px] font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-40">{busy ? "กำลังตรวจสลิป…" : `ส่งสลิป · โปรโมท ${p.days} วัน`}</button>
        </div>
      )}
      {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
    </div>
  );
}
