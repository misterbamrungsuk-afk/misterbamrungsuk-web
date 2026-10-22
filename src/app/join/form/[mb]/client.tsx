"use client";

// ใบสมัครหลังชำระเงิน (ตามลำดับ canvas: โปรไฟล์ของฉัน → ใบสมัคร 1/4 → 2/4 → ยืนยันตัวตน)
// ขั้น 1 = บอร์ด JoinForm "ข้อมูลผู้สมัคร" · ขั้น 2 = บอร์ด JoinForm2 "วันเวลาและประสบการณ์" · บันทึกทีละขั้นที่ /api/join/profile
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ageError } from "@/lib/join/config";
import { ageFrom, dataUrlToFile, emptyForm, resizeImage, type JoinForm } from "@/lib/join/form";
import type { PackageKey } from "@/lib/join/config";
import { BrandHeader } from "@/components/mb/ui";

const GOLD = "#e8c472";
const TRACK = { A: "เพื่อนกินเที่ยว — ตามความสามารถพิเศษ", B: "เพื่อนกินเที่ยว — ที่มีความสามารถในการนวด" } as const;
const inCls = "jf-in w-full min-h-12 rounded-xl bg-[#251d1b] text-[#f3ead9] px-[14px] text-[15px] placeholder:text-[#b5a596] outline-none border border-transparent focus:border-[#e8c472]";
const lb: CSSProperties = { display: "block", fontSize: 13, marginBottom: 6 };
const h2: CSSProperties = { margin: 0, fontSize: 18, lineHeight: 1.4, fontWeight: 600 };
const cta = "min-h-14 w-full rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] grid place-items-center text-center px-4 transition";

