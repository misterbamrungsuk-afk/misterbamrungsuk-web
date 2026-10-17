"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PromptPayCard from "@/components/promptpay-qr";

// เปิดเมม: เลือกระดับ → สแกน QR พร้อมเพย์ตามยอด → แนบสลิป (+ โค้ดผู้แนะนำ) → Slip2Go ผ่าน = เข้ากระเป๋าทันที
type T = { id: "gold" | "black"; name: string; pay: number; credit: number };
const baht = (n: number) => "฿" + n.toLocaleString("th-TH");

export function JoinMember({ tiers, current, refCode, initial }: { tiers: Record<"gold" | "black", T>; current: "gold" | "black" | null; refCode: string | null; initial: "gold" | "black" }) {
  const router = useRouter();
  const [tier, setTier] = useState<"gold" | "black">(initial);
  const [slip, setSlip] = useState<File | null>(null);
  const [ref, setRef] = useState(refCode ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (!refCode) { const m = document.cookie.match(/(?:^|; )mb_ref=([A-Z0-9]+)/); if (m) setRef(m[1]); } }, [refCode]);
  const t = tiers[tier];
  const options = (["gold", "black"] as const).filter((k) => !current || (current === "gold" && k === "black"));
  const send = async () => {
    if (!slip) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append("tier", tier); fd.append("slip", slip); if (ref.trim()) fd.append("ref", ref.trim().toUpperCase());
    const r = await fetch("/api/membership", { method: "POST", body: fd }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok?: boolean; status?: string; error?: string } | null;
    setBusy(false);
    if (!j?.ok) return setMsg({ ok: false, text: j?.error || "ส่งไม่สำเร็จ" });
    setMsg({ ok: true, text: j.status === "credited" ? `ยินดีต้อนรับสู่ ${t.name} Member · ${baht(t.credit)} เข้ากระเป๋าแล้ว` : "ส่งสลิปแล้ว · ทีมงานตรวจภายใน 2 ชม. (09:00–22:00)" });
    router.refresh();
  };
  return (
    <section className="rounded-[18px] flex flex-col gap-3" style={{ padding: 16, background: "#211a18", border: "1px solid rgba(232,196,114,.35)" }}>
      <b className="text-[17px]">{current ? "อัปเกรดเป็น Black" : "เปิดเมมเลย"}</b>
      {options.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {options.map((k) => (
            <button key={k} type="button" aria-pressed={tier === k} onClick={() => setTier(k)} className="h-12 rounded-xl font-semibold" style={{ background: tier === k ? "#e8c472" : "rgba(243,234,217,.07)", color: tier === k ? "#1b130b" : "#f3ead9" }}>{tiers[k].name} · {baht(tiers[k].pay)}</button>
          ))}
        </div>
      )}
      <div className="text-[14px] text-[#d9c9b4]">โอน <b className="text-[#f3ead9]">{baht(t.pay)}</b> ได้เครดิต <b className="text-[#e8c472]">{baht(t.credit)}</b> เข้ากระเป๋าทันทีที่สลิปผ่าน</div>
      <PromptPayCard amount={t.pay} />
      <label className="flex flex-col gap-1.5 text-[13px] text-[#d9c9b4]">โค้ดผู้แนะนำ (ถ้ามี)
        <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} placeholder="เช่น MB7K2Q" className="h-12 rounded-xl px-3 bg-[#171211] text-[16px] text-[#f3ead9] outline-none" style={{ border: "1px solid rgba(243,234,217,.12)" }} />
      </label>
      <label className="min-h-[52px] rounded-xl flex items-center justify-center text-[14px] text-[#e8c472] cursor-pointer" style={{ border: "1px dashed rgba(232,196,114,.6)" }}>
        {slip ? `แนบแล้ว: ${slip.name.slice(0, 30)}` : "แนบสลิปการโอน"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setSlip(e.target.files?.[0] ?? null)} />
      </label>
      <button type="button" disabled={busy || !slip} onClick={send} className="h-[52px] rounded-full font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-40">{busy ? "กำลังตรวจสลิป…" : `ยืนยันเปิดเมม ${t.name}`}</button>
      {msg && <p role="status" className="m-0 text-[14px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
      <p className="m-0 text-[12px] text-[#9a8a85]">เครดิตใช้จ่ายในแอปได้ทุกบริการ · ไม่สามารถถอนเป็นเงินสด · ใบเสร็จรับเงินออกให้อัตโนมัติ</p>
    </section>
  );
}
