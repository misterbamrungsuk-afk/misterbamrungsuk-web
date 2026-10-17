"use client";
/* eslint-disable @next/next/no-img-element */

// ยืนยันตัวตน — ถอดตามบอร์ด D2-KYC2: 3 กล่อง (หน้าบัตร · เซลฟีถือบัตร · สำเนาเซ็นรับรอง) + ปุ่ม "ถัดไป · บัญชีรับเงิน"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomBar, ctaStyle } from "../../_kyc/ui";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";

const box: React.CSSProperties = { padding: 20, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 };
const area = "rounded-xl flex flex-col items-center justify-center gap-2 overflow-hidden text-[#f3ead9] cursor-pointer";

function useImage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // รูปจากมือถือมักเกิน 5MB → ย่อในเครื่องก่อนส่ง (ด้านยาว 1600px ยังอ่านตัวอักษรบนบัตรได้ชัด) เหมือนหน้ารูปโปรไฟล์
  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("รับเฉพาะไฟล์รูปภาพ JPG/PNG/WEBP"); return; }
    setBusy(true); setErr("");
    try {
      const small = await dataUrlToFile(await resizeImage(f, 1600, 0.85), "kyc.jpg");
      if (small.size > 5 * 1024 * 1024) throw new Error("รูปใหญ่เกินไปแม้ย่อแล้ว · ลองถ่ายใหม่หรือเลือกรูปอื่น");
      setFile(small);
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(small); });
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง");
    } finally { setBusy(false); }
  };
  return { file, url, err, pick, busy };
}

const cam = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);

