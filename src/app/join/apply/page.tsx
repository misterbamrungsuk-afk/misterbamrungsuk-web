"use client";

import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ACTIVITIES, ACK_NO_REFUSE_TEXT, AGE_LIMITS, EXPERIENCE, PACKAGES, TALENTS, TIME_SLOTS, ageError, type PackageKey } from "@/lib/join/config";
import { FORM_KEY, ageFrom, emptyForm, resizeImage, type FileField, type JoinForm } from "@/lib/join/form";
import { OtpStep } from "@/components/otp-step";

// ใบสมัคร ขั้นที่ 1–2 / 5 (บอร์ด JoinForm + JoinForm2) — draft เก็บใน sessionStorage ด้วย FORM_KEY เดิม ให้ /join/pay อ่านต่อ
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const H: CSSProperties = { fontFamily: "'Cormorant Garamond', Kanit, sans-serif", fontWeight: 600 };
const SUB: Record<PackageKey, string> = { A: "(ตามความสามารถพิเศษ)", B: "(สำหรับผู้มีความสามารถด้านการนวด)" };
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const inputCls = "w-full min-w-0 h-12 rounded-[12px] border border-[rgba(240,200,90,.38)] bg-[#241717] px-3 text-[14px] text-[#f6efe4] placeholder:text-[#7d6d6a] outline-none focus:border-[#f0c75a]";
const labelCls = "block h-[18px] leading-[18px] text-[12px] text-[#cdbfb3] whitespace-nowrap overflow-hidden text-ellipsis";

