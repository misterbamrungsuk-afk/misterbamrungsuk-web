"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BANK, GUARANTEE_REFUND_NOTE, PACKAGES, type PackageKey } from "@/lib/join/config";
import { FILE_FIELDS, FORM_KEY, dataUrlToFile, resizeImage, type JoinForm } from "@/lib/join/form";
import { promptPayPayload } from "@/lib/join/promptpay";
import QRCode from "qrcode";
import { Turnstile } from "@/components/turnstile";
import { OtpStep } from "@/components/otp-step";

// ขั้นที่ 3 / 5 ชำระเงิน (บอร์ด JoinPay) — QR พร้อมเพย์ + แนบสลิป → /api/join/register (ตรวจ Slip2Go) → /join/kyc/[mb]
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const H: CSSProperties = { fontFamily: "var(--font-cormorant), var(--font-kanit), sans-serif", fontWeight: 600 };
const SUB: Record<PackageKey, string> = { A: "(ตามความสามารถพิเศษ)", B: "(สำหรับผู้มีความสามารถด้านการนวด)" };
const QR_TTL = 900;
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

export default function PayPage() {
  const router = useRouter();
  const [f, setF] = useState<JoinForm | null>(null);
  const hasQr = !!BANK.qrImage || !!promptPayPayload(BANK.promptPayId, 1);
  const method: "qr" | "transfer" = hasQr ? "qr" : "transfer";
  const [qr, setQr] = useState("");
  const [sec, setSec] = useState(QR_TTL);
  const [slip, setSlip] = useState("");
  const [slipName, setSlipName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [slipErr, setSlipErr] = useState("");
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [phoneOk, setPhoneOk] = useState(false);
  const [otpOff, setOtpOff] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      const parsed = saved ? (JSON.parse(saved) as JoinForm) : null;
      if (!parsed?.package) return router.replace("/join#packages");
      if (!parsed.accept_terms || !parsed.consent_pdpa) return router.replace(`/join/apply?pkg=${parsed.package}&step=2`);
      setF(parsed);
    } catch {
      router.replace("/join#packages");
    }
  }, [router]);

  // เบอร์ยืนยัน OTP แล้ว (cookie) และตรงกับใบสมัคร → ไม่ต้องขอซ้ำ
  useEffect(() => {
    if (!f?.tel) return;
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { phone?: string | null; required?: boolean }) => {
      if (d.required === false) { setOtpOff(true); setPhoneOk(true); return; }
      if (d.phone && d.phone === f.tel.replace(/\D/g, "")) setPhoneOk(true);
    }).catch(() => {});
  }, [f?.tel]);

  useEffect(() => {
    if (!f?.package) return;
    const payload = promptPayPayload(BANK.promptPayId, PACKAGES[f.package].price);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [f?.package]);

  useEffect(() => {
    if (sec <= 0) return;
    const t = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sec]);

  if (!f || !f.package) return <main className="min-h-dvh grid place-items-center text-[#cdbfb3] bg-[#0e0a0a]">กำลังโหลด…</main>;
  const k = f.package;
  const pkg = PACKAGES[k];

  const setTel = (tel: string) => {
    const next = { ...f, tel };
    setF(next);
    setPhoneOk(false);
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(next)); } catch {}
  };

  const onSlip = async (file?: File) => {
    setSlipErr(""); setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setSlipErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    setSlip(await resizeImage(file, 1400, 0.85));
    setSlipName(file.name);
  };

  const submit = async () => {
    if (!slip) return setSlipErr("แนบสลิปการโอนก่อน");
    if (!phoneOk) return setErr("ยืนยันเบอร์โทรด้วยรหัส OTP ก่อน");
    setBusy(true); setErr(""); setSlipErr("");
    try {
      const fd = new FormData();
      const { skills, activities, talents, avail_slots, accept_terms, consent_pdpa, consent_marketing, photo, id_card, bankbook, other_doc, cert_doc, ...rest } = f;
      Object.entries(rest).forEach(([key, v]) => fd.append(key, String(v)));
      (skills ?? []).forEach((s) => fd.append("skills", s));
      (activities ?? []).forEach((s) => fd.append("activities", s));
      (talents ?? []).forEach((s) => fd.append("talents", s));
      (avail_slots ?? []).forEach((s) => fd.append("avail_slots", s));
      fd.append("accept_terms", String(accept_terms));
      fd.append("consent_pdpa", String(consent_pdpa));
      fd.append("consent_marketing", String(consent_marketing));
      fd.append("payment_method", method);
      fd.append("turnstile", ts);
      const files = { photo, id_card, bankbook, other_doc, cert_doc: rest.massage_cert === "yes" ? cert_doc : "" };
      for (const key of FILE_FIELDS) if (files[key]) fd.append(key, await dataUrlToFile(files[key], `${key}.jpg`));
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch("/api/join/register", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; mb_code?: string; error?: string; fields?: string[]; needOtp?: boolean };
      if (data.needOtp) setPhoneOk(false);
      if (!res.ok || !data.ok) {
        const msg = data.error || "ส่งข้อมูลไม่สำเร็จ";
        if (data.fields?.includes("slip")) { setSlipErr(msg); setSlip(""); setSlipName(""); }
        else setErr(data.fields?.length && !data.needOtp ? `${msg} — กลับไปแก้ในใบสมัคร (${data.fields.join(", ")})` : msg);
        throw null;
      }
      sessionStorage.removeItem(FORM_KEY);
      router.replace(`/join/kyc/${data.mb_code}`);
    } catch (e) {
      if (e) setErr((e as Error).message || "ส่งข้อมูลไม่สำเร็จ");
      setBusy(false);
      setTs(""); setTsKey((n) => n + 1);
    }
  };

  const items = k === "A"
    ? [["ค่าการันตี Branding", pkg.guarantee], ["ค่าอบรม", pkg.training]] as const
    : [["ค่าการันตี Branding", pkg.guarantee], ["ค่าอบรม (รวมยูนิฟอร์ม + น้ำมันนวด)", pkg.training]] as const;
  const perks = k === "A"
    ? ["อบรมบุคลิกภาพ มารยาท การดูแลลูกค้า", `ฟรี! ค่าสมาชิกอยู่ในระบบ 6 เดือนแรก (จากปกติ ${pkg.membershipAfter.toLocaleString("en-US")} บาท/6 เดือน)`]
    : ["อบรมบุคลิกภาพ + มาตรฐานการนวด", "ยูนิฟอร์ม + Massage Oil 1 เซ็ต", `ฟรี! ค่าสมาชิกอยู่ในระบบ 6 เดือนแรก (จากปกติ ${pkg.membershipAfter.toLocaleString("en-US")} บาท/6 เดือน)`];
  const lastInitial = f.last_name.trim() ? ` ${f.last_name.trim()[0]}.` : "";
  const summary = [["ผู้สมัคร", `${f.title}${f.first_name}${lastInitial}${f.nickname ? ` (${f.nickname})` : ""}`], ["กลุ่มอบรม", "กลุ่ม 1 · ภายใน 20 พ.ย."]];
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const expired = sec === 0;
  const canSubmit = !!slip && phoneOk && !busy;
  const mut = "text-[#cdbfb3]";

  return (
    <div className="min-h-dvh bg-[#0e0a0a]">
      <main className="mx-auto w-full max-w-[480px] min-h-dvh bg-[#0e0a0a] text-[#f6efe4] pb-8 overflow-x-hidden" style={{ fontFamily: "var(--font-cormorant), var(--font-plex), sans-serif" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Link href={`/join/apply?pkg=${k}&step=2`} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full border border-[rgba(240,200,90,.38)] text-[#f6efe4] grid place-items-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0">
            <div className="text-[11px] tracking-[1px] text-[#f0c75a] font-semibold">ขั้นที่ 3 / 5</div>
            <div className="text-[18px]" style={H}>ชำระเงิน</div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1 px-4" aria-label="ขั้นที่ 3 จาก 5">
          {[1, 2, 3, 4, 5].map((n) => <span key={n} className="h-1 rounded-[2px]" style={{ background: n <= 3 ? GOLD : LINE }} />)}
        </div>

        <div className="px-4 pt-4 flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between gap-3 px-4 py-[14px] rounded-[16px] border-[1.5px] border-[#f0c75a] bg-[rgba(240,200,90,.14)]">
            <div className="min-w-0">
              <div className="text-[11px] tracking-[1.5px] text-[#ffd76a]">แพ็กเกจที่เลือก</div>
              <div className="text-[17px]" style={H}>เพื่อนกินเที่ยว</div>
              <div className="text-[11.5px] text-[#cdbfb3] whitespace-nowrap">{SUB[k]}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[20px] text-[#ffd76a]" style={H}>{baht(pkg.price)}</div>
              <Link href="/join#packages" className="text-[12px] text-[#ffd76a]">เปลี่ยนแพ็กเกจ</Link>
            </div>
          </div>

          <div className="p-4 min-w-0 rounded-[16px] bg-[#241717] border border-[rgba(240,200,90,.38)] flex flex-col gap-4 text-[13px] leading-[1.5]">
            <div className="flex flex-col gap-2">
              {summary.map(([n, v]) => (
                <div key={n} className="flex justify-between items-baseline gap-4 min-w-0"><span className={`${mut} whitespace-nowrap shrink-0`}>{n}</span><span className="text-right min-w-0 [overflow-wrap:anywhere]">{v}</span></div>
              ))}
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <div className={`${mut} text-[12px]`}>รายการ</div>
              {items.map(([n, v]) => (
                <div key={n} className="flex justify-between items-baseline gap-4 min-w-0"><span className="min-w-0 [overflow-wrap:anywhere]">{n}</span><span className="whitespace-nowrap shrink-0 text-right">{baht(v)}</span></div>
              ))}
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <div className={`${mut} text-[12px]`}>สิ่งที่ได้</div>
              <ul className="m-0 pl-4 flex flex-col gap-1 list-disc">{perks.map((t) => <li key={t} className="[overflow-wrap:anywhere]">{t}</li>)}</ul>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <div className={`${mut} text-[12px]`}>เงินประกัน</div>
              <div className="[overflow-wrap:anywhere]">{GUARANTEE_REFUND_NOTE}</div>
            </div>
            <div className="flex justify-between items-baseline gap-4 border-t border-[rgba(240,200,90,.38)] pt-4">
              <span className="whitespace-nowrap">ยอดชำระ</span>
              <span className="text-[24px] text-[#f0c75a] whitespace-nowrap" style={H}>{baht(pkg.price)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[16px] bg-[#241717] border border-[rgba(245,210,110,.85)] p-4 flex flex-col items-center gap-3 w-full min-w-0">
              {method === "qr" ? (
                <>
                  <div className="flex justify-between gap-2 flex-wrap w-full text-[12px]">
                    <span className="text-[#ffd76a] font-semibold">PromptPay</span>
                    <span className={mut}>QR หมดอายุใน <b className="text-[14px]" style={{ ...H, color: sec < 120 ? "#ef6b7b" : "#ffd76a" }}>{mm}:{ss}</b></span>
                  </div>
                  <div className="self-center p-3 bg-white rounded-[12px] leading-[0]" style={{ opacity: expired ? 0.2 : 1 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${pkg.price} บาท`} width={175} height={175} className="w-[175px] h-[175px]" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : BANK.qrImage ? <img src={BANK.qrImage} alt="QR ชำระเงิน" width={175} height={175} className="w-[175px] h-[175px]" />
                      : <div className="w-[175px] h-[175px] grid place-items-center text-[12px] leading-normal text-[#7d6d6a]">กำลังสร้าง QR…</div>}
                  </div>
                  <div className={`${mut} text-[12px] text-center [overflow-wrap:anywhere]`}>{BANK.accountName} · บัญชีรับเงิน {BANK.accountNo}</div>
                  {expired && <button type="button" onClick={() => setSec(QR_TTL)} className="h-12 w-full rounded-[14px] border border-[rgba(240,200,90,.38)] bg-[#241717] text-[#ffd76a] text-[14px] font-semibold">สร้าง QR ใหม่</button>}
                </>
              ) : (
                <div className="w-full flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between gap-3"><span className={mut}>ธนาคาร</span><span className="text-right">{BANK.bank}</span></div>
                  <div className="flex justify-between gap-3"><span className={mut}>ชื่อบัญชี</span><span className="text-right">{BANK.accountName}</span></div>
                  <div className="flex justify-between gap-3"><span className={mut}>เลขที่บัญชี</span><span className="text-right text-[16px]" style={H}>{BANK.accountNo}</span></div>
                </div>
              )}
            </div>

            <div>
              <p className="text-[12px] text-[#cdbfb3] mb-[6px]">อัปโหลดสลิปการโอน</p>
              <label className="w-full min-h-[88px] rounded-[16px] border-[1.5px] border-dashed bg-[#241717] flex items-center justify-center gap-[10px] text-[13px] cursor-pointer px-3 text-center"
                style={{ borderColor: slipErr ? "#ef6b7b" : slip ? "#4cc283" : LINE, color: slip ? "#7fd6a3" : "#cdbfb3" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></svg>
                <span className="min-w-0 [overflow-wrap:anywhere]">{slip ? `${slipName || "slip.jpg"} · แตะเพื่อเปลี่ยน` : "แตะเพื่อเลือกรูปสลิป (JPG/PNG)"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { onSlip(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {slipErr && <p role="alert" className="text-[12.5px] text-[#ef6b7b] mt-2 leading-relaxed">{slipErr}</p>}
            </div>

            {!phoneOk && (
              <div>
                <p className="text-[12px] text-[#cdbfb3] mb-[6px]">ยืนยันเบอร์มือถือ (OTP) ก่อนส่ง</p>
                <OtpStep phone={f.tel} onPhone={setTel} verified={phoneOk} onVerified={() => setPhoneOk(true)}
                  inputCls="h-12 w-full min-w-0 rounded-[12px] border border-[rgba(240,200,90,.38)] bg-[#21191a] px-[14px] text-[14px] text-[#f6efe4]" />
              </div>
            )}

            {err && <p role="alert" className="text-[12.5px] text-[#ef6b7b]">{err}</p>}
            <Turnstile key={tsKey} onToken={setTs} className="flex justify-center" />

            <button type="button" onClick={submit} disabled={busy}
              className="btn-red-lux h-[52px] w-full rounded-[14px] border border-[rgba(245,210,110,.85)] text-white text-[15px] shadow-[0_8px_24px_rgba(255,40,70,.45)]"
              style={{ ...H, background: "linear-gradient(100deg, #7e0a1e 0%, #c8102e 24%, #ff5068 50%, #c8102e 76%, #7e0a1e 100%)", opacity: canSubmit ? 1 : 0.45 }}>
              {busy ? "กำลังส่งสลิปเพื่อตรวจสอบ…" : "ส่งสลิปเพื่อตรวจสอบ"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
