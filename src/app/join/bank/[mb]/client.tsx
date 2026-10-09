"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BANK_GROUPS, ALL_BANKS, PROMPTPAY } from "@/lib/join/banks";
import { BottomBar, C, ctaStyle } from "../../_kyc/ui";

const inCls = "h-12 w-full rounded-xl px-3.5 text-[15px] outline-none";
const inStyle = { border: `1px solid ${C.ln}`, background: C.s1, color: C.tx };
const lb = "block h-[18px] leading-[18px] text-xs whitespace-nowrap";

export function BankForm({ mb, t, initial }: { mb: string; t: string; initial: { bank: string; account: string; name: string } }) {
  const router = useRouter();
  const [mode, setMode] = useState<"bank" | "pp">(initial.bank === PROMPTPAY ? "pp" : "bank");
  const [bank, setBank] = useState(ALL_BANKS.includes(initial.bank) ? initial.bank : ALL_BANKS[0]);
  const [account, setAccount] = useState(initial.account);
  const [name, setName] = useState(initial.name);
  const [bankbook, setBankbook] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const digits = account.replace(/\D/g, "");
  const valid = mode === "pp" ? /^(0\d{9}|\d{13})$/.test(digits) : /^\d{10,12}$/.test(digits);

  const submit = async () => {
    if (!valid) return setError(mode === "pp" ? "พร้อมเพย์: เบอร์มือถือ 10 หลัก หรือเลขบัตร 13 หลัก" : "เลขบัญชี 10–12 หลัก");
    if (name.trim().length < 3) return setError("กรอกชื่อบัญชีให้ตรงกับบัตรประชาชน");
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("mb", mb);
    if (t) fd.set("t", t);
    fd.set("bank", mode === "pp" ? PROMPTPAY : bank);
    fd.set("bank_account", digits);
    fd.set("bank_account_name", name.trim());
    if (bankbook) fd.set("bankbook", bankbook);
    const res = await fetch("/api/join/bank", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.ok) return router.push(`/join/done/${mb}`);
    setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่"); setBusy(false);
  };

  const seg = (on: boolean) => ({ border: `1px solid ${on ? C.gold : C.ln}`, color: on ? C.goldL : C.tx, background: on ? "rgba(240,200,90,.16)" : "transparent" });

  return (
    <>
      <div className="px-4 pt-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {([["bank", "บัญชีธนาคาร"], ["pp", "พร้อมเพย์"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className="h-12 min-w-0 rounded-xl text-sm" style={seg(mode === k)}>{l}</button>
          ))}
        </div>
        {mode === "bank" && (
          <label className="flex flex-col gap-2"><span className={lb} style={{ color: C.mut }}>ธนาคาร</span>
            <select className={inCls} style={inStyle} value={bank} onChange={(e) => setBank(e.target.value)}>
              {BANK_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.banks.map((b) => <option key={b} value={b}>{b}</option>)}</optgroup>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-2"><span className={lb} style={{ color: C.mut }}>{mode === "pp" ? "เบอร์พร้อมเพย์ / เลขบัตรประชาชน" : "เลขบัญชี"}</span>
          <input className={inCls} style={inStyle} inputMode="numeric" autoComplete="off" maxLength={17} value={account}
            onChange={(e) => setAccount(e.target.value.replace(/[^\d-]/g, ""))} placeholder={mode === "pp" ? "08x-xxx-xxxx" : "xxx-x-xxxxx-x"} />
        </label>
        <label className="flex flex-col gap-2"><span className={lb} style={{ color: C.mut }}>ชื่อบัญชี (ต้องตรงกับบัตรประชาชน)</span>
          <input className={inCls} style={inStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุลตามบัตร" />
        </label>
        {mode === "bank" && (
          <label className="flex items-center justify-between gap-3 text-[13px] cursor-pointer" style={{ color: C.mut }}>
            <span>รูปหน้าสมุดบัญชี (ไม่บังคับ)</span>
            <span style={{ color: C.goldL }}>{bankbook ? "✓ แนบแล้ว" : "แนบรูป"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setBankbook(e.target.files?.[0] ?? null)} />
          </label>
        )}
        <div className="flex gap-3 p-4 rounded-2xl text-[13px] leading-[1.6]" style={{ border: "1px solid rgba(245,210,110,.85)", background: C.s1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px] shrink-0" style={{ color: C.gold }}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></svg>
          รายได้จะเข้ากระเป๋าเงินหลังจบงาน ถอนเข้าบัญชีนี้ได้ทุกเมื่อ (ขั้นต่ำ ฿300)
        </div>
        {error && <p role="alert" className="text-sm" style={{ color: C.pink }}>{error}</p>}
      </div>
      <BottomBar>
        <button type="button" onClick={submit} disabled={busy} className="btn-red-lux font-lux disabled:opacity-60" style={ctaStyle}>
          {busy ? "กำลังส่ง…" : "ยืนยัน · ส่งใบสมัคร"}
        </button>
        <div className="text-xs text-center" style={{ color: C.mut }}>แอดมินตรวจภายใน 24 ชม. แล้วแจ้งผลทางแอปและ LINE</div>
      </BottomBar>
    </>
  );
}
