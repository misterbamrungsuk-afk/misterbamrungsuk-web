"use client";

import { useEffect, useState } from "react";
import { OtpStep } from "@/components/otp-step";

// เขียนรีวิว: ยืนยันเบอร์ที่ใช้สั่งซื้อ (OTP) → ระบบเช็กว่ามีคำสั่งซื้อ "สำเร็จ" ของสินค้านี้ → ให้ดาว + ข้อความ
export function ReviewForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [can, setCan] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const check = () =>
    fetch(`/api/market/reviews?product=${encodeURIComponent(productId)}`, { cache: "no-store" }).then((r) => r.json())
      .then((d: { verified?: boolean; can?: boolean; reason?: string | null }) => { setVerified(!!d.verified); setCan(!!d.can); setReason(d.reason ?? ""); })
      .catch(() => {});
  useEffect(() => { if (open) check(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/market/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId, stars, text, name }) });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; held?: boolean };
    setBusy(false);
    if (!d.ok) return setMsg(d.error || "ส่งรีวิวไม่สำเร็จ");
    setMsg(d.held ? "ขอบคุณสำหรับรีวิว — ทีมงานจะตรวจข้อความก่อนแสดง" : "ขอบคุณสำหรับรีวิว");
    setCan(false);
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-ghost h-11 px-5 rounded-full text-sm">เขียนรีวิว</button>;
  return (
    <div className="glass rounded-3xl p-5 flex flex-col gap-3">
      <p className="text-sm text-ink-300">รีวิวได้เฉพาะผู้ซื้อที่ได้รับสินค้าแล้ว — ยืนยันเบอร์ที่ใช้สั่งซื้อ</p>
      {!verified && <OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => { setVerified(true); check(); }} inputCls="input-dark flex-1" />}
      {verified && can === false && !msg && <p className="text-sm text-crimson-300">{reason}</p>}
      {verified && can && (
        <>
          <div className="flex gap-1" role="radiogroup" aria-label="ให้คะแนน">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} ดาว`} onClick={() => setStars(n)} className={`text-3xl ${n <= stars ? "text-gold-400" : "text-ink-600"}`}>★</button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อที่แสดง (เว้นว่าง = ผู้ซื้อ)" maxLength={40} className="input-dark" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder="เล่าประสบการณ์การสั่งซื้อ การจัดส่ง และบรรจุภัณฑ์" className="input-dark" />
          <p className="text-[11px] text-[#9a8a85]">โปรดหลีกเลี่ยงการอ้างสรรพคุณทางการแพทย์ ข้อความลักษณะนี้จะถูกซ่อนไว้ให้ทีมงานตรวจ</p>
          <button type="button" onClick={submit} disabled={busy} className="btn-crimson h-11 rounded-full font-semibold">{busy ? "กำลังส่ง…" : "ส่งรีวิว"}</button>
        </>
      )}
      {msg && <p role="status" className="text-sm text-gold-300">{msg}</p>}
    </div>
  );
}