function Field({ label, err, children }: { label: string; err?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 min-w-0" data-err={err ? "1" : undefined}>
      <span className={labelCls}>{label}</span>
      {children}
      {err && <span className="text-[11.5px] text-[#ef6b7b]">{err}</span>}
    </label>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p data-err="1" className="text-[11.5px] text-[#ef6b7b] -mt-1">{msg}</p> : null;
}

function Tile({ label, value, onPick }: { label: string; value: string; onPick: (f?: File) => void }) {
  return (
    <label className="h-[104px] rounded-[12px] border border-dashed border-[#4a3a3d] flex flex-col items-center justify-center gap-1 text-[12px] text-[#cdbfb3] text-center min-w-0 cursor-pointer overflow-hidden relative">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <><span className="text-[20px] leading-none text-[#ffd76a]">+</span>{label}</>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
    </label>
  );
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className="h-9 px-[13px] rounded-full border text-[12.5px] font-semibold"
      style={{ borderColor: on ? GOLD : LINE, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>
      {(on ? "✓ " : "") + label}
    </button>
  );
}

function Stepper({ label, value, unit, onDown, onUp }: { label: string; value: string; unit: string; onDown: () => void; onUp: () => void }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className={labelCls}>{label}</span>
      <div className="flex items-center justify-between h-12 rounded-[12px] border border-[rgba(240,200,90,.38)] bg-[#241717] px-2">
        <button type="button" onClick={onDown} aria-label={`ลด${unit}`} className="w-8 h-8 rounded-[8px] bg-[#21191a] text-[#f6efe4]">−</button>
        <span className="text-[14px] whitespace-nowrap">{value || "–"} {unit}</span>
        <button type="button" onClick={onUp} aria-label={`เพิ่ม${unit}`} className="w-8 h-8 rounded-[8px] bg-[#21191a] text-[#f6efe4]">+</button>
      </div>
    </div>
  );
}

function Check({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div className="flex gap-[10px] items-start text-[12.5px] leading-[1.55] text-[#d3c7bc] py-[2px]">
      <button type="button" role="checkbox" aria-checked={on} onClick={onClick}
        className="flex-[0_0_20px] h-5 rounded-[6px] border-[1.5px] border-[#f0c75a] grid place-items-center font-bold text-[12px] text-[#1a1206]"
        style={{ background: on ? GOLD : "transparent" }}>{on ? "✓" : ""}</button>
      <span onClick={onClick} className="cursor-pointer">{children}</span>
    </div>
  );
}

function ApplyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState<JoinForm>(emptyForm);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [phoneOk, setPhoneOk] = useState(false);
  const [otpOff, setOtpOff] = useState(false);

  // โหลด draft + แพ็กเกจจาก ?pkg=A|B
  useEffect(() => {
    let draft: JoinForm = emptyForm;
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      if (saved) draft = { ...emptyForm, ...JSON.parse(saved) };
    } catch {}
    const q = params.get("pkg");
    const pkg = q === "A" || q === "B" ? q : draft.package;
    if (!pkg) { router.replace("/join#packages"); return; }
    const max = pkg === "A" ? 8 : 5;
    setF({ ...draft, package: pkg, avail_days: draft.avail_days || "5", avail_hours: String(Math.min(max, Math.max(3, +draft.avail_hours || 3))) });
    if (params.get("step") === "2") setStep(2);
    setReady(true);
  }, [params, router]);

  // บันทึก draft ทุกครั้งที่แก้
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(f)); } catch {}
  }, [f, ready]);

  // OTP ที่ยืนยันไว้แล้ว (cookie 30 นาที) และเบอร์ตรง
  useEffect(() => {
    if (!f.tel) return;
    const tel = f.tel.replace(/\D/g, "");
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { phone?: string | null; required?: boolean }) => {
      if (d.required === false) { setOtpOff(true); setPhoneOk(true); return; }
      if (d.phone && d.phone === tel) setPhoneOk(true);
    }).catch(() => {});
  }, [f.tel]);

  // บนเว็บจริงที่ยังไม่มีระบบ SMS → ข้าม OTP (เช็กครั้งแรกตอนเปิดหน้า)
  useEffect(() => {
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { required?: boolean }) => { if (d.required === false) { setOtpOff(true); setPhoneOk(true); } }).catch(() => {});
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  if (!ready || !f.package) return <main className="min-h-dvh grid place-items-center text-[#cdbfb3] bg-[#0e0a0a]">กำลังโหลด…</main>;
  const pkgKey = f.package;
  const pkg = PACKAGES[pkgKey];
  const maxH = pkgKey === "A" ? 8 : 5;

  const set = <K extends keyof JoinForm>(k: K, v: JoinForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrs((e) => ({ ...e, [k]: "" }));
  };
  const tog = (k: "activities" | "talents" | "avail_slots", v: string) => {
    const arr = (f[k] ?? []) as string[];
    set(k, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  const onFile = async (k: FileField, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs((e) => ({ ...e, [k]: "รับเฉพาะไฟล์รูปภาพ (JPG/PNG)" }));
    set(k, await resizeImage(file, k === "id_card" ? 1400 : 1000));
  };

  const v1 = () => {
    const e: Record<string, string> = {};
    if (!f.first_name.trim()) e.first_name = "กรอกชื่อ";
    if (!f.last_name.trim()) e.last_name = "กรอกนามสกุล";
    if (!f.nickname.trim()) e.nickname = "กรอกชื่อเล่น";
    if (!f.birthdate) e.birthdate = "กรอกวันเกิด";
    else { const ae = ageError(pkgKey, ageFrom(f.birthdate)); if (ae) e.birthdate = ae; }
    if (!(+f.height >= 140 && +f.height <= 220)) e.height = "ส่วนสูง 140–220 ซม.";
    if (!(+f.weight >= 35 && +f.weight <= 200)) e.weight = "น้ำหนัก 35–200 กก.";
    if (!/^0\d{9}$/.test(f.tel.replace(/[-\s]/g, ""))) e.tel = "เบอร์โทร 10 หลัก ขึ้นต้นด้วย 0";
    else if (!phoneOk) e.tel = "ยืนยันเบอร์โทรด้วยรหัส OTP ก่อน";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!/^\d{5}$/.test(f.zipcode)) e.zipcode = "รหัสไปรษณีย์ 5 หลัก";
    if (!f.experience) e.experience = "เลือกประสบการณ์";
    if (!f.photo) e.photo = "แนบรูปหน้าตรง";
    if (!f.other_doc) e.other_doc = "แนบรูปเต็มตัว";
    if (!f.id_card) e.id_card = "แนบรูปบัตรประชาชน";
    return e;
  };
  const v2 = () => {
    const e: Record<string, string> = {};
    if (!f.talents?.length) e.talents = "เลือกความสามารถพิเศษอย่างน้อย 1 ข้อ";
    if (!f.activities?.length) e.activities = "เลือกอย่างน้อย 1 กิจกรรม";
    if (pkgKey === "B" && !f.massage_cert) e.massage_cert = "ระบุว่ามีใบรับรองการนวดหรือไม่";
    if (!f.avail_slots?.length) e.avail_slots = "เลือกช่วงเวลาที่สะดวกอย่างน้อย 1 ช่วง";
    if (!(+f.avail_days >= 1 && +f.avail_days <= 7)) e.avail_days = "1–7 วัน";
    if (!(+f.avail_hours >= 1 && +f.avail_hours <= 24)) e.avail_hours = "ระบุชั่วโมงต่อวัน";
    if (!f.ack_hours || !f.ack_no_refuse || !f.accept_terms || !f.consent_criminal || !f.consent_pdpa) e.acks = "ต้องติ๊กรับทราบเงื่อนไขทั้ง 3 ข้อ";
    return e;
  };

  const showErrs = (e: Record<string, string>) => {
    setErrs(e);
    setTimeout(() => document.querySelector("[data-err='1']")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  const next = () => {
    if (step === 1) {
      const e = v1();
      if (Object.keys(e).length) return showErrs(e);
      setErrs({}); setStep(2);
      return;
    }
    const e = v2();
    if (Object.keys(e).length) return showErrs(e);
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(f)); } catch { return showErrs({ photo: "ไฟล์รูปใหญ่เกินไป กรุณาเลือกรูปอื่น" }); }
    router.push("/join/pay");
  };

  const ok2 = step === 2 && !!f.talents?.length && !!f.activities?.length && !!f.avail_slots?.length && f.ack_hours && f.ack_no_refuse && f.consent_pdpa && (pkgKey !== "B" || !!f.massage_cert);
  const blocked = step === 1 ? !phoneOk : !ok2;
  const ctaLabel = step === 1 ? (phoneOk ? "ถัดไป · กิจกรรมและเวลา" : "ยืนยันเบอร์โทรด้วย OTP ก่อน") : ok2 ? "ถัดไป · ชำระเงิน →" : "กรอกข้อมูลให้ครบก่อนไปต่อ";
  const ack3 = f.consent_criminal && f.consent_pdpa;

  const backBtn = "shrink-0 w-11 h-11 rounded-full border border-[rgba(240,200,90,.38)] text-[#f6efe4] grid place-items-center bg-transparent";
  const chevron = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>;
  const sectionH = "text-[15px] text-[#ffd76a]";

  return (
    <div className="min-h-dvh bg-[#0e0a0a]">
      <main className="mx-auto w-full max-w-[480px] min-h-dvh bg-[#0e0a0a] text-[#f6efe4] flex flex-col" style={{ fontFamily: "'IBM Plex Sans Thai', Kanit, sans-serif" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          {step === 1
            ? <Link href="/join#packages" aria-label="ย้อนกลับ" className={backBtn}>{chevron}</Link>
            : <button type="button" onClick={() => setStep(1)} aria-label="ย้อนกลับ" className={backBtn}>{chevron}</button>}
          <div className="min-w-0">
            <div className="text-[11px] tracking-[1px] text-[#f0c75a] font-semibold">ขั้นที่ {step} / 5</div>
            <div className="text-[18px]" style={H}>{step === 1 ? "ข้อมูลส่วนตัว" : "กิจกรรม · เวลา · ข้อตกลง"}</div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1 px-4" aria-label={`ขั้นที่ ${step} จาก 5`}>
          {[1, 2, 3, 4, 5].map((n) => <span key={n} className="h-1 rounded-[2px]" style={{ background: n <= step ? GOLD : LINE }} />)}
        </div>

        <div className="flex-1 px-4 pt-4 pb-[120px] flex flex-col gap-4">
          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3 items-start">
                <Field label="ชื่อ" err={errs.first_name}><input className={inputCls} placeholder="ชื่อจริง" autoComplete="given-name" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
                <Field label="นามสกุล" err={errs.last_name}><input className={inputCls} placeholder="นามสกุล" autoComplete="family-name" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3 items-start">
                <Field label="ชื่อเล่น" err={errs.nickname}><input className={inputCls} placeholder="ชื่อเล่น" value={f.nickname} onChange={(e) => set("nickname", e.target.value)} /></Field>
                <Field label={`วันเกิด · อายุ ${AGE_LIMITS[pkgKey].min}–${AGE_LIMITS[pkgKey].max}`} err={errs.birthdate}><input className={inputCls + " [color-scheme:dark]"} type="date" autoComplete="bday" value={f.birthdate} onChange={(e) => set("birthdate", e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3 items-start">
                <Field label="ส่วนสูง (ซม.)" err={errs.height}><input className={inputCls} inputMode="numeric" maxLength={3} value={f.height} onChange={(e) => set("height", e.target.value.replace(/\D/g, ""))} /></Field>
                <Field label="น้ำหนัก (กก.)" err={errs.weight}><input className={inputCls} inputMode="numeric" maxLength={3} value={f.weight} onChange={(e) => set("weight", e.target.value.replace(/\D/g, ""))} /></Field>
              </div>
              <div className="flex flex-col gap-2 min-w-0" data-err={errs.tel ? "1" : undefined}>
                <span className={labelCls}>{otpOff ? "เบอร์โทร" : "เบอร์โทร (ยืนยันด้วย OTP)"}</span>
                {otpOff ? <input className={inputCls} inputMode="tel" autoComplete="tel" maxLength={10} placeholder="08x-xxx-xxxx" value={f.tel} onChange={(e) => set("tel", e.target.value.replace(/\D/g, ""))} /> : <OtpStep phone={f.tel} onPhone={(v) => { set("tel", v); setPhoneOk(false); }} verified={phoneOk} onVerified={() => { setPhoneOk(true); setErrs((e) => ({ ...e, tel: "" })); }} inputCls={inputCls} />}
                {phoneOk && !otpOff && <div className="text-[#4ade80] text-[12.5px] font-semibold">ยืนยันแล้ว ✓ เบอร์นี้ผ่านการตรวจสอบ OTP</div>}
                {errs.tel && <span className="text-[11.5px] text-[#ef6b7b]">{errs.tel}</span>}
              </div>
              <Field label="LINE ID"><input className={inputCls} placeholder="LINE ID" value={f.line_id} onChange={(e) => set("line_id", e.target.value)} /></Field>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 items-start">
                <Field label="อีเมล" err={errs.email}><input className={inputCls} type="email" inputMode="email" autoComplete="email" placeholder="name@email.com" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
                <Field label="รหัสไปรษณีย์" err={errs.zipcode}><input className={inputCls} inputMode="numeric" maxLength={5} autoComplete="postal-code" value={f.zipcode} onChange={(e) => set("zipcode", e.target.value.replace(/\D/g, ""))} /></Field>
              </div>
              <div className="flex flex-col gap-2" data-err={errs.experience ? "1" : undefined}>
                <span className={labelCls}>ประสบการณ์งานบริการ</span>
                <div className="grid grid-cols-3 gap-2">
                  {EXPERIENCE.map((x) => {
                    const on = f.experience === x;
                    return <button key={x} type="button" aria-pressed={on} onClick={() => set("experience", x)} className="h-12 rounded-[12px] border text-[12.5px]" style={{ borderColor: on ? GOLD : LINE, color: on ? "#eed58a" : "#cdbfb3", background: on ? "rgba(240,200,90,.14)" : "transparent" }}>{x}</button>;
                  })}
                </div>
                {errs.experience && <span className="text-[11.5px] text-[#ef6b7b]">{errs.experience}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <span className={labelCls}>รูปโปรไฟล์ (2 รูป)</span>
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="รูปหน้าตรง" value={f.photo} onPick={(file) => onFile("photo", file)} />
                  <Tile label="รูปเต็มตัว" value={f.other_doc} onPick={(file) => onFile("other_doc", file)} />
                </div>
                <Err msg={errs.photo || errs.other_doc} />
              </div>
              <div className="flex flex-col gap-2">
                <span className={labelCls}>รูปบัตรประชาชน</span>
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="บัตรประชาชน" value={f.id_card} onPick={(file) => onFile("id_card", file)} />
                </div>
                <Err msg={errs.id_card} />
                <span className="text-[11px] leading-4 text-[#7d6d6a]">เซลฟีถือบัตร จะขอในขั้นยืนยันตัวตนหลังชำระเงิน</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 px-4 py-[14px] rounded-[16px] border-[1.5px] border-[#f0c75a] bg-[rgba(240,200,90,.14)]">
                <div className="min-w-0">
                  <div className="text-[11px] tracking-[1.5px] text-[#ffd76a]">แพ็กเกจที่สมัคร</div>
                  <div className="text-[17px]" style={H}>เพื่อนกินเที่ยว</div>
                  <div className="text-[11.5px] text-[#cdbfb3] whitespace-nowrap">{SUB[pkgKey]}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[20px] text-[#ffd76a]" style={{ ...H, fontWeight: 700 }}>{baht(pkg.price)}</div>
                  <Link href="/join#packages" className="text-[12px] text-[#ffd76a]">เปลี่ยนแพ็กเกจ</Link>
                </div>
              </div>

              <div className={sectionH} style={H}>ความสามารถพิเศษ <span className="text-[11.5px] text-[#cdbfb3] font-normal">(เลือกได้หลายข้อ · บังคับ)</span></div>
              <div className="flex flex-wrap gap-2">{TALENTS.map((a) => <Chip key={a} label={a} on={(f.talents ?? []).includes(a)} onClick={() => tog("talents", a)} />)}</div>
              <Err msg={errs.talents} />

              <div className={sectionH} style={H}>กิจกรรมที่รับได้</div>
              <div className="flex flex-wrap gap-2">{ACTIVITIES.map((a) => <Chip key={a} label={a} on={(f.activities ?? []).includes(a)} onClick={() => tog("activities", a)} />)}</div>
              <Err msg={errs.activities} />

              <div className="p-4 rounded-[16px] border border-[rgba(240,200,90,.38)] bg-[#241717] text-[13px] flex justify-between items-center gap-3">
                <span className="min-w-0">ใบรับรองการนวด (สำหรับผู้สมัครสายนวด)</span>
                <span className="flex gap-2 shrink-0">
                  {(["yes", "no"] as const).map((v) => {
                    const on = f.massage_cert === v;
                    return <button key={v} type="button" aria-pressed={on} onClick={() => set("massage_cert", v)} className="h-[34px] px-3 rounded-full border bg-transparent" style={{ borderColor: on ? GOLD : LINE, color: on ? "#eed58a" : "#cdbfb3" }}>{v === "yes" ? "มี" : "ไม่มี"}</button>;
                  })}
                </span>
              </div>
              <Err msg={errs.massage_cert} />

              <div className={sectionH} style={H}>เวลาที่สะดวกรับลูกค้า (วันไหน สัปดาห์ละกี่วัน วันละกี่ชั่วโมง)</div>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((t) => {
                  const on = (f.avail_slots ?? []).includes(t);
                  return <button key={t} type="button" aria-pressed={on} onClick={() => tog("avail_slots", t)} className="h-12 rounded-[12px] border bg-transparent text-[12.5px]" style={{ borderColor: on ? GOLD : LINE, color: on ? "#eed58a" : "#cdbfb3" }}>{t}</button>;
                })}
              </div>
              <Err msg={errs.avail_slots} />
              <div className="grid grid-cols-2 gap-3 items-start">
                <Stepper label="กี่วันต่อสัปดาห์" value={f.avail_days} unit="วัน"
                  onDown={() => set("avail_days", String(Math.max(1, (+f.avail_days || 1) - 1)))}
                  onUp={() => set("avail_days", String(Math.min(7, (+f.avail_days || 0) + 1)))} />
                <Stepper label={`กี่ชม.ต่อวัน · งานละ 3–${maxH} ชม.`} value={f.avail_hours} unit="ชม."
                  onDown={() => set("avail_hours", String(Math.max(3, (+f.avail_hours || 3) - 1)))}
                  onUp={() => set("avail_hours", String(Math.min(maxH, (+f.avail_hours || 2) + 1)))} />
              </div>

              <Check on={!!f.ack_hours} onClick={() => set("ack_hours", !f.ack_hours)}>
                {pkgKey === "A" ? "รับทราบว่างานแต่ละครั้งใช้เวลา 3–8 ชม. (เพื่อนกินเที่ยว)" : "รับทราบว่างานแต่ละครั้งใช้เวลา 3–5 ชม. (เพื่อนกินเที่ยว สายนวด)"}
              </Check>
              <Check on={!!f.ack_no_refuse && f.accept_terms} onClick={() => { const v = !(f.ack_no_refuse && f.accept_terms); setF((p) => ({ ...p, ack_no_refuse: v, accept_terms: v })); setErrs((e) => ({ ...e, acks: "" })); }}>
                {ACK_NO_REFUSE_TEXT} (<a href="/join/terms" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="underline underline-offset-2">อ่านข้อกำหนด</a>)
              </Check>
              <Check on={ack3} onClick={() => { const v = !ack3; setF((p) => ({ ...p, consent_criminal: v, consent_pdpa: v })); setErrs((e) => ({ ...e, acks: "" })); }}>
                ยินยอมให้ตรวจประวัติอาชญากรรม และยอมรับ<a href="/join/privacy" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="underline underline-offset-2">นโยบายความเป็นส่วนตัว (PDPA)</a>
              </Check>
              <Err msg={errs.acks} />
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pt-3 pb-4 bg-[rgba(14,10,10,.97)] border-t border-[rgba(240,200,90,.38)] z-20">
          <button type="button" onClick={next} aria-disabled={blocked}
            className="btn-red-lux w-full h-14 rounded-full border-[1.5px] border-[#ffd76a] text-white font-semibold text-[15px] shadow-[0_8px_24px_rgba(255,40,70,.45)]"
            style={{ background: "linear-gradient(100deg, #7e0a1e 0%, #c8102e 24%, #ff5068 50%, #c8102e 76%, #7e0a1e 100%)", opacity: blocked ? 0.45 : 1 }}>
            {ctaLabel}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function ApplyPage() {
  return <Suspense fallback={<main className="min-h-dvh grid place-items-center text-[#cdbfb3] bg-[#0e0a0a]">กำลังโหลด…</main>}><ApplyInner /></Suspense>;
}
