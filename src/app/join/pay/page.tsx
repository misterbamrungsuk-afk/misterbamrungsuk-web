"use client";

// ชำระเงิน (บอร์ด JoinPay + ป๊อปอัป JoinPayDone) — ต่อจากใบสมัคร 2 ขั้น · QR พร้อมเพย์ฝังยอด + แนบสลิป → /api/join/register (Slip2Go)
// ต่างจากบอร์ด: หัวข้อย่อย "ขั้นสุดท้าย", ติ๊กยอมรับข้อกำหนด/PDPA ก่อนส่ง (ต้องมีก่อนเก็บข้อมูล), ป๊อปอัปพาไปยืนยันตัวตน
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { BANK, PACKAGES } from "@/lib/join/config";
import { FORM_KEY, dataUrlToFile, resizeImage, type JoinForm } from "@/lib/join/form";
import { promptPayPayload } from "@/lib/join/promptpay";
import { Turnstile } from "@/components/turnstile";
import { BrandHeader } from "@/components/mb/ui";

const GOLD = "#e8c472";
const QR_TTL = 900;
const box: CSSProperties = { padding: 20, borderRadius: 16, minWidth: 0, overflowWrap: "anywhere" };
const cta = "min-h-14 w-full rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] grid place-items-center text-center px-4";
const ghost = "min-h-12 w-full rounded-[14px] text-[#e8c472] text-[15px] font-semibold grid place-items-center";
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

