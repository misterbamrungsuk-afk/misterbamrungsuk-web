"use client";

// "ซื้อเป็นของขวัญให้เพื่อน" (บอร์ด C-Membership) — ตัดจากกระเป๋าเงิน → ได้โค้ดส่งให้ผู้รับ (ใช้ได้ 1 ครั้ง · 1 ปี)
import { useEffect, useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const AMOUNTS = [1000, 3000, 5000];
type Gift = { code: string; amount_satang: number; used: boolean; expires_at: string | null; to_name: string | null; message: string | null; created_at: string };

export function GiftBox({ loggedIn }: { loggedIn: boolean }) {
  const [amt, setAmt] = useState(1000);
  const [f, setF] = useState({ to_name: "", to_contact: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Gift | null>(null);
  const [mine, setMine] = useState<Gift[]>([]);
  const [copied, setCopied] = useState("");
  const load = () => fetch("/api/codes/gift", { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setMine(d.gifts)).catch(() => {});
  useEffect(() => { if (loggedIn) load(); }, [loggedIn]);
  const buy = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/codes/gift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, ...f }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setErr(d?.error || "ซื้อไม่สำเร็จ");
    setDone(d.gift); load();
  };
  const copy = async (g: Gift) => {
    const text = `บัตรของขวัญ Mister Bamrungsuk ฿${(g.amount_satang / 100).toLocaleString("en-US")}${g.message ? ` · “${g.message}”` : ""}\nโค้ด: ${g.code}\nใช้ที่ บัญชี › ระดับสมาชิก › ใช้โค้ด (${typeof location !== "undefined" ? location.origin : ""}/membership/redeem)`;
    try { await navigator.clipboard.writeText(text); setCopied(g.code); setTimeout(() => setCopied(""), 1800); } catch { setCopied(""); }
  };
  const inp = "h-11 rounded-xl bg-[#251d1b] px-3 text-[15px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]";
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-[#211a18]" style={{ padding: 16, border: "1px solid rgba(212,175,55,.4)" }}>
      <b className="font-semibold text-[16px]">ซื้อเป็นของขวัญให้เพื่อน</b>
      <span className="text-[12.5px] font-light text-[#d9c9b4]">ผู้รับกรอกโค้ดแล้วได้เครดิตเข้ากระเป๋า ใช้นัดเพื่อนได้ · ใช้ได้ 1 ปี · ตัดจากกระเป๋าเงินของคุณ</span>
      <div className="grid grid-cols-3 gap-2">{AMOUNTS.map((a) => <button key={a} type="button" onClick={() => setAmt(a)} className="h-12 rounded-[14px] text-[15px] font-semibold" style={{ border: `1.5px solid ${amt === a ? GOLD : "rgba(232,196,114,0.14)"}`, background: amt === a ? "rgba(232,196,114,0.16)" : "#211a18", color: amt === a ? GOLD : "#f3ead9" }}>฿{a.toLocaleString("en-US")}</button>)}</div>
      <input value={f.to_name} onChange={(e) => setF({ ...f, to_name: e.target.value })} maxLength={60} placeholder="ชื่อผู้รับ (ไม่บังคับ)" aria-label="ชื่อผู้รับ" className={inp} />
      <input value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={200} placeholder="ข้อความถึงผู้รับ เช่น สุขสันต์วันเกิดนะ" aria-label="ข้อความถึงผู้รับ" className={inp} />
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}{/ไม่พอ/.test(err) && <> · <Link href="/wallet" style={{ color: GOLD }}>เติมเงิน ›</Link></>}</p>}
      {loggedIn
        ? <button type="button" onClick={buy} disabled={busy} className="h-[52px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy ? "กำลังสร้างบัตร…" : `ส่งของขวัญ ฿${amt.toLocaleString("en-US")}`}</button>
        : <Link href="/login?next=/membership" className="h-[52px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">เข้าสู่ระบบเพื่อซื้อของขวัญ</Link>}
      {done && (
        <div className="rounded-2xl text-[13px] leading-[1.6] font-light" style={{ padding: 14, border: "1px solid rgba(74,222,128,.5)", background: "rgba(74,222,128,.08)" }}>
          <span className="font-semibold text-[#bbf7d0]">สร้างบัตรของขวัญแล้ว · โค้ด {done.code}</span><br /><span className="text-[#d9c9b4]">ส่งโค้ดนี้ให้ผู้รับ · ผู้รับใช้ได้ที่ ระดับสมาชิก › ใช้โค้ด</span>
          <button type="button" onClick={() => copy(done)} className="block mt-2 h-10 px-4 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>{copied === done.code ? "คัดลอกแล้ว ✓" : "คัดลอกข้อความส่งเพื่อน"}</button>
        </div>
      )}
      {!!mine.length && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[12px] text-[#d9c9b4]">บัตรที่ฉันซื้อ</span>
          {mine.map((g) => (
            <div key={g.code} className="flex items-center gap-2 text-[13px] rounded-xl bg-[#251d1b]" style={{ padding: "8px 12px" }}>
              <span className="flex-1 min-w-0 truncate"><b className="font-semibold tracking-[1px]" style={{ color: GOLD }}>{g.code}</b> · ฿{(g.amount_satang / 100).toLocaleString("en-US")}{g.to_name ? ` · ${g.to_name}` : ""}</span>
              {g.used ? <span className="text-[#5fd08f] text-[12px]">ใช้แล้ว</span> : <button type="button" onClick={() => copy(g)} className="text-[12px]" style={{ color: GOLD }}>{copied === g.code ? "คัดลอกแล้ว" : "คัดลอก"}</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
