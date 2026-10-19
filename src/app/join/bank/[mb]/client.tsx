"use client";
/* eslint-disable @next/next/no-img-element */

// บัญชีรับเงิน — ถอดตามบอร์ด D3-KYC3: ธนาคาร · เลขบัญชี · ชื่อบัญชี · รูปหน้าสมุดบัญชี (บังคับ) · ยินยอม 3 ข้อ → สัญญา
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BANK_GROUPS, ALL_BANKS } from "@/lib/join/banks";
import { BottomBar, ctaStyle } from "../../_kyc/ui";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";

const GOLD = "#e8c472";
const lb: React.CSSProperties = { display: "block", fontSize: 13, color: "#f3ead9", marginBottom: 6 };
const inCls = "w-full min-h-12 rounded-xl bg-[#251d1b] text-[#f3ead9] px-[14px] text-[15px] outline-none border border-transparent focus:border-[#e8c472] placeholder:text-[#b5a596]";

export function BankForm({ mb, t, initial, fix = false }: { mb: string; t: string; fix?: boolean; initial: { bank: string; account: string; name: string; hasBook: boolean } }) {
  const router = useRouter();
  const [bank, setBank] = useState(ALL_BANKS.includes(initial.bank) ? initial.bank : ALL_BANKS[0]);
  const [account, setAccount] = useState(initial.account);
  const [name, setName] = useState(initial.name);
  const [book, setBook] = useState<File | null>(null);
  const [bookUrl, setBookUrl] = useState("");
  const [ck, setCk] = useState({ terms: false, pdpa: false, profile: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const digits = account.replace(/\D/g, "");
  const hasBook = !!book || initial.hasBook;

  const [shrinking, setShrinking] = useState(false);
  // รูปสมุดบัญชีจากกล้องมือถือมักเกิน 5MB → ย่อในเครื่องก่อนส่ง (เหมือนหน้ารูปโปรไฟล์)
  const pickBook = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("รับเฉพาะไฟล์รูปภาพ JPG/PNG/WEBP");
    setShrinking(true); setError("");
    try {
      const small = await dataUrlToFile(await resizeImage(f, 1600, 0.85), "bankbook.jpg");
      if (small.size > 5 * 1024 * 1024) throw new Error("รูปใหญ่เกินไปแม้ย่อแล้ว · ลองถ่ายใหม่หรือเลือกรูปอื่น");
      setBook(small); setBookUrl((o) => { if (o) URL.revokeObjectURL(o); return URL.createObjectURL(small); });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง");
    } finally { setShrinking(false); }
  };

  const submit = async () => {
    if (!/^\d{10,12}$/.test(digits)) return setError("เลขบัญชี 10–12 หลัก");
    if (name.trim().length < 3) return setError("กรอกชื่อบัญชีให้ตรงกับบัตรประชาชน");
    if (!hasBook) return setError("แนบรูปหน้าสมุดบัญชี");
    if (!ck.terms || !ck.pdpa || !ck.profile) return setError("ติ๊กยินยอมให้ครบทั้ง 3 ข้อ");
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("mb", mb);
    if (t) fd.set("t", t);
    fd.set("bank", bank); fd.set("bank_account", digits); fd.set("bank_account_name", name.trim());
    if (book) fd.set("bankbook", book);
    fd.set("ck_terms", "true"); fd.set("ck_pdpa", "true"); fd.set("ck_profile", "true");
    const res = await fetch("/api/join/bank", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.ok) return router.push(data.review ? `/join/profile/${mb}/settings${q ? `${q}&` : "?"}bank=review` : fix ? `/join/rejected/${mb}${q}` : `/join/contract/${mb}${q}`);
    setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่"); setBusy(false);
  };

  const check = (k: keyof typeof ck, label: React.ReactNode) => (
    <button type="button" role="checkbox" aria-checked={ck[k]} onClick={() => setCk((c) => ({ ...c, [k]: !c[k] }))} className="flex gap-3 items-start p-0 bg-transparent text-[#f3ead9] text-[14px] leading-[1.6] text-left min-h-11">
      <span className="shrink-0 grid place-items-center rounded-md font-bold text-[14px] text-[#1b130b]" style={{ marginTop: 2, width: 22, height: 22, background: ck[k] ? GOLD : "transparent", boxShadow: ck[k] ? "none" : "inset 0 0 0 1.5px rgba(232,196,114,0.6)" }}>{ck[k] ? "✓" : ""}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="flex flex-col" style={{ padding: "24px 20px 0", gap: 23 }}>
        <label className="block"><span style={lb}>ธนาคาร</span>
          <select className={inCls} style={{ colorScheme: "dark" }} value={bank} onChange={(e) => setBank(e.target.value)}>
            {BANK_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.banks.map((b) => <option key={b} value={b}>{b}</option>)}</optgroup>)}
          </select>
        </label>
        <label className="block"><span style={lb}>เลขบัญชี</span>
          <input className={inCls} inputMode="numeric" autoComplete="off" value={account} onChange={(e) => setAccount(e.target.value.replace(/[^\d-]/g, "").slice(0, 17))} placeholder="xxx-x-xxxxx-x" />
        </label>
        <label className="block"><span style={lb}>ชื่อบัญชี (ต้องตรงกับบัตรประชาชน)</span>
          <input className={inCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุลตามบัตร" />
        </label>
        <div>
          <span style={lb}>รูปหน้าสมุดบัญชี <span className="text-[#ff8a9a]">*</span></span>
          <label className="w-full flex items-center gap-[14px] text-left rounded-[14px] cursor-pointer" style={{ padding: 14, background: hasBook ? "rgba(232,196,114,.08)" : "#2a211f", color: "#f3ead9" }}>
            <span aria-hidden="true" className="shrink-0 rounded-lg overflow-hidden grid place-items-center text-center" style={{ width: 64, height: 80, background: hasBook ? "#efe6d4" : "#2a211f", fontSize: 9, lineHeight: 1.2, color: "#3a302c", padding: bookUrl ? 0 : 6 }}>
              {bookUrl ? <img src={bookUrl} alt="" className="w-full h-full object-cover" /> : hasBook ? "สมุดบัญชี ✓" : ""}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold" style={{ color: hasBook ? GOLD : "#f3ead9", fontSize: 13.33 }}>{hasBook ? `✓ ${book?.name ?? "แนบแล้ว"}` : "แนบรูปหน้าสมุดบัญชี"}</span>
              <span className="text-[13px] text-[#d9c9b4] font-light">{hasBook ? "แตะเพื่อเปลี่ยนรูป" : "ถ่ายรูปหรือเลือกจากเครื่อง"}</span>
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickBook(e.target.files?.[0])} />
          </label>
        </div>
        <section className="flex flex-col rounded-2xl" style={{ padding: 20, gap: 18, background: "#1b2322" }}>
          {check("terms", <>ยอมรับข้อกำหนดและสัญญา · <a href="/join/terms" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#e8c472]">อ่านสัญญา</a></>)}
          {check("pdpa", "ยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลตาม PDPA")}
          {check("profile", "ยินยอมให้แสดงรูปและข้อมูลโปรไฟล์บนแพลตฟอร์ม (สำหรับสมาชิก)")}
        </section>
      </div>
      <BottomBar>
        {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
        <button type="button" onClick={submit} disabled={busy || shrinking} style={{ ...ctaStyle, opacity: busy || shrinking ? 0.6 : 1 }}>{shrinking ? "กำลังย่อรูป…" : busy ? "กำลังส่ง…" : "ยืนยัน · ส่งใบสมัคร"}</button>
      </BottomBar>
    </>
  );
}