// พื้นที่ (ข้อมูลตามบอร์ด JoinForm)
const R: Record<string, string[]> = {
  "กรุงเทพฯ และปริมณฑล": ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร", "นครปฐม"],
  "ภาคกลาง": ["พระนครศรีอยุธยา", "ลพบุรี", "สระบุรี", "ราชบุรี", "กาญจนบุรี", "เพชรบุรี", "ประจวบคีรีขันธ์"],
  "ภาคตะวันออก": ["ชลบุรี", "ระยอง", "จันทบุรี", "ตราด", "ฉะเชิงเทรา"],
  "ภาคเหนือ": ["เชียงใหม่", "เชียงราย", "ลำปาง", "พิษณุโลก", "น่าน"],
  "ภาคตะวันออกเฉียงเหนือ": ["นครราชสีมา", "ขอนแก่น", "อุดรธานี", "อุบลราชธานี"],
  "ภาคใต้": ["ภูเก็ต", "สุราษฎร์ธานี", "กระบี่", "สงขลา"],
};
const D: Record<string, string[]> = {
  "กรุงเทพมหานคร": ["ปทุมวัน", "วัฒนา", "คลองเตย", "บางรัก", "สาทร", "จตุจักร", "ห้วยขวาง", "ลาดพร้าว", "บางนา", "ธนบุรี"],
  "นนทบุรี": ["เมืองนนทบุรี", "ปากเกร็ด", "บางใหญ่", "บางบัวทอง"],
  "ปทุมธานี": ["เมืองปทุมธานี", "คลองหลวง", "ธัญบุรี", "ลำลูกกา"],
  "สมุทรปราการ": ["เมืองสมุทรปราการ", "บางพลี", "พระประแดง"],
  "ชลบุรี": ["เมืองชลบุรี", "บางละมุง (พัทยา)", "ศรีราชา", "สัตหีบ"],
  "เชียงใหม่": ["เมืองเชียงใหม่", "หางดง", "สันทราย", "แม่ริม"],
  "ภูเก็ต": ["เมืองภูเก็ต", "กะทู้", "ถลาง"],
};
const T: Record<string, string[]> = {
  "ปทุมวัน": ["ลุมพินี", "ปทุมวัน", "วังใหม่", "รองเมือง"], "วัฒนา": ["คลองเตยเหนือ", "คลองตันเหนือ", "พระโขนงเหนือ"],
  "คลองเตย": ["คลองเตย", "คลองตัน", "พระโขนง"], "บางรัก": ["สีลม", "สุริยวงศ์", "บางรัก", "มหาพฤฒาราม", "สี่พระยา"],
  "สาทร": ["ทุ่งมหาเมฆ", "ยานนาวา", "ทุ่งวัดดอน"], "จตุจักร": ["ลาดยาว", "จอมพล", "จันทรเกษม", "เสนานิคม", "จตุจักร"],
  "ห้วยขวาง": ["ห้วยขวาง", "บางกะปิ", "สามเสนนอก"], "ลาดพร้าว": ["ลาดพร้าว", "จรเข้บัว"], "บางนา": ["บางนาเหนือ", "บางนาใต้"],
  "เมืองนนทบุรี": ["บางกระสอ", "ตลาดขวัญ", "บางเขน", "ท่าทราย"], "ปากเกร็ด": ["ปากเกร็ด", "บางตลาด", "คลองเกลือ", "บ้านใหม่"],
  "บางละมุง (พัทยา)": ["หนองปรือ", "นาเกลือ", "บางละมุง"], "เมืองเชียงใหม่": ["ศรีภูมิ", "ช้างคลาน", "สุเทพ", "ช้างเผือก"],
  "กะทู้": ["ป่าตอง", "กะทู้", "กมลา"],
};
// วัน (สีประจำวันตามบอร์ด JoinForm2)
const DAYS: [string, string, string, string][] = [["จ", "จันทร์", "#f2c230", "#1b130b"], ["อ", "อังคาร", "#f06aa8", "#1b130b"], ["พ", "พุธ", "#3fae5a", "#fff"], ["พฤ", "พฤหัสบดี", "#f08a24", "#1b130b"], ["ศ", "ศุกร์", "#3b82f6", "#fff"], ["ส", "เสาร์", "#8b5cf6", "#fff"], ["อา", "อาทิตย์", "#e03131", "#fff"]];
const PERIODS = [
  { id: "กลางวัน", h: "06:00–18:00", on: "#f2c230", fg: "#1b130b", icon: "M12 4V2M12 22v-2M4.9 4.9L3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" },
  { id: "กลางคืน", h: "18:00–02:00", on: "#e03131", fg: "#fff", icon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" },
];
const HOURS = ["3–4 ชม.", "5–6 ชม.", "7–8 ชม.", "มากกว่า 8 ชม."];

function Err({ msg }: { msg?: string }) {
  return msg ? <p data-err="1" className="m-0 mt-1.5 text-[12.5px] text-[#ff8a9a]">{msg}</p> : null;
}
function Field({ label, err, children }: { label: string; err?: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className="jf-lb" style={lb}>{label}</span>{children}<Err msg={err} /></label>;
}
export type FormInit = Pick<JoinForm, "first_name" | "last_name" | "nickname" | "birthdate" | "tel" | "line_id" | "address" | "areas" | "no_area" | "week_days" | "periods" | "hours_band" | "experience" | "intro" | "ack_hours" | "ack_no_refuse"> & { trans: boolean; hasPhoto: boolean; hasBody: boolean; hasCert: boolean };

function Upload({ label, done, onPick, err }: { label: string; done: boolean; onPick: (f?: File) => void; err?: string }) {
  return (
    <div className="min-w-0">
      <label className="flex flex-col items-center justify-center gap-1.5 text-center font-light cursor-pointer rounded-[14px]"
        style={{ minHeight: 84, padding: "10px 6px", fontSize: 13, lineHeight: 1.4, background: "rgba(232,196,114,0.16)", color: done ? GOLD : "#f3ead9" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        <span>{label}</span><span className="text-[13px] font-light">{done ? "✓ แนบแล้ว" : "แตะเพื่อแนบ"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
      <Err msg={err} />
    </div>
  );
}

export function JoinFormClient({ mb, t, pkg, init, step: step0, fix = false, invite = false, tom = false }: { mb: string; t: string; pkg: PackageKey; init: FormInit; step: 1 | 2; fix?: boolean; invite?: boolean; tom?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<JoinForm>({ ...emptyForm, ...init, package: pkg });
  const [step, setStep] = useState<1 | 2>(step0);
  // ทอมหล่อ: ติ๊ก = Trans (แปลงเพศแล้ว) · ไม่ติ๊ก = ทอม
  const [trans, setTrans] = useState(init.trans);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState({ r: "", p: "", d: "", t: "" });
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  // จำขั้นไว้ใน URL → รีเฟรชกลางทางแล้วยังอยู่ขั้นเดิม (ไม่เด้งกลับขั้น 1)
  const goStep = (n: 1 | 2) => { setStep(n); try { const u = new URL(window.location.href); if (n === 2) u.searchParams.set("step", "2"); else u.searchParams.delete("step"); window.history.replaceState(window.history.state, "", u.toString()); } catch {} };


  const set = <K extends keyof JoinForm>(k: K, v: JoinForm[K]) => { setF((p) => ({ ...p, [k]: v })); setErrs((e) => ({ ...e, [k]: "" })); };
  const tog = (k: "week_days" | "periods", v: string) => {
    setF((p) => { const a = p[k] ?? []; return { ...p, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] }; });
    setErrs((e) => ({ ...e, [k]: "" }));
  };
  const onFile = async (k: "photo" | "other_doc" | "cert_doc", file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs((e) => ({ ...e, [k]: "รับเฉพาะไฟล์รูปภาพ (JPG/PNG)" }));
    try { set(k, await resizeImage(file, k === "cert_doc" ? 1400 : 1000)); } catch (e) { setErrs((x) => ({ ...x, [k]: (e instanceof Error ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง") })); }
  };

  // พื้นที่
  const bkk = loc.p === "กรุงเทพมหานคร";
  const pl = loc.r ? R[loc.r] : [], dl = (loc.p && D[loc.p]) || [], tl = (loc.d && T[loc.d]) || [];
  let cur = loc.r;
  if (loc.p) cur = loc.p; if (loc.d) cur = `${loc.p} › ${loc.d}`; if (loc.t) cur = `${loc.p} › ${loc.d} › ${loc.t}`;
  const canAdd = !!cur && !f.areas.includes(cur);
  const selSt: CSSProperties = { minHeight: 42, width: "100%", padding: "0 12px", borderRadius: 12, background: "#251d1b", color: "#f3ead9", fontSize: 14.5 };
  const pickSel = (label: string, value: string, opts: string[], ph: string, on: (v: string) => void) => (
    <label className="flex flex-col gap-1 min-w-0"><span style={{ fontSize: 13.5, color: "#b5a596" }}>{label}</span>
      <select value={value} disabled={!opts.length} onChange={(e) => on(e.target.value)} style={{ ...selSt, opacity: opts.length ? 1 : 0.5 }}>
        <option value="">{opts.length ? ph : "—"}</option>{opts.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </label>
  );

  const v1 = () => {
    const e: Record<string, string> = {};
    if (!f.first_name.trim()) e.first_name = "กรอกชื่อจริง";
    if (!f.last_name.trim()) e.last_name = "กรอกนามสกุล";
    if (!f.nickname.trim()) e.nickname = "กรอกชื่อเล่น";
    if (!f.birthdate) e.birthdate = "กรอกวันเกิด"; else { const ae = ageError(pkg, ageFrom(f.birthdate)); if (ae) e.birthdate = ae; }
    if (!f.line_id.trim()) e.line_id = "กรอก LINE ID";
    if (!f.address.trim()) e.address = "บอกย่านที่พักอาศัย";
    if (!f.photo && !init.hasPhoto) e.photo = "แนบรูปหน้าตรง";
    if (!f.other_doc && !init.hasBody) e.other_doc = "แนบรูปเต็มตัว";
    if (!f.areas.length) e.areas = "เพิ่มพื้นที่ที่สะดวกอย่างน้อย 1 พื้นที่";
    return e;
  };
  const v2 = () => {
    const e: Record<string, string> = {};
    if (!f.week_days.length) e.week_days = "เลือกวันที่สะดวกอย่างน้อย 1 วัน";
    if (!f.periods.length) e.periods = "เลือกช่วงเวลา";
    if (!f.hours_band) e.hours_band = "เลือกจำนวนชั่วโมงต่อวัน";
    if (!f.ack_hours || !f.ack_no_refuse) e.acks = "ติ๊กรับทราบเงื่อนไขทั้ง 2 ข้อ";
    return e;
  };
  const showErrs = (e: Record<string, string>) => { setErrs(e); setTimeout(() => document.querySelector("[data-err='1']")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
  const save = async () => {
    const fd = new FormData();
    fd.set("mb", mb); if (t) fd.set("t", t); fd.set("step", String(step));
    if (step === 1) {
      for (const k of ["first_name", "last_name", "nickname", "birthdate", "line_id", "address", "no_area"] as const) fd.set(k, f[k]);
      if (tom) fd.set("trans", String(trans));
      f.areas.forEach((a) => fd.append("areas", a));
      if (f.photo) fd.set("photo", await dataUrlToFile(f.photo, "photo.jpg"));
      if (f.other_doc) fd.set("other_doc", await dataUrlToFile(f.other_doc, "body.jpg"));
    } else {
      f.week_days.forEach((x) => fd.append("week_days", x)); f.periods.forEach((x) => fd.append("periods", x));
      fd.set("hours_band", f.hours_band); fd.set("experience", f.experience); fd.set("intro", f.intro);
      fd.set("ack_hours", String(f.ack_hours)); fd.set("ack_no_refuse", String(f.ack_no_refuse));
      if (f.cert_doc) fd.set("cert_doc", await dataUrlToFile(f.cert_doc, "cert.jpg"));
    }
    const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string; fields?: string[] } | null;
    if (res?.ok && data?.ok) return true;
    const e: Record<string, string> = { form: data?.error ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
    data?.fields?.forEach((k) => { e[k] = "ตรวจช่องนี้อีกครั้ง"; });
    showErrs(e);
    return false;
  };
  const next = async () => {
    const e = step === 1 ? v1() : v2();
    if (Object.keys(e).length) return showErrs(e);
    setErrs({}); setBusy(true);
    const ok = await save();
    setBusy(false);
    if (!ok) return;
    if (fix) return router.push(`/join/rejected/${mb}${q}`); // มาจากรายการที่ทีมงานตีกลับ → กลับไปดูรายการที่เหลือ
    if (step === 1) return goStep(2);
    router.push(`/join/kyc/${mb}${q}`);
  };

  const back = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
  );
  const backCls = "shrink-0 w-11 h-11 rounded-full bg-[#251d1b] text-[#f3ead9] grid place-items-center hover:text-[#f3ead9]";

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.7 }}>
      <BrandHeader tone="bar" small />
      <div className="mb-panel mx-auto w-full max-w-[720px]">
        {step === 1 ? (
          <>
            <div className="flex items-center gap-3" style={{ padding: "12px 16px 4px" }}>
              <Link href={`/join/profile/${mb}${q}`} aria-label="ย้อนกลับ" className={backCls}>{back}</Link>
              <div className="min-w-0 font-semibold text-[20px] leading-[1.35]">ข้อมูลผู้สมัคร</div>
            </div>
            <div className="flex flex-col gap-1" style={{ padding: "12px 16px 0" }}>
              <h1 className="m-0 font-semibold text-[20px] leading-[1.4] text-[#e8c472]">กรอกข้อมูล</h1>
            </div>
            <div className="jf1 flex flex-col" style={{ padding: "12px 16px 28px", gap: 22 }}>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#251d1b]" style={{ padding: "14px 16px" }}>
                <div className="min-w-0"><div className="text-[13px] font-light">สายที่สมัคร</div><div className="font-semibold text-[17px] leading-[1.4]">{TRACK[pkg]}</div></div>
              </div>

              <section className="flex flex-col" style={{ gap: 10 }}>
                <h2 style={h2}>ข้อมูลเบื้องต้น</h2>
                <div className="grid grid-cols-2 gap-[10px]">
                  <Field label="ชื่อจริง" err={errs.first_name}><input className={inCls} autoComplete="given-name" placeholder="ชื่อจริง" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
                  <Field label="นามสกุล" err={errs.last_name}><input className={inCls} autoComplete="family-name" placeholder="นามสกุล" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-[10px]">
                  <Field label="ชื่อเล่น" err={errs.nickname}><input className={inCls} placeholder="ชื่อเล่น" value={f.nickname} onChange={(e) => set("nickname", e.target.value)} /></Field>
                  <Field label="วันเกิด" err={errs.birthdate}><input type="date" className={inCls} style={{ colorScheme: "dark" }} value={f.birthdate} onChange={(e) => set("birthdate", e.target.value)} /></Field>
                </div>
                {tom && <label data-trans-check className="flex items-start gap-3 rounded-xl cursor-pointer" style={{ padding: "12px 14px", background: "#251d1b" }}>
                  <input type="checkbox" checked={trans} onChange={(e) => setTrans(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[#e8c472]" />
                  <span className="flex flex-col gap-0.5"><span className="text-[15px] font-semibold">Trans (แปลงเพศแล้ว)</span><span className="text-[13px] text-[#b5a596] font-light">ไม่ติ๊ก = ทอม</span></span>
                </label>}
                <div className="text-[13px] font-light" style={{ marginTop: -4 }}>รับสมัครอายุ 20–50 ปี</div>
                <Field label="เบอร์โทรศัพท์"><input className={inCls} value={f.tel} readOnly aria-readonly="true" style={{ opacity: 0.8 }} /></Field>
                <Field label="LINE ID" err={errs.line_id}><input className={inCls} placeholder="LINE ID" value={f.line_id} onChange={(e) => set("line_id", e.target.value)} /></Field>
                <Field label="ปัจจุบันพักอาศัยอยู่แถวไหน" err={errs.address}><input className={inCls} placeholder="เช่น ลาดพร้าว, บางนา" value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-[10px]">
                  <Upload label="รูปหน้าตรง" done={!!f.photo || init.hasPhoto} onPick={(x) => onFile("photo", x)} err={errs.photo} />
                  <Upload label="รูปเต็มตัว" done={!!f.other_doc || init.hasBody} onPick={(x) => onFile("other_doc", x)} err={errs.other_doc} />
                </div>
              </section>

              <section className="flex flex-col" style={{ gap: 10 }}>
                <div><h2 style={h2}>พื้นที่ที่สะดวกรับงาน</h2><div className="text-[13px] font-light">เลือกได้มากกว่า 1 ข้อ</div></div>
                {f.areas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {f.areas.map((a) => (
                      <button key={a} type="button" onClick={() => set("areas", f.areas.filter((x) => x !== a))} aria-label={`ลบ ${a}`} className="inline-flex items-center gap-1.5 font-light text-[13px] leading-[1.3] rounded-[10px] bg-[#2a211f] text-[#f3ead9]" style={{ minHeight: 36, padding: "6px 10px 6px 12px" }}>
                        {a}<span aria-hidden="true" className="text-[15px] text-[#e8c472]">×</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-[10px]">
                  {pickSel("ภูมิภาค", loc.r, Object.keys(R), "เลือกภูมิภาค", (v) => setLoc({ r: v, p: "", d: "", t: "" }))}
                  {pickSel("จังหวัด", loc.p, pl, "ทั้งภูมิภาค", (v) => setLoc((l) => ({ ...l, p: v, d: "", t: "" })))}
                  {pickSel(bkk ? "เขต" : "อำเภอ", loc.d, dl, "ทั้งจังหวัด", (v) => setLoc((l) => ({ ...l, d: v, t: "" })))}
                  {pickSel(bkk ? "แขวง" : "ตำบล", loc.t, tl, bkk ? "ทั้งเขต" : "ทั้งอำเภอ", (v) => setLoc((l) => ({ ...l, t: v })))}
                </div>
                <button type="button" disabled={!canAdd} onClick={() => { if (canAdd) set("areas", [...f.areas, cur]); }} className="min-h-11 rounded-xl bg-[#2a211f] text-[#e8c472] font-semibold text-[14px]" style={{ opacity: canAdd ? 1 : 0.45 }}>+ เพิ่มพื้นที่นี้</button>
                <Err msg={errs.areas} />
                <Field label="พื้นที่ที่ไม่สะดวกรับงาน"><input className={inCls} placeholder="เช่น ไม่รับงานต่างจังหวัด" value={f.no_area} onChange={(e) => set("no_area", e.target.value)} /></Field>
              </section>

              {errs.form && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{errs.form}</p>}
              <button type="button" onClick={next} disabled={busy} className={cta} style={{ opacity: busy ? 0.6 : 1, minHeight: 50 }}>{busy ? "กำลังบันทึก…" : "ถัดไป · วันเวลาและประสบการณ์"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3" style={{ padding: "20px 20px 10px" }}>
              <button type="button" onClick={() => goStep(1)} aria-label="ย้อนกลับ" className={backCls}>{back}</button>
              <div className="min-w-0 font-semibold text-[20px] leading-[1.35]">วันเวลาและประสบการณ์</div>
            </div>
            <div className="flex flex-col" style={{ padding: "24px 20px 40px", gap: 24 }}>
              <section className="flex flex-col" style={{ gap: 10 }}>
                <div><h2 style={h2}>วันและเวลาที่สะดวก</h2><div className="text-[13px] font-light text-[#b5a596]">แตะเลือกได้หลายวัน</div></div>
                <div className="grid grid-cols-7 gap-1.5 md:max-w-[420px]">
                  {DAYS.map(([t, full, col, ink]) => {
                    const on = f.week_days.includes(t);
                    return <button key={t} type="button" aria-pressed={on} aria-label={full} onClick={() => tog("week_days", t)} className="rounded-full font-bold text-[14px] p-0" style={{ aspectRatio: "1", minHeight: 44, background: on ? col : "transparent", color: on ? ink : col, boxShadow: on ? `0 4px 12px ${col}66` : "none", transition: "all .2s ease" }}>{t}</button>;
                  })}
                </div>
                <Err msg={errs.week_days} />
                <div className="flex flex-col gap-1.5">
                  <span style={{ fontSize: 13.5, color: "#b5a596" }}>ช่วงเวลา · เลือกได้ทั้งสองช่วง</span>
                  <div className="grid grid-cols-2 gap-[10px]">
                    {PERIODS.map((p) => {
                      const on = f.periods.includes(p.id);
                      return (
                        <button key={p.id} type="button" aria-pressed={on} onClick={() => tog("periods", p.id)} className="flex items-center gap-[10px] text-left rounded-[14px]" style={{ minHeight: 64, padding: "10px 12px", background: on ? p.on : "transparent", color: on ? p.fg : "#f3ead9", boxShadow: on ? "0 6px 14px rgba(0,0,0,0.25)" : "none", transition: "all .2s ease" }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p.icon} /></svg>
                          <span className="flex flex-col leading-[1.3]"><span className="font-bold text-[15px]">{p.id}</span><span className="text-[13px] font-light" style={{ opacity: 0.85 }}>{p.h}</span></span>
                        </button>
                      );
                    })}
                  </div>
                  <Err msg={errs.periods} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span style={{ fontSize: 13.5, color: "#b5a596" }}>รับลูกค้าได้กี่ชั่วโมงต่อวัน</span>
                  <div className="flex flex-wrap gap-2">
                    {HOURS.map((t) => {
                      const on = f.hours_band === t;
                      return <button key={t} type="button" aria-pressed={on} onClick={() => set("hours_band", t)} className="rounded-full text-[14px] font-semibold" style={{ minHeight: 44, padding: "8px 14px", background: on ? GOLD : "transparent", color: on ? "#1b130b" : "#f3ead9" }}>{t}</button>;
                    })}
                  </div>
                  <Err msg={errs.hours_band} />
                </div>
                <div className="rounded-xl text-[14px]" style={{ padding: "10px 14px", background: "rgba(232,196,114,0.08)" }}>
                  รับลูกค้าได้สัปดาห์ละ <b className="text-[#e8c472]">{f.week_days.length} วัน</b> · {f.periods.join(" + ") || "ยังไม่เลือกช่วงเวลา"}
                </div>
              </section>

              <section className="flex flex-col" style={{ gap: 10 }}>
                <h2 style={h2}>ประสบการณ์</h2>
                <label className="block"><span className="jf-lb" style={lb}>ประสบการณ์ด้านงานบริการ / การนวด (ถ้ามี)</span>
                  <textarea rows={3} maxLength={500} placeholder="เช่น เคยทำงานโรงแรม 2 ปี, นวดแผนไทยได้" value={f.experience} onChange={(e) => set("experience", e.target.value)} className="w-full rounded-xl bg-[#251d1b] text-[#f3ead9] text-[15px] leading-[1.6] outline-none border border-transparent focus:border-[#e8c472] placeholder:text-[#b5a596]" style={{ padding: "12px 14px", resize: "vertical" }} />
                </label>
                {/* ทุกสายแนบได้ (22 ต.ค. 2569): สายกินเที่ยว/ลิงก์เชิญที่นวดได้ → แนบแล้วเปิดสกิล "นวดผ่อนคลาย" บนโปรไฟล์ */}
                <div className="flex flex-col gap-1.5" data-cert-upload>
                  <span className="jf-lb" style={{ ...lb, margin: 0 }}>{pkg === "B" ? "ใบรับรองการนวด (สายนวด · ไม่บังคับ)" : "ใบรับรองการนวด (ถ้านวดได้ · ไม่บังคับ)"}</span>
                  <Upload label="แนบใบรับรอง" done={!!f.cert_doc || init.hasCert} onPick={(x) => onFile("cert_doc", x)} err={errs.cert_doc} />
                  {pkg !== "B" && <span className="text-[12.5px] font-light text-[#b5a596]">แนบแล้วเลือกสกิล "นวดผ่อนคลาย" บนโปรไฟล์ได้ · ลูกค้าเห็นว่ารับนวดด้วย</span>}
                </div>
              </section>

              <section className="flex flex-col" style={{ gap: 10 }}>
                <h2 style={h2}>ข้อมูลเพิ่มเติม</h2>
                <Field label="หมายเหตุเพิ่มเติม"><input className={inCls} maxLength={300} placeholder="สิ่งที่อยากให้ทีมงานทราบ" value={f.intro} onChange={(e) => set("intro", e.target.value)} /></Field>
              </section>

              <section className="flex flex-col gap-1.5">
                <h2 style={h2}>รับทราบเงื่อนไขการรับงาน</h2>
                {([["ack_hours", `รับทราบว่าการให้บริการต่อครั้งอยู่ที่ ${pkg === "A" ? "3–8" : "3–5"} ชม. แล้วแต่ที่ลูกค้าจอง`], ["ack_no_refuse", "รับทราบว่าจะไม่ปฏิเสธการรับลูกค้าในวันเวลาที่แจ้งไว้"]] as const).map(([k, t]) => {
                  const on = f[k];
                  return (
                    <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => set(k, !on)} className="flex gap-3 items-start text-left bg-transparent w-full text-[#f3ead9]" style={{ padding: "6px 0", fontSize: 14.5, lineHeight: 1.6, minHeight: 44 }}>
                      <span className="shrink-0 grid place-items-center rounded-md font-bold text-[13px] text-[#1b130b]" style={{ width: 22, height: 22, marginTop: 2, background: on ? GOLD : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px rgba(232,196,114,0.6)" }}>{on ? "✓" : ""}</span>
                      <span>{t}</span>
                    </button>
                  );
                })}
                <Err msg={errs.acks} />
              </section>

              {errs.form && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{errs.form}</p>}
              <button type="button" onClick={next} disabled={busy} className={cta} style={{ opacity: busy ? 0.6 : 1 }}>{busy ? "กำลังบันทึก…" : "ถัดไป · ยืนยันตัวตน"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
