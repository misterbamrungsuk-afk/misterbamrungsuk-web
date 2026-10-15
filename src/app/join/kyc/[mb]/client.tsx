"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomBar, C, ctaStyle } from "../../_kyc/ui";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

function useImage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type) || f.size > 5 * 1024 * 1024) { setErr("รูป JPG/PNG/WEBP ไม่เกิน 5MB"); return; }
    setErr(""); setFile(f);
    setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  };
  return { file, url, err, pick };
}

const camIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34 }}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  </svg>
);

const doneBox = { border: `1px solid ${C.gold}`, background: "rgba(212,175,55,.05)" };
const emptyBox = { border: `1px dashed ${C.ln}` };

export function KycForm({ mb, t, hasIdCard }: { mb: string; t: string; hasIdCard: boolean }) {
  const router = useRouter();
  const card = useImage();
  const selfie = useImage();
  const copy = useImage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cardDone = !!card.file || hasIdCard;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";

  const submit = async () => {
    if (!cardDone) return setError("กรุณาอัปโหลดหน้าบัตรประชาชน");
    if (!selfie.file) return setError("กรุณาถ่ายเซลฟีถือบัตรคู่กับใบหน้า");
    if (!copy.file) return setError("กรุณาอัปโหลดสำเนาบัตรประชาชนที่เซ็นรับรองสำเนาแล้ว");
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("mb", mb);
    if (t) fd.set("t", t);
    if (card.file) fd.set("id_card", card.file);
    fd.set("selfie", selfie.file);
    fd.set("id_copy", copy.file);
    const res = await fetch("/api/join/kyc", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.ok) return router.push(`/join/bank/${mb}${q}`);
    setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่"); setBusy(false);
  };

  return (
    <>
      <div className="px-4 pt-4 flex flex-col gap-4">
        <label className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer" style={cardDone ? doneBox : emptyBox}>
          <div className="flex justify-between items-center gap-3">
            <b className="font-medium">1. หน้าบัตรประชาชน</b>
            {cardDone && <span className="text-xs whitespace-nowrap" style={{ color: C.goldL }}>✓ อัปโหลดแล้ว</span>}
          </div>
          <div className="h-[120px] rounded-xl flex items-center justify-center text-xs overflow-hidden" style={{ background: C.s2, color: C.mut }}>
            {card.url ? <img src={card.url} alt="บัตรประชาชน" className="h-full w-full object-cover" />
              : cardDone ? "[ภาพบัตร · เลขบัตรถูกปิดบางส่วน]"
              : <span className="flex flex-col items-center gap-2">{camIcon}<span className="text-[13px]">แตะเพื่ออัปโหลด</span></span>}
          </div>
          {card.err && <span className="text-xs" style={{ color: C.pink }}>{card.err}</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => card.pick(e.target.files?.[0])} />
        </label>

        <label className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer" style={selfie.file ? doneBox : emptyBox}>
          <div className="flex justify-between items-center gap-3">
            <b className="font-medium">2. เซลฟีถือบัตรคู่กับใบหน้า</b>
            {selfie.file && <span className="text-xs whitespace-nowrap" style={{ color: C.goldL }}>✓ ถ่ายแล้ว</span>}
          </div>
          <div className="h-[152px] rounded-xl flex flex-col items-center justify-center gap-2 overflow-hidden" style={{ background: C.s2, color: C.mut }}>
            {selfie.url ? <img src={selfie.url} alt="เซลฟีถือบัตร" className="h-full w-full object-cover" /> : <>{camIcon}<span className="text-[13px]">แตะเพื่อถ่ายรูป</span></>}
          </div>
          {selfie.err && <span className="text-xs" style={{ color: C.pink }}>{selfie.err}</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(e) => selfie.pick(e.target.files?.[0])} />
        </label>

        <div className="rounded-2xl p-4 flex flex-col gap-3" style={copy.file ? doneBox : emptyBox}>
          <div className="flex justify-between items-center gap-3">
            <b className="font-medium">3. สำเนาบัตรประชาชน (เซ็นรับรองสำเนา)</b>
            {copy.file && <span className="text-xs whitespace-nowrap" style={{ color: C.goldL }}>✓ อัปโหลดแล้ว</span>}
          </div>
          <ol className="m-0 pl-5 list-decimal flex flex-col gap-1 text-[13px] leading-[1.6]" style={{ color: C.mut }}>
            <li>ถ่ายเอกสารหน้าบัตรประชาชนลงกระดาษ A4</li>
            <li>เขียนกำกับบนสำเนาว่า <b style={{ color: C.tx }}>“ใช้สำหรับสมัคร Part-Time กับ Mister Bamrungsuk เท่านั้น”</b></li>
            <li>ลงวันที่ และลงลายมือชื่อ พร้อมเขียน <b style={{ color: C.tx }}>“รับรองสำเนาถูกต้อง”</b></li>
            <li>ถ่ายรูปหรือสแกนให้เห็นข้อความครบ แล้วอัปโหลดด้านล่าง</li>
          </ol>
          <div className="rounded-xl p-3 text-[12px] leading-[1.6]" style={{ background: "#f3ead9", color: "#211a18" }} aria-label="ตัวอย่างการเขียนรับรองสำเนา">
            <div className="text-[10.5px] tracking-[1px] font-semibold mb-1.5" style={{ color: "#8a6a1f" }}>ตัวอย่างสิ่งที่ต้องเขียน</div>
            <div className="rounded-lg border border-dashed px-3 py-2 flex flex-col gap-1" style={{ borderColor: "#b9a27a" }}>
              <div className="h-10 rounded-md grid place-items-center text-[10.5px]" style={{ background: "#e4dccd", color: "#7a6a5a" }}>[ สำเนาหน้าบัตรประชาชน ]</div>
              <div style={{ fontFamily: "'Itim', 'Sriracha', cursive", color: "#1d3fa8" }} className="text-[13px] leading-snug">
                ใช้สำหรับสมัคร Part-Time กับ Mister Bamrungsuk เท่านั้น<br />
                รับรองสำเนาถูกต้อง<br />
                ลงชื่อ ......(ลายมือชื่อ)...... &nbsp;วันที่ 9 ต.ค. 2569
              </div>
            </div>
          </div>
          <label className="h-[140px] rounded-xl flex flex-col items-center justify-center gap-2 overflow-hidden cursor-pointer" style={{ background: C.s2, color: C.mut }}>
            {copy.url ? <img src={copy.url} alt="สำเนาบัตรเซ็นรับรอง" className="h-full w-full object-cover" /> : <>{camIcon}<span className="text-[13px]">แตะเพื่อถ่ายรูป / อัปโหลด</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => copy.pick(e.target.files?.[0])} />
          </label>
          {copy.err && <span className="text-xs" style={{ color: C.pink }}>{copy.err}</span>}
        </div>

        <div className="flex gap-2 text-[13px] leading-[1.6]" style={{ color: C.mut }}><span style={{ color: C.gold }}>•</span>ให้เห็นหน้าและบัตรชัด ๆ กรุณาถอดแว่นกันแดดและหมวกก่อนถ่าย</div>
        <div className="flex gap-2 text-[13px] leading-[1.6]" style={{ color: C.mut }}><span style={{ color: C.gold }}>•</span>ข้อมูลของคุณถูกเข้ารหัส และใช้ยืนยันตัวตนเท่านั้น (PDPA)</div>
        {error && <p role="alert" className="text-sm" style={{ color: C.pink }}>{error}</p>}
      </div>
      <BottomBar>
        <button type="button" onClick={submit} disabled={busy} className="btn-red-lux font-lux disabled:opacity-60" style={ctaStyle}>
          {busy ? "กำลังอัปโหลด…" : "ถัดไป · บัญชีรับเงิน"}
        </button>
      </BottomBar>
    </>
  );
}
