"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { BANK, PACKAGES, feeBreakdown } from "@/lib/join/config";
import { FILE_FIELDS, FORM_KEY, dataUrlToFile, resizeImage, type JoinForm } from "@/lib/join/form";
import { promptPayPayload } from "@/lib/join/promptpay";
import QRCode from "qrcode";
import { Turnstile } from "@/components/turnstile";
import { OtpStep } from "@/components/otp-step";

export default function PayPage() {
  const router = useRouter();
  const [f, setF] = useState<JoinForm | null>(null);
  // มีหมายเลขพร้อมเพย์ (หรือรูป QR) → เริ่มที่สแกน QR; ไม่มี → โอนผ่านบัญชีอย่างเดียว
  const hasQr = !!BANK.qrImage || !!promptPayPayload(BANK.promptPayId, 1);
  const [method, setMethod] = useState<"qr" | "transfer">(hasQr ? "qr" : "transfer");
  const [qr, setQr] = useState("");
  const [slip, setSlip] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [phoneOk, setPhoneOk] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      const parsed = saved ? (JSON.parse(saved) as JoinForm) : null;
      if (!parsed?.package || !parsed.accept_terms || !parsed.consent_pdpa) return router.replace("/join#register");
      setF(parsed);
    } catch {
      router.replace("/join#register");
    }
  }, [router]);

  // ยืนยันเบอร์ไว้แล้วใน 30 นาทีนี้ (cookie) และเบอร์ตรงกับใบสมัคร → ไม่ต้องขอ OTP ซ้ำ
  useEffect(() => {
    if (!f?.tel) return;
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { phone?: string | null }) => {
      if (d.phone && d.phone === f.tel.replace(/\D/g, "")) setPhoneOk(true);
    }).catch(() => {});
  }, [f?.tel]);

  const setTel = (tel: string) => {
    if (!f) return;
    const next = { ...f, tel };
    setF(next);
    setPhoneOk(false);
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(next)); } catch {}
  };

  useEffect(() => {
    if (!f?.package) return;
    const payload = promptPayPayload(BANK.promptPayId, PACKAGES[f.package].price);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [f]);

  if (!f || !f.package) return <main className="min-h-dvh grid place-items-center text-ink-300">กำลังโหลด…</main>;
  const pkg = PACKAGES[f.package];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BANK.accountNo.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const onSlip = async (file?: File) => {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    setSlip(await resizeImage(file, 1400, 0.85));
  };

  const submit = async () => {
    if (!phoneOk) return setErr("ยืนยันเบอร์โทรด้วยรหัส OTP ก่อน");
    if (!slip) return setErr("แนบสลิปการโอนก่อน");
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      const { skills, activities, talents, avail_slots, accept_terms, consent_pdpa, consent_marketing, photo, id_card, bankbook, other_doc, cert_doc, ...rest } = f;
      Object.entries(rest).forEach(([k, v]) => fd.append(k, String(v)));
      skills.forEach((s) => fd.append("skills", s));
      (activities ?? []).forEach((s) => fd.append("activities", s));
      (talents ?? []).forEach((s) => fd.append("talents", s));
      (avail_slots ?? []).forEach((s) => fd.append("avail_slots", s));
      fd.append("accept_terms", String(accept_terms));
      fd.append("consent_pdpa", String(consent_pdpa));
      fd.append("consent_marketing", String(consent_marketing));
      fd.append("payment_method", method);
      fd.append("turnstile", ts);
      const files = { photo, id_card, bankbook, other_doc, cert_doc };
      for (const k of FILE_FIELDS) if (files[k]) fd.append(k, await dataUrlToFile(files[k], `${k}.jpg`));
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch("/api/join/register", { method: "POST", body: fd });
      const data = await res.json();
      if (data.needOtp) setPhoneOk(false);
      if (!res.ok || !data.ok) throw new Error(data.error || "ส่งข้อมูลไม่สำเร็จ");
      sessionStorage.removeItem(FORM_KEY);
      router.replace(`/join/done/${data.mb_code}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      setTs(""); setTsKey((k) => k + 1);
    }
  };

  return (
    <div className="phone-stage"><main className="phone px-5 pb-10">
      <header className="flex items-center gap-3 h-16">
        <Link href="/join#register" aria-label="ย้อนกลับ" className="w-10 h-10 rounded-full border border-ink-600 grid place-items-center text-xl">‹</Link>
        <Logo size={26} />
        <span className="ml-auto text-xs text-ink-300">ขั้นตอน 2/3</span>
      </header>

      <h1 className="font-display text-2xl font-semibold mt-2">ชำระเงินประกัน + ค่าอบรม</h1>

      <section className="glass rounded-3xl p-5 mt-5">
        <div className="flex justify-between text-sm"><span className="text-ink-300">ผู้สมัคร</span><span className="truncate ml-3">{f.title}{f.first_name} {f.last_name} ({f.nickname})</span></div>
        <div className="flex justify-between text-sm mt-2"><span className="text-ink-300">แพ็กเกจ {f.package}</span><span>{pkg.name}</span></div>
        <div className="mt-3 rounded-2xl bg-ink-900/60 px-4 py-3 text-[13px] space-y-1.5">
          {feeBreakdown(f.package).map((x) => <div key={x.name} className="flex justify-between gap-3"><span className="text-ink-300">{x.name}</span><span className="font-display text-gold-300">฿{x.amount.toLocaleString("th-TH")}</span></div>)}
          <p className="text-[11.5px] text-ink-400 pt-1">ฟรีค่าสมาชิก 6 เดือนแรก · หลังจากนั้น ฿{pkg.membershipAfter.toLocaleString("th-TH")} / 6 เดือน</p>
        </div>
        <div className="flex justify-between items-baseline border-t border-ink-600 mt-4 pt-4">
          <span className="font-medium">ยอดชำระรวม</span>
          <span className="font-display text-3xl font-bold text-gold-300">฿{pkg.price.toLocaleString("th-TH")}</span>
        </div>
      </section>

      <div className={`grid gap-2 mt-5 ${hasQr ? "grid-cols-2" : "grid-cols-1"}`} role="radiogroup" aria-label="ช่องทางชำระ">
        {(hasQr ? ([["qr", "สแกน QR Code"], ["transfer", "โอนผ่านบัญชี"]] as const) : ([["transfer", "โอนผ่านบัญชี"]] as const)).map(([k, l]) => (
          <button key={k} role="radio" aria-checked={method === k} onClick={() => setMethod(k)}
            className={`min-h-12 rounded-full border text-sm font-medium ${method === k ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600"}`}>{l}</button>
        ))}
      </div>

      <section className="glass rounded-3xl p-5 mt-3">
        {method === "qr" ? (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[280px] rounded-3xl bg-white overflow-hidden text-[#1a1206] shadow-[0_10px_40px_rgba(0,0,0,.4)]">
              <div className="bg-[#113566] text-white text-center py-2.5 text-[13px] font-semibold tracking-wide">THAI QR PAYMENT · พร้อมเพย์</div>
              <div className="p-4 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${pkg.price} บาท`} className="w-full aspect-square" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : BANK.qrImage ? <img src={BANK.qrImage} alt="QR ชำระเงิน" className="w-full aspect-square" />
                  : <div className="w-full aspect-square grid place-items-center text-sm text-ink-400">กำลังสร้าง QR…</div>}
                <p className="text-[13px] mt-2 font-medium">{BANK.accountName}</p>
                <p className="font-display text-2xl font-bold mt-1">฿{pkg.price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <p className="text-[13px] text-ink-300 mt-3 text-center leading-relaxed">สแกนด้วยแอปธนาคารใดก็ได้ ยอดเงินขึ้นให้อัตโนมัติ<br />ตรวจชื่อผู้รับให้ตรงก่อนกดยืนยัน แล้วแคปสลิปมาแนบด้านล่าง</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-ink-300">ธนาคาร</span><span className="text-right">{BANK.bank}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-300">ชื่อบัญชี</span><span className="text-right">{BANK.accountName}</span></div>
            <div className="flex items-center justify-between gap-3 mt-2 rounded-2xl bg-ink-900/60 px-4 py-3">
              <span className="font-display text-xl tracking-wider">{BANK.accountNo}</span>
              <button onClick={copy} className="btn-ghost h-10 px-4 text-sm shrink-0">{copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}</button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-5">
        <p className="text-sm text-ink-300 mb-2">แนบหลักฐานการโอนเงิน (สลิป)</p>
        <label className="flex items-center gap-4 rounded-3xl border border-dashed border-ink-500 p-4 cursor-pointer hover:border-gold-500">
          {slip
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={slip} alt="สลิปที่แนบ" className="w-24 h-32 rounded-xl object-cover" />
            : <span className="w-24 h-32 rounded-xl bg-ink-800 grid place-items-center text-ink-400 text-3xl">+</span>}
          <span className="text-sm text-ink-300">{slip ? "แตะเพื่อเปลี่ยนสลิป" : "แตะเพื่อเลือกรูปสลิป"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
        </label>
      </section>

      <section className="mt-5">
        <p className="text-sm text-ink-300 mb-2">ยืนยันเบอร์มือถือ (OTP) ก่อนส่งใบสมัคร</p>
        <OtpStep phone={f.tel} onPhone={setTel} verified={phoneOk} onVerified={() => setPhoneOk(true)}
          inputCls="h-12 w-full min-w-0 rounded-2xl border border-ink-600 bg-ink-900/60 px-4 text-[15px]" />
      </section>

      {err && <p role="alert" className="text-sm text-crimson-300 mt-4">{err}</p>}

      <Turnstile key={tsKey} onToken={setTs} className="mt-5 flex justify-center" />
      <button onClick={submit} disabled={busy || !phoneOk} className="btn-crimson w-full h-14 mt-6 font-display font-semibold text-lg">
        {busy ? "กำลังส่งข้อมูล…" : "ยืนยันการชำระเงิน"}
      </button>
      <p className="text-xs text-ink-400 text-center mt-3">ทีมงานตรวจสลิปภายใน 24 ชม. และแจ้งผลทาง LINE</p>
    </main></div>
  );
}