type K = "id_card" | "selfie" | "id_copy";
export function KycForm({ mb, t, has, redo, fix }: { mb: string; t: string; has: Record<K, boolean>; redo: string[]; fix: boolean }) {
  // มีไฟล์แล้วและไม่ถูกตีกลับ = ไม่ต้องส่งซ้ำ
  const keep = (k: K) => has[k] && !redo.includes(k);
  const router = useRouter();
  const card = useImage();
  const selfie = useImage();
  const copy = useImage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cardDone = !!card.file || keep("id_card");
  const selfieDone = !!selfie.file || keep("selfie");
  const copyDone = !!copy.file || keep("id_copy");
  const q = t ? `?t=${encodeURIComponent(t)}` : "";

  const submit = async () => {
    if (!cardDone) return setError("กรุณาอัปโหลดหน้าบัตรประชาชน");
    if (!selfieDone) return setError("กรุณาถ่ายเซลฟีถือบัตรคู่กับใบหน้า");
    if (!copyDone) return setError("กรุณาอัปโหลดสำเนาบัตรประชาชนที่เซ็นรับรองแล้ว");
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("mb", mb);
    if (t) fd.set("t", t);
    if (card.file) fd.set("id_card", card.file);
    if (selfie.file) fd.set("selfie", selfie.file);
    if (copy.file) fd.set("id_copy", copy.file);
    const res = await fetch("/api/join/kyc", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.ok) return router.push(fix ? `/join/rejected/${mb}${q}` : `/join/bank/${mb}${q}`);
    setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่"); setBusy(false);
  };

  return (
    <>
      <div className="flex flex-col md:grid md:grid-cols-2" style={{ padding: "24px 20px 0", gap: 26 }}>
        <div style={{ ...box, background: "#251d1b" }}>
          <div className="flex justify-between items-center gap-3"><b className="font-semibold text-[17px]">1. หน้าบัตรประชาชน</b>{!card.file && redo.includes("id_card") ? <span className="text-[13px] text-white bg-[#d93a3a] rounded-full whitespace-nowrap font-semibold" style={{ padding: "2px 10px" }}>ส่งใหม่</span> : cardDone && <span className="text-[13px] text-[#e8c472] whitespace-nowrap font-light">✓ อัปโหลดแล้ว</span>}</div>
          <label className={area} style={{ height: 120, background: "rgba(243,234,217,0.07)" }}>
            {card.url ? <img src={card.url} alt="บัตรประชาชน" className="h-full w-full object-cover" /> : <>{cam}<span className="text-[14px]">แตะเพื่อถ่ายรูป / อัปโหลด</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => card.pick(e.target.files?.[0])} />
          </label>
          {card.err && <span className="text-[12.5px] text-[#ff8a9a]">{card.err}</span>}
        </div>

        <div style={{ ...box, background: "#2c1a1f" }}>
          <div className="flex justify-between items-center gap-3"><b className="font-semibold text-[17px]">2. เซลฟีถือบัตรคู่กับใบหน้า</b>{!selfie.file && redo.includes("selfie") ? <span className="text-[13px] text-white bg-[#d93a3a] rounded-full whitespace-nowrap font-semibold" style={{ padding: "2px 10px" }}>ส่งใหม่</span> : selfieDone && <span className="text-[13px] text-[#e8c472] whitespace-nowrap font-light">✓ ถ่ายแล้ว</span>}</div>
          <label className={area} style={{ height: 150, background: "rgba(243,234,217,0.07)" }}>
            {selfie.url ? <img src={selfie.url} alt="เซลฟีถือบัตร" className="h-full w-full object-cover" /> : <>{cam}<span className="text-[14px]">แตะเพื่อถ่ายรูป</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(e) => selfie.pick(e.target.files?.[0])} />
          </label>
          {selfie.err && <span className="text-[12.5px] text-[#ff8a9a]">{selfie.err}</span>}
        </div>

        <div className="md:col-span-2" style={{ ...box, background: "#272013" }}>
          <div className="flex justify-between items-center gap-3"><b className="font-semibold text-[17px]">3. สำเนาบัตรประชาชน (เซ็นรับรอง)</b>{!copy.file && redo.includes("id_copy") ? <span className="text-[13px] text-white bg-[#d93a3a] rounded-full whitespace-nowrap font-semibold" style={{ padding: "2px 10px" }}>ส่งใหม่</span> : copyDone && <span className="text-[13px] text-[#e8c472] whitespace-nowrap font-light">✓ อัปโหลดแล้ว</span>}</div>
          <ol className="m-0 flex flex-col gap-1 text-[14px] leading-[1.6]" style={{ paddingLeft: 20 }}>
            <li>ถ่ายเอกสารหน้าบัตรลงกระดาษ A4</li>
            <li>เขียนกำกับ <b>“ใช้สำหรับสมัครพาร์ทไทม์กับ Mister Bamrungsuk เท่านั้น”</b></li>
            <li>ลงวันที่ ลงชื่อ และเขียน <b>“รับรองสำเนาถูกต้อง”</b></li>
            <li>ถ่ายรูปให้เห็นข้อความครบ แล้วอัปโหลด</li>
          </ol>
          <label className={area} style={{ height: 140, background: "rgba(243,234,217,0.07)" }}>
            {copy.url ? <img src={copy.url} alt="สำเนาบัตรเซ็นรับรอง" className="h-full w-full object-cover" /> : <>{cam}<span className="text-[14px]">แตะเพื่อถ่ายรูป / อัปโหลด</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => copy.pick(e.target.files?.[0])} />
          </label>
          {copy.err && <span className="text-[12.5px] text-[#ff8a9a]">{copy.err}</span>}
        </div>
      </div>
      <BottomBar>
        {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
        <button type="button" onClick={submit} disabled={busy || card.busy || selfie.busy || copy.busy} style={{ ...ctaStyle, opacity: busy || card.busy || selfie.busy || copy.busy ? 0.6 : 1 }}>{card.busy || selfie.busy || copy.busy ? "กำลังย่อรูป…" : busy ? "กำลังอัปโหลด…" : fix ? "ส่งรายการที่แก้ไข" : "ถัดไป · บัญชีรับเงิน"}</button>
      </BottomBar>
    </>
  );
}
