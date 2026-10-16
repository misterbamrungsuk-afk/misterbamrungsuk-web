"use client";

// บอร์ด C-Redeem "ใช้โค้ดของขวัญ / โปรโมชั่น" — กรอกโค้ด → เครดิตเข้ากระเป๋าเงินทันที (ใช้จองเพื่อนได้)
import { useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
type Ok = { code: string; kind: string; amount: number; expires_at: string | null; message: string | null };

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState<Ok | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/codes/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (r?.status === 401) return setErr("กรุณาเข้าสู่ระบบก่อนใช้โค้ด");
    if (d?.ok) setOk(d); else setErr(d?.error || "ใช้โค้ดไม่สำเร็จ");
  };
  return (
    <div className="pb-8 min-h-dvh" style={{ background: "#171211" }}>
      <div className="flex items-center gap-2" style={{ padding: "12px 14px 0" }}>
        <Link href="/membership" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center hover:text-[#e8c472]" style={{ border: `1px solid ${LN}`, color: GOLD }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></Link>
        <h1 className="m-0 font-semibold text-[17px]" style={{ color: GOLD }}>ใช้โค้ดของขวัญ / โปรโมชั่น</h1>
      </div>
      <div className="flex flex-col gap-[14px]" style={{ padding: "14px 18px 0" }}>
        {!ok ? (
          <>
            <div className="flex gap-3 items-center rounded-2xl bg-[#211a18]" style={{ padding: 14, border: `1px solid ${LN}` }}>
              <div className="w-12 h-12 rounded-[14px] bg-[#251d1b] grid place-items-center shrink-0" style={{ color: GOLD }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M3 12h18M12 8v13M12 8S10 3 7 4.5 9 8 12 8zm0 0s2-5 5-3.5S15 8 12 8z" /></svg></div>
              <div className="text-[13px] font-light text-[#d9c9b4]">มีโค้ดจากบัตรของขวัญ อีเมล หรือ LINE OA? กรอกตรงนี้รับเครดิตเข้ากระเป๋าได้เลย</div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-[14px]">
              <label className="flex flex-col gap-1.5"><span className="text-[12px] text-[#d9c9b4]">โค้ด</span>
                <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(""); }} maxLength={24} autoCapitalize="characters" autoComplete="off" placeholder="เช่น MBGIFT2026" aria-invalid={!!err}
                  className="h-12 rounded-xl bg-[#251d1b] px-[14px] text-[18px] tracking-[2px] outline-none placeholder:text-[#b5a596] placeholder:tracking-normal" style={{ border: `1px solid ${err ? "#ef6b7b" : "rgba(232,196,114,0.14)"}`, color: GOLD }} />
                {err && <span role="alert" className="text-[12px] font-light text-[#ef6b7b]">{err}</span>}
              </label>
              <button type="submit" disabled={busy || !code.trim()} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold disabled:opacity-50">{busy ? "กำลังตรวจโค้ด…" : "ใช้โค้ด"}</button>
            </form>
          </>
        ) : (
          <>
            <div className="rounded-[20px] flex flex-col gap-2" style={{ padding: 20, border: "1px solid rgba(232,196,114,0.55)", background: "linear-gradient(160deg,#2a1d12,#211a18 60%)" }}>
              <div className="text-[12px] tracking-[2px] font-light" style={{ color: GOLD }}>ใช้โค้ดสำเร็จ</div>
              <div className="font-semibold text-[26px]" style={{ color: GOLD }}>เครดิต ฿{(ok.amount / 100).toLocaleString("en-US")}</div>
              <div className="text-[13px] font-light text-[#d9c9b4]">{ok.kind === "gift" ? "บัตรของขวัญจากเพื่อน" : "โค้ดโปรโมชัน"} · เข้ากระเป๋าเงินแล้ว ใช้จองเพื่อนได้ทันที{ok.message ? ` · “${ok.message}”` : ""}</div>
              <div className="flex justify-between text-[12px] font-light pt-2.5" style={{ borderTop: `1px solid ${LN}` }}><span className="text-[#d9c9b4]">โค้ด {ok.code}</span><Link href="/wallet" style={{ color: GOLD }}>ดูกระเป๋าเงิน ›</Link></div>
            </div>
            <Link href="/" className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center hover:text-[#1b130b]">นัดเพื่อนเลย</Link>
            <button type="button" onClick={() => { setOk(null); setCode(""); }} className="h-12 rounded-[14px] bg-[#211a18] text-[14px] font-semibold" style={{ border: `1px solid ${LN}`, color: GOLD }}>ใช้โค้ดอื่น</button>
          </>
        )}
      </div>
    </div>
  );
}