export default function PayPage() {
  const router = useRouter();
  const [f, setF] = useState<JoinForm | null>(null);
  const [qr, setQr] = useState("");
  const [sec, setSec] = useState(QR_TTL);
  const [slip, setSlip] = useState("");
  const [slipName, setSlipName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [done, setDone] = useState("");

  useEffect(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(FORM_KEY) || "null") as JoinForm | null;
      if (!parsed?.package) return router.replace("/join");
      if (!parsed.ack_hours || !parsed.ack_no_refuse || !parsed.areas?.length) return router.replace(`/join/apply?pkg=${parsed.package}`);
      setF(parsed);
      setAgree(!!(parsed.accept_terms && parsed.consent_pdpa));
    } catch { router.replace("/join"); }
  }, [router]);

  useEffect(() => {
    if (!f?.package) return;
    const payload = promptPayPayload(BANK.promptPayId, PACKAGES[f.package].price);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [f?.package, sec === QR_TTL]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sec <= 0 || done) return;
    const t = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sec, done]);

  if (!f || !f.package) return <main className="mb-v7 min-h-dvh grid place-items-center text-[#d9c9b4]">กำลังโหลด…</main>;
  const k = f.package;
  const pkg = PACKAGES[k];

  const onSlip = async (file?: File) => {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    setSlip(await resizeImage(file, 1400, 0.85));
    setSlipName(file.name);
  };

  const submit = async () => {
    if (!slip) return setErr("แนบสลิปการโอนก่อน");
    if (!agree) return setErr("ติ๊กยอมรับข้อกำหนดและยินยอมตาม PDPA ก่อนส่ง");
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      const put = (key: string, v: string) => fd.append(key, v);
      put("package", k); put("first_name", f.first_name); put("last_name", f.last_name); put("nickname", f.nickname);
      put("birthdate", f.birthdate); put("tel", f.tel); put("line_id", f.line_id); put("address", f.address);
      put("no_area", f.no_area); put("experience", f.experience); put("intro", f.intro); put("hours_band", f.hours_band);
      f.areas.forEach((x) => put("areas", x)); f.week_days.forEach((x) => put("week_days", x)); f.periods.forEach((x) => put("periods", x));
      put("massage_cert", k === "B" ? (f.cert_doc ? "yes" : "no") : "");
      put("ack_hours", String(f.ack_hours)); put("ack_no_refuse", String(f.ack_no_refuse));
      put("accept_terms", "true"); put("consent_pdpa", "true"); put("turnstile", ts);
      fd.append("photo", await dataUrlToFile(f.photo, "photo.jpg"));
      fd.append("other_doc", await dataUrlToFile(f.other_doc, "body.jpg"));
      if (k === "B" && f.cert_doc) fd.append("cert_doc", await dataUrlToFile(f.cert_doc, "cert.jpg"));
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch("/api/join/register", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; mb_code?: string; error?: string; fields?: string[]; needOtp?: boolean };
      if (!res.ok || !data.ok || !data.mb_code) {
        const msg = data.error || "ส่งข้อมูลไม่สำเร็จ";
        if (data.fields?.includes("slip")) { setSlip(""); setSlipName(""); setErr(msg); }
        else if (data.needOtp) setErr(`${msg} — กลับไปยืนยันเบอร์ในใบสมัคร`);
        else setErr(data.fields?.length ? `${msg} — กลับไปแก้ในใบสมัคร` : msg);
        throw null;
      }
      sessionStorage.removeItem(FORM_KEY);
      setDone(data.mb_code);
    } catch (e) {
      if (e) setErr((e as Error).message || "ส่งข้อมูลไม่สำเร็จ");
      setTs(""); setTsKey((n) => n + 1);
    } finally { setBusy(false); }
  };

  const lastInitial = f.last_name.trim() ? ` ${f.last_name.trim()[0]}.` : "";
  const summary: [string, string][] = [["ผู้สมัคร", `นาย${f.first_name}${lastInitial}${f.nickname ? ` (${f.nickname})` : ""}`], ["กลุ่มอบรม", "กลุ่ม 1 · ภายใน 20 พ.ย."]];
  const items: [string, number][] = k === "A" ? [["ค่าอบรม", pkg.training], ["ค่าการันตี Branding", pkg.guarantee]] : [["ค่าอบรม (รับ Uniform + Oil นวด ฟรี)", pkg.training], ["ค่าการันตี Branding", pkg.guarantee]];
  const perks = k === "A" ? ["อบรมบุคลิกภาพ มารยาท การดูแลลูกค้า"] : ["อบรมบุคลิกภาพ + มาตรฐานการนวด", "Uniform + Oil นวด 1 ชุด ฟรี"];
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  const expired = sec === 0;
  const ready = !!slip && agree && !busy;

  return (
    <div className="mb-v7 min-h-dvh relative" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.7 }}>
      <BrandHeader tone="bar" href="/work-with-us" />
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="flex items-center gap-3" style={{ padding: "20px 20px 10px" }}>
          <Link href={`/join/apply?pkg=${k}&step=2`} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full bg-[#251d1b] text-[#f3ead9] grid place-items-center hover:text-[#f3ead9]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0"><div className="text-[13px] text-[#e8c472] font-light">ขั้นสุดท้าย</div><div className="font-semibold text-[20px] leading-[1.35]">ชำระเงิน</div></div>
        </div>

        <div className="grid min-w-0 md:grid-cols-2 md:items-start" style={{ padding: "24px 20px 40px", gap: 31 }}>
          <div className="flex flex-col min-w-0" style={{ gap: 31 }}>
            <div className="flex flex-col bg-[#251d1b]" style={{ ...box, gap: 13 }}>
              {summary.map(([n, v]) => <div key={n} className="flex justify-between gap-4 min-w-0"><span className="whitespace-nowrap shrink-0">{n}</span><span className="text-right min-w-0">{v}</span></div>)}
              <div style={{ height: 1, background: "rgba(243,234,217,0.07)", margin: "4px 0" }} />
              {items.map(([n, v]) => <div key={n} className="flex justify-between items-baseline gap-4 min-w-0"><span className="min-w-0">{n}</span><span className="whitespace-nowrap shrink-0 font-semibold text-[18px] text-[#e8c472]">{baht(v)}</span></div>)}
              <div className="text-[13px] font-light">ค่าการันตี Branding รับคืนเมื่อครบ 1 ปี ถ้าไม่ทำผิดกฎบริษัทและกฎหมาย (เช่น ไม่ปฏิเสธการรับลูกค้า)</div>
            </div>
            <div className="flex flex-col gap-2 bg-[#2c1a1f]" style={box}>
              <div className="font-semibold text-[17px]">สิ่งที่ได้</div>
              {perks.map((t) => <div key={t} className="flex gap-[10px]"><span className="text-[#e8c472]">✓</span><span>{t}</span></div>)}
            </div>
          </div>

          <div className="flex flex-col min-w-0" style={{ gap: 26 }}>
            <div className="flex flex-col items-center gap-3 bg-[#272013]" style={box}>
              <div className="flex justify-between gap-2 flex-wrap w-full text-[14px]"><span className="text-[#e8c472] font-semibold">PromptPay</span><span>QR หมดอายุใน <b style={{ color: sec < 120 ? "#ff8a9a" : GOLD }}>{mm}:{ss}</b></span></div>
              <div className="rounded-xl" style={{ padding: 12, background: "#000", lineHeight: 0, opacity: expired ? 0.2 : 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${baht(pkg.price)}`} width={175} height={175} className="w-[175px] h-[175px] block bg-white" /> : <div className="w-[175px] h-[175px] bg-white" />}
              </div>
              <div className="text-[13px] text-center font-light">{BANK.accountName} · {BANK.accountNo}</div>
              {expired && <button type="button" onClick={() => setSec(QR_TTL)} className={ghost} style={{ background: "rgba(232,196,114,0.16)" }}>สร้าง QR ใหม่</button>}
            </div>
            <div>
              <span style={{ display: "block", fontSize: 13, marginBottom: 6 }}>อัปโหลดสลิปการโอน</span>
              <label className="w-full rounded-2xl flex items-center justify-center gap-[10px] text-[14px] cursor-pointer text-center px-3" style={{ minHeight: 88, background: "rgba(232,196,114,0.16)", color: slip ? "#b5a596" : "#f3ead9" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></svg>
                {slip ? `${slipName || "slip.jpg"} · แตะเพื่อเปลี่ยน` : "แตะเพื่อเลือกรูปสลิป (JPG/PNG)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
              </label>
            </div>
            <button type="button" role="checkbox" aria-checked={agree} onClick={() => setAgree(!agree)} className="flex gap-3 items-start text-left bg-transparent text-[14px] leading-[1.6] text-[#f3ead9]">
              <span className="shrink-0 grid place-items-center rounded-md font-bold text-[13px] text-[#1b130b]" style={{ width: 22, height: 22, marginTop: 2, background: agree ? GOLD : "transparent", boxShadow: agree ? "none" : "inset 0 0 0 1.5px rgba(232,196,114,0.6)" }}>{agree ? "✓" : ""}</span>
              <span>ยอมรับ<a href="/join/terms" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#e8c472]">ข้อกำหนด</a> และยินยอมให้เก็บข้อมูลตาม<a href="/join/privacy" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#e8c472]"> PDPA</a></span>
            </button>
            <Turnstile key={tsKey} onToken={setTs} />
            {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
            <button type="button" onClick={submit} disabled={busy} aria-busy={busy} className={cta} style={{ opacity: ready ? 1 : 0.45 }}>{busy ? "กำลังส่งสลิปเพื่อตรวจสอบ…" : "ส่งสลิปเพื่อตรวจสอบ"}</button>
          </div>
        </div>
      </div>

      {done && (
        <div role="dialog" aria-modal="true" aria-labelledby="paidT" className="fixed inset-0 z-50 flex justify-center items-center" style={{ background: "rgba(10,7,6,0.78)", padding: 20 }}>
          <div className="w-full max-w-[400px] rounded-[20px] bg-[#1b2322] flex flex-col items-center gap-[14px] text-center" style={{ padding: "28px 20px 20px" }}>
            <div className="w-[72px] h-[72px] rounded-full bg-[#e8c472] text-[#1b130b] grid place-items-center"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
            <div id="paidT" className="font-semibold text-[22px] leading-[1.35] text-[#e8c472]">ชำระเงินเรียบร้อย</div>
            <p className="m-0 text-[15px] leading-[1.7]">ได้รับสลิปแล้ว ทีมงานตรวจภายใน 2 ชม. (09:00–22:00)<br />ระหว่างนี้ยืนยันตัวตนต่อได้เลย · รหัสสมัคร {done}</p>
            <Link href={`/join/kyc/${done}`} className={cta + " hover:text-[#1b130b]"}>ถัดไป · ยืนยันตัวตน</Link>
          </div>
        </div>
      )}
    </div>
  );
}
