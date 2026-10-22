"use client";

// ชำระเงิน "ก่อนกรอกใบสมัคร" (บอร์ด JoinPay + ป๊อปอัป JoinPayDone) — ขั้นแรกหลังหน้า Join ตามลำดับบน canvas
// ระบบต้องรู้ว่าใครจ่าย → กล่องชื่อ + เบอร์ (OTP) เหนือสรุปยอด และติ๊กยอมรับข้อกำหนด/PDPA ก่อนส่ง (ต้องมีก่อนเก็บข้อมูล)
// ส่งสลิป → /api/join/register (Slip2Go) → ได้รหัส MB → ป๊อปอัป → โปรไฟล์ของฉัน (/join/profile/[mb])
import { Suspense, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { BankTransfer } from "@/components/bank-transfer";
import { BANK, FEE_INCLUDES, FEE_NOTE, PACKAGES, type PackageKey } from "@/lib/join/config";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";
import { promptPayPayload } from "@/lib/join/promptpay";
import { Turnstile } from "@/components/turnstile";
import { OtpStep } from "@/components/otp-step";
import { BrandHeader } from "@/components/mb/ui";
import { SaveLink } from "@/components/save-link";

const GOLD = "#e8c472";
const QR_TTL = 900;
const PKG_KEY = "mb_join_pkg";
const GRP_KEY = "mb_join_group";
const INV_KEY = "mb_join_invite";
const box: CSSProperties = { padding: 20, borderRadius: 16, minWidth: 0, overflowWrap: "anywhere" };
const cta = "min-h-14 w-full rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] grid place-items-center text-center px-4";
const ghost = "min-h-12 w-full rounded-[14px] text-[#e8c472] text-[15px] font-semibold grid place-items-center";
const inCls = "w-full min-h-12 rounded-xl bg-[#211a18] text-[#f3ead9] px-[14px] text-[15px] placeholder:text-[#b5a596] outline-none border border-transparent focus:border-[#e8c472]";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

function PayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [k, setK] = useState<PackageKey | null>(null);
  const [who, setWho] = useState({ first_name: "", last_name: "", nickname: "", tel: "", email: "" });
  const [phoneOk, setPhoneOk] = useState(false);
  const [otpOff, setOtpOff] = useState(false);
  const [qr, setQr] = useState("");
  const [sec, setSec] = useState(QR_TTL);
  const [slip, setSlip] = useState("");
  const [slipName, setSlipName] = useState("");
  // แบบคำขอความยินยอม (ผู้สมัคร): ข้อกำหนด · เก็บ/ใช้ข้อมูลตามวัตถุประสงค์ · ตรวจประวัติอาชญากรรม+ผลตรวจสุขภาพ (ม.26 แยกติ๊ก)
  const [ticks, setTicks] = useState([false, false, false]);
  const agree = ticks.every(Boolean);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [done, setDone] = useState("");
  const [link, setLink] = useState("");
  const [pw, setPw] = useState({ a: "", b: "" });
  const [showPw, setShowPw] = useState(false);
  const [loginHint, setLoginHint] = useState(false);
  // ลิงก์เชิญ: null = สมัครปกติ · "…" = รหัสที่ตรวจแล้วใช้ได้ · inviteErr = ลิงก์ใช้ไม่ได้
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState("");
  const [secretInv, setSecretInv] = useState(false); // ลิงก์เชิญ Secret
  const invTier = secretInv ? "Secret" : "TOP";
  const [tom, setTom] = useState(false);
  // สมัครฟรี (ไม่มี QR/สลิป): ลิงก์เชิญพิเศษ หรือหมวดทอมหล่อ
  const free = !!invite || tom;
  // กำลังตรวจรหัสเชิญ → ยังไม่แสดง QR (กันสายเชิญฟรีเห็น QR แวบหนึ่ง)
  const [invChecking, setInvChecking] = useState(true);

  useEffect(() => {
    // หมวดทอมหล่อ (?g=tom จากหน้า /join/tom) — จำไว้เผื่อรีเฟรช
    let grp = params.get("g");
    try { if (grp === "tom") sessionStorage.setItem(GRP_KEY, grp); else if (params.get("pkg")) sessionStorage.removeItem(GRP_KEY); else grp = sessionStorage.getItem(GRP_KEY); } catch {}
    setTom(grp === "tom");
    const q = params.get("pkg");
    let pkg: string | null = q;
    try { if (q === "A" || q === "B") sessionStorage.setItem(PKG_KEY, q); else pkg = sessionStorage.getItem(PKG_KEY); } catch {}
    // ทอมหล่อมีสายเดียว: เพื่อนกินเที่ยว (มีความสามารถในการนวด) = B
    let code = (params.get("invite") ?? "").toUpperCase();
    try { if (code) sessionStorage.setItem(INV_KEY, code); else code = sessionStorage.getItem(INV_KEY) ?? ""; } catch {}
    // ลิงก์เชิญ (TOP / Secret) ก็สาย B เหมือนทอมหล่อ
    if (grp === "tom" || code) setK("B"); else if (pkg === "A" || pkg === "B") setK(pkg); else router.replace("/join");
    if (!code) setInvChecking(false);
    if (code) fetch(`/api/join/invite?code=${encodeURIComponent(code)}`, { cache: "no-store" }).then((r) => r.json()).then((d: { ok?: boolean; state?: string; secret?: boolean }) => {
      if (d.ok) { setInvite(code); setSecretInv(!!d.secret); }
      else { if (grp !== "tom" && (pkg === "A" || pkg === "B")) setK(pkg); setInviteErr(d.state === "full" ? "ลิงก์เชิญนี้มีผู้ใช้ครบจำนวนแล้ว" : d.state === "expired" ? "ลิงก์เชิญนี้หมดอายุแล้ว" : "ลิงก์เชิญนี้ใช้ไม่ได้"); try { sessionStorage.removeItem(INV_KEY); } catch {} }
    }).catch(() => {}).finally(() => setInvChecking(false));
  }, [params, router]);

  useEffect(() => {
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { phone?: string | null; required?: boolean }) => {
      if (d.required === false) { setOtpOff(true); setPhoneOk(true); }
    }).catch(() => {});
  }, []);

  // เบอร์นี้ยืนยัน OTP ไว้แล้ว (cookie 30 นาที) → ไม่ต้องขอซ้ำ
  useEffect(() => {
    if (!/^0\d{9}$/.test(who.tel)) return;
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { phone?: string | null }) => { if (d.phone === who.tel) setPhoneOk(true); }).catch(() => {});
  }, [who.tel]);

  useEffect(() => {
    if (!k) return;
    const payload = promptPayPayload(BANK.promptPayId, PACKAGES[k].price);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [k, invite, sec === QR_TTL]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sec <= 0 || done) return;
    const t = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sec, done]);

  if (!k) return <main className="mb-v7 min-h-dvh grid place-items-center text-[#d9c9b4]">กำลังโหลด…</main>;
  const pkg = PACKAGES[k];
  const amount = pkg.price;
  const setW = (key: keyof typeof who, v: string) => { setWho((w) => ({ ...w, [key]: v })); setErr(""); };

  const onSlip = async (file?: File) => {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    try { setSlip(await resizeImage(file, 1400, 0.85)); setSlipName(file.name); } catch (e) { setErr((e instanceof Error ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง")); }
  };

  const submit = async () => {
    if (!who.first_name.trim() || !who.last_name.trim() || !who.nickname.trim()) return setErr("กรอกชื่อ นามสกุล และชื่อเล่นของผู้สมัคร");
    if (!/^0\d{9}$/.test(who.tel)) return setErr("เบอร์โทร 10 หลัก ขึ้นต้นด้วย 0");
    if (!EMAIL_RE.test(who.email.trim())) return setErr("กรอกอีเมลให้ถูกต้อง เช่น name@gmail.com · ใช้รับลิงก์เข้าโปรไฟล์และใบเสร็จ");
    if (pw.a.length < 8) return setErr("ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (pw.a !== pw.b) return setErr("ยืนยันรหัสผ่านไม่ตรงกัน · พิมพ์ให้เหมือนกันทั้ง 2 ช่อง");
    if (!phoneOk) return setErr("ยืนยันเบอร์โทรด้วยรหัส OTP ก่อน");
    if (!slip && !free) return setErr("แนบสลิปการโอนก่อน");
    if (!agree) return setErr("ติ๊กยอมรับและให้ความยินยอมให้ครบทั้ง 3 ข้อก่อนส่ง");
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("package", k); if (tom) fd.append("group", "tom"); fd.append("first_name", who.first_name.trim()); fd.append("last_name", who.last_name.trim());
      fd.append("nickname", who.nickname.trim()); fd.append("tel", who.tel);
      fd.append("email", who.email.trim().toLowerCase()); fd.append("password", pw.a);
      fd.append("accept_terms", "true"); fd.append("consent_pdpa", "true"); fd.append("consent_criminal", "true"); fd.append("turnstile", ts);
      if (!free) fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      if (invite) fd.append("invite", invite);
      const res = await fetch("/api/join/register", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; mb_code?: string; link?: string; error?: string; fields?: string[]; needOtp?: boolean; login?: string };
      if (!res.ok || !data.ok || !data.mb_code) {
        if (data.needOtp) setPhoneOk(false);
        setLoginHint(!!data.login);
        if (data.fields?.includes("slip")) { setSlip(""); setSlipName(""); }
        setErr(data.error || "ส่งข้อมูลไม่สำเร็จ");
        throw null;
      }
      try { sessionStorage.removeItem(PKG_KEY); sessionStorage.removeItem(INV_KEY); sessionStorage.removeItem(GRP_KEY); } catch {}
      setLink(data.link ?? "");
      setDone(data.mb_code);
    } catch (e) {
      if (e) setErr((e as Error).message || "ส่งข้อมูลไม่สำเร็จ");
      setTs(""); setTsKey((n) => n + 1);
    } finally { setBusy(false); }
  };

  const lastInitial = who.last_name.trim() ? ` ${who.last_name.trim()[0]}.` : "";
  const summary: [string, string][] = [["ผู้สมัคร", who.first_name.trim() ? `${tom ? "" : "นาย"}${who.first_name.trim()}${lastInitial}${who.nickname.trim() ? ` (${who.nickname.trim()})` : ""}` : "—"], ["กลุ่มอบรม", "ภายใน 20 พ.ย."]];
  // ลิงก์เชิญพิเศษ: ไม่ต้องจ่าย · ได้ระดับ TOP
  const items: [string, number][] = [["ค่าสมัคร (รวมค่าอบรม)", free ? 0 : amount]];
  const perks = FEE_INCLUDES(k);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  const expired = sec === 0;
  const ready = (!!slip || free) && agree && phoneOk && EMAIL_RE.test(who.email.trim()) && pw.a.length >= 8 && pw.a === pw.b && !busy;

  return (
    <div className="mb-v7 min-h-dvh relative" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.7 }}>
      <BrandHeader tone="bar" small />
      <div className="mb-panel mx-auto w-full max-w-[1000px]">
        <div className="flex items-center gap-3" style={{ padding: "20px 20px 10px" }}>
          <Link href={invite ? `/join/i/${invite}` : tom ? "/join/tom" : "/join"} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full bg-[#251d1b] text-[#f3ead9] grid place-items-center hover:text-[#f3ead9]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0"><div className="text-[13px] text-[#e8c472] font-light">{invite ? (secretInv ? "✦ คำเชิญพิเศษ · Secret" : "✦ คำเชิญพิเศษ") : tom ? "ทอมหล่อ · ก่อนกรอกใบสมัคร" : "ก่อนกรอกใบสมัคร"}</div><div className="font-semibold text-[20px] leading-[1.35]">{invite ? "สมัครด้วยคำเชิญ" : tom ? "สมัครทอมหล่อ" : "ชำระค่าสมัคร"}</div></div>
        </div>

        {inviteErr && <p role="alert" className="m-0 mx-5 mt-2 rounded-xl text-[13.5px] text-[#ff8a9a]" style={{ padding: "10px 14px", background: "rgba(255,138,154,0.1)" }}>{inviteErr} · ยอดด้านล่างเป็นราคาสมัครปกติ</p>}
        <div className="grid min-w-0 md:grid-cols-2 md:items-start" style={{ padding: "24px 20px 40px", gap: 31 }}>
          <div className="flex flex-col min-w-0" style={{ gap: 31 }}>
            <div className="flex flex-col gap-3 bg-[#251d1b]" style={box}>
              <div className="font-semibold text-[17px]">ผู้สมัคร</div>
              <div className="grid grid-cols-2 gap-[10px]">
                <input className={inCls} autoComplete="given-name" placeholder="ชื่อจริง" aria-label="ชื่อจริง" value={who.first_name} onChange={(e) => setW("first_name", e.target.value)} />
                <input className={inCls} autoComplete="family-name" placeholder="นามสกุล" aria-label="นามสกุล" value={who.last_name} onChange={(e) => setW("last_name", e.target.value)} />
              </div>
              <input className={inCls} placeholder="ชื่อเล่น" aria-label="ชื่อเล่น" value={who.nickname} onChange={(e) => setW("nickname", e.target.value)} />
              {otpOff
                ? <input className={inCls} inputMode="tel" autoComplete="tel" placeholder="เบอร์มือถือ 08x-xxx-xxxx" aria-label="เบอร์โทรศัพท์" value={who.tel} onChange={(e) => setW("tel", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                : <OtpStep phone={who.tel} onPhone={(v) => { setW("tel", v.replace(/\D/g, "").slice(0, 10)); setPhoneOk(false); }} verified={phoneOk} onVerified={() => { setPhoneOk(true); setErr(""); }} inputCls={inCls} />}
              {phoneOk && !otpOff && <div className="text-[13px] text-[#7fd6a3]">✓ ยืนยันเบอร์แล้ว</div>}
              <div className="flex flex-col gap-1">
                <input className={inCls} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} placeholder="อีเมล เช่น name@gmail.com" aria-label="อีเมล" aria-describedby="emailHelp" value={who.email} onChange={(e) => setW("email", e.target.value.replace(/\s/g, ""))} />
                <div id="emailHelp" className="text-[12.5px] font-light text-[#d9c9b4]">ใช้รับลิงก์เข้าโปรไฟล์และใบเสร็จ · เปิดโปรไฟล์จากเครื่องอื่นได้</div>
              </div>
              <div className="flex flex-col gap-[10px]">
                <div className="relative">
                  <input className={inCls + " pr-[76px]"} type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="ตั้งรหัสผ่าน (อย่างน้อย 8 ตัว)" aria-label="ตั้งรหัสผ่าน" value={pw.a} onChange={(e) => { setPw((x) => ({ ...x, a: e.target.value })); setErr(""); }} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} className="absolute right-1 top-1/2 -translate-y-1/2 min-h-10 px-3 rounded-lg text-[13px] text-[#e8c472]">{showPw ? "ซ่อน" : "แสดง"}</button>
                </div>
                <input className={inCls} type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="ยืนยันรหัสผ่านอีกครั้ง" aria-label="ยืนยันรหัสผ่าน" value={pw.b} onChange={(e) => { setPw((x) => ({ ...x, b: e.target.value })); setErr(""); }} />
                {pw.b && pw.a !== pw.b && <div className="text-[12.5px] text-[#ff8a9a]">รหัสผ่านยังไม่ตรงกัน</div>}
                <div className="text-[12.5px] font-light text-[#d9c9b4]">ใช้อีเมลกับรหัสผ่านนี้ เข้าสู่ระบบ Part-Time จากเครื่องไหนก็ได้</div>
              </div>
            </div>
            <div className="flex flex-col bg-[#251d1b]" style={{ ...box, gap: 13 }}>
              {summary.map(([n, v]) => <div key={n} className="flex justify-between gap-4 min-w-0"><span className="whitespace-nowrap shrink-0">{n}</span><span className="text-right min-w-0">{v}</span></div>)}
              <div style={{ height: 1, background: "rgba(243,234,217,0.07)", margin: "4px 0" }} />
              {items.map(([n, v]) => <div key={n} className="flex justify-between items-baseline gap-4 min-w-0"><span className="min-w-0">{n}</span><span className="whitespace-nowrap shrink-0 font-semibold text-[18px] text-[#e8c472]">{free ? "ฟรี" : baht(v)}</span></div>)}
              {items.length > 1 && <div className="flex justify-between items-baseline gap-4 min-w-0 pt-2 border-t border-[rgba(243,234,217,0.07)]"><span className="min-w-0 font-semibold">รวมที่ต้องโอน</span><span className="whitespace-nowrap shrink-0 font-bold text-[20px] text-[#e8c472]" data-total="1">{baht(amount)}</span></div>}
              <div className="text-[13px] font-light">{!invite && tom ? "ทอมหล่อ: ไม่ต้องชำระค่าสมัคร · หลังเริ่มงาน หักเงินประกันงานเคสละ ฿500 จากรายได้ (กันหนีงาน/เทงาน) · เงินแต่ละก้อนครบ 90 วันถอนคืนได้ (ค่าธรรมเนียมถอน 3%)" : invite ? `✦ คำเชิญพิเศษ: ไม่ต้องชำระค่าสมัคร · ได้ระดับ ${invTier} ทันที · หลังเริ่มงาน หักเงินประกันงานเคสละ ฿500 จากรายได้ (กันหนีงาน/เทงาน) · เงินแต่ละก้อนครบ 90 วันถอนคืนได้ (ค่าธรรมเนียมถอน 3%)` : FEE_NOTE}</div>
            </div>
            <div className="flex flex-col gap-2 bg-[#2c1a1f]" style={box}>
              <div className="font-semibold text-[17px]">ค่าสมัครรวม</div>
              {perks.map((t) => <div key={t} className="flex gap-[10px]"><span className="text-[#e8c472]">✓</span><span>{t}</span></div>)}
            </div>
          </div>

          <div className="flex flex-col min-w-0" style={{ gap: 26 }}>
            {!free && !invChecking && <>
            {!promptPayPayload(BANK.promptPayId, amount) ? <div className="flex flex-col items-center gap-3 bg-[#272013]" style={box}><BankTransfer amount={amount} /></div> : (
            <div className="flex flex-col items-center gap-3 bg-[#272013]" style={box}>
              <div className="flex justify-between gap-2 flex-wrap w-full text-[14px]"><span className="text-[#e8c472] font-semibold">PromptPay</span><span>QR หมดอายุใน <b style={{ color: sec < 120 ? "#ff8a9a" : GOLD }}>{mm}:{ss}</b></span></div>
              <div className="rounded-xl" style={{ padding: 12, background: "#000", lineHeight: 0, opacity: expired ? 0.2 : 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${baht(amount)}`} width={175} height={175} className="w-[175px] h-[175px] block bg-white" /> : <div className="w-[175px] h-[175px] bg-white" />}
              </div>
              <div className="text-[13px] text-center font-light">{`${BANK.accountName} · ${BANK.accountNo}`}</div>
              {expired && <button type="button" onClick={() => setSec(QR_TTL)} className={ghost} style={{ background: "rgba(232,196,114,0.16)" }}>สร้าง QR ใหม่</button>}
            </div>)}
            <div>
              <span style={{ display: "block", fontSize: 13, marginBottom: 6 }}>อัปโหลดสลิปการโอน</span>
              <label className="w-full rounded-2xl flex items-center justify-center gap-[10px] text-[14px] cursor-pointer text-center px-3" style={{ minHeight: 88, background: "rgba(232,196,114,0.16)", color: slip ? "#b5a596" : "#f3ead9" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></svg>
                {slip ? `${slipName || "slip.jpg"} · แตะเพื่อเปลี่ยน` : "แตะเพื่อเลือกรูปสลิป (JPG/PNG)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
              </label>
            </div>
            </>}
            <div className="flex flex-col gap-1" role="group" aria-label="ข้อตกลงและความยินยอม">
              {[
                <>ยอมรับ<a href="/join/terms" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#e8c472]">ข้อกำหนดการสมัคร</a> และรับทราบว่าค่าสมัครไม่คืนเงิน</>,
                <>ให้ความยินยอมเก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลตาม<a href="/join/consent" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#e8c472]">หนังสือให้ความยินยอม</a> และ<a href="/join/privacy" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#e8c472]">ประกาศความเป็นส่วนตัว</a></>,
                <>ให้ความยินยอมตรวจสอบประวัติอาชญากรรม และข้อมูลผลตรวจสุขภาพ (ข้อมูลอ่อนไหว)</>,
              ].map((label, i) => (
                <button key={i} type="button" role="checkbox" aria-checked={ticks[i]} data-consent={i} onClick={() => { setTicks((t) => t.map((v, j) => (j === i ? !v : v))); setErr(""); }} className="flex gap-3 items-start text-left bg-transparent text-[14px] leading-[1.6] text-[#f3ead9] min-h-11 py-1.5">
                  <span className="shrink-0 grid place-items-center rounded-md font-bold text-[13px] text-[#1b130b]" style={{ width: 22, height: 22, marginTop: 2, background: ticks[i] ? GOLD : "transparent", boxShadow: ticks[i] ? "none" : "inset 0 0 0 1.5px rgba(232,196,114,0.6)" }}>{ticks[i] ? "✓" : ""}</span>
                  <span>{label}</span>
                </button>
              ))}
              <button type="button" onClick={() => setTicks([true, true, true])} className="self-start min-h-10 text-[13px] text-[#e8c472] underline underline-offset-2">ยอมรับทั้งหมด</button>
            </div>
            <Turnstile key={tsKey} onToken={setTs} />
            {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}{loginHint && <> · <Link href="/join/me" className="text-[#e8c472] underline">เข้าสู่ระบบ Part-Time</Link></>}</p>}
            <button type="button" onClick={submit} disabled={busy} aria-busy={busy} className={cta} style={{ opacity: ready ? 1 : 0.45 }}>{free ? (busy ? "กำลังส่งใบสมัคร…" : "ส่งใบสมัคร") : busy ? "กำลังส่งสลิปเพื่อตรวจสอบ…" : "ส่งสลิปเพื่อตรวจสอบ"}</button>
          </div>
        </div>
      </div>

      {done && (
        <div role="dialog" aria-modal="true" aria-labelledby="paidT" className="fixed inset-0 z-50 flex justify-center items-center overflow-y-auto" style={{ background: "rgba(10,7,6,0.78)", padding: 20 }}>
          <div className="w-full max-w-[400px] rounded-[20px] bg-[#1b2322] flex flex-col items-center gap-[14px] text-center my-auto" style={{ padding: "28px 20px 20px" }}>
            <div className="w-[72px] h-[72px] rounded-full bg-[#e8c472] text-[#1b130b] grid place-items-center"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
            <div id="paidT" className="font-semibold text-[22px] leading-[1.35] text-[#e8c472]">{invite ? `สมัครเรียบร้อย · ระดับ ${invTier}` : tom ? "สมัครเรียบร้อย · ทอมหล่อ" : "ได้รับข้อมูลแล้ว · รอทีมงานตรวจ"}</div>
            <p className="m-0 text-[15px] leading-[1.7]">{free ? "ไม่มีค่าใช้จ่าย" : "ได้รับสลิปแล้ว ทีมงานตรวจภายใน 2 ชม. (09:00–22:00)"}<br />ระหว่างนี้ไปกรอกรายละเอียดในโปรไฟล์ได้เลย</p>
            <Link href={`/join/profile/${done}`} className={cta + " hover:text-[#1b130b]"}>ไปที่โปรไฟล์ของฉัน</Link>
            <p className="m-0 text-[13.5px] leading-[1.6] text-[#e8c472]">ครั้งต่อไปเข้าที่ &quot;Part-Time เข้าสู่ระบบ&quot; ด้วยอีเมลและรหัสผ่านนี้</p>
            <div className="w-full rounded-2xl" style={{ padding: 14, background: "rgba(243,234,217,0.05)" }}><SaveLink mb={done} link={link} email={who.email.trim().toLowerCase()} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayPage() {
  return <Suspense fallback={<main className="mb-v7 min-h-dvh grid place-items-center text-[#d9c9b4]">กำลังโหลด…</main>}><PayInner /></Suspense>;
}
