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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cardDone = !!card.file || hasIdCard;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";

  const submit = async () => {
    if (!cardDone) return setError("กรุณาอัปโหลดหน้าบัตรประชาชน");
    if (!selfie.file) return setError("กรุณาถ่ายเซลฟีถือบัตรคู่กับใบหน้า");
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("mb", mb);
    if (t) fd.set("t", t);
    if (card.file) fd.set("id_card", card.file);
    fd.set("selfie", selfie.file);
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

        <div className="flex gap-2 text-[13px] leading-relaxed" style={{ color: C.mut }}><span style={{ color: C.gold }}>•</span>ให้เห็นหน้าและบัตรชัด ๆ กรุณาถอดแว่นกันแดดและหมวกก่อนถ่าย</div>
        <div className="flex gap-2 text-[13px] leading-relaxed" style={{ color: C.mut }}><span style={{ color: C.gold }}>•</span>ข้อมูลของคุณถูกเข้ารหัส และใช้ยืนยันตัวตนเท่านั้น (PDPA)</div>
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
