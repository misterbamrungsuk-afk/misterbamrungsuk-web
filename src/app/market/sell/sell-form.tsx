"use client";

import Link from "next/link";
import { useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/market/config";
import { LINE, RED_GRAD } from "../../products/m-kit";

const fl = "flex flex-col gap-[5px] text-xs text-[#d9c9b4]";
const fi = "h-12 w-full rounded-[14px] bg-[#211a18] px-3.5 text-sm text-[#f3ead9] placeholder:text-[#b5a596] border outline-none focus:border-[#e8c472]";
const card = "p-3.5 rounded-2xl bg-[#211a18] border";
const MAX = 8 * 1024 * 1024;
const STEPS = ["กรอกใบสมัคร + แนบเอกสาร", "ทีมงานตรวจภายใน 3 วันทำการ", "ได้ลิงก์ตั้งรหัสผ่านพอร์ทัลร้านค้า", "ลงสินค้า (มีเลข อย.) · ทีมงานอนุมัติ · เริ่มขาย"];

// ฟอร์มสมัครเปิดร้าน — เอกสาร: บุคคล = บัตรประชาชน · นิติบุคคล = หนังสือรับรองบริษัท · อย. (ถ้ามี) · รูป/PDF ไม่เกิน 8MB
export function SellForm({ categories }: { categories: string[] }) {
  const [f, setF] = useState({ shop_name: "", owner_name: "", phone: "", email: "", line_id: "", business_type: "person" as BusinessType, description: "", category: "", website: "" });
  const [main, setMain] = useState<File | null>(null);
  const [fda, setFda] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [bad, setBad] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const bd = (k: string, v: unknown) => ({ borderColor: bad.includes(k) ? "#ef8a97" : v ? "#5a4a3a" : LINE });
  const pick = (fn: (x: File | null) => void, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const x = e.target.files?.[0] ?? null;
    if (x && x.size > MAX) { setErr("ไฟล์ต้องไม่เกิน 8MB"); setBad([field]); return; }
    setErr(""); setBad([]); fn(x);
  };
  const mainLabel = f.business_type === "company" ? "หนังสือรับรองบริษัท *" : "สำเนาบัตรประชาชน *";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBad([]);
    if (!main) { setBad(["doc_main"]); return setErr(`แนบ${mainLabel.replace(" *", "")}`); }
    if (!consent) { setBad(["consent"]); return setErr("กรุณายินยอมการเก็บข้อมูล (PDPA)"); }
    setBusy(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(f)) fd.append(k, v);
      fd.append("consent", "1");
      fd.append("turnstile", ts);
      fd.append("doc_main", main);
      if (fda) fd.append("doc_fda", fda);
      const res = await fetch("/api/market/apply", { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: string[] };
      if (!res.ok || !d.ok) { setTs(""); setTsKey((k) => k + 1); setBad(d.fields ?? []); setErr(d.error || "ส่งใบสมัครไม่สำเร็จ"); return; }
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch { setErr("ส่งไม่สำเร็จ (เครือข่าย) · ลองอีกครั้ง"); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
      <div className="w-[84px] h-[84px] rounded-full border-2 border-[#e8c472] grid place-items-center text-[#e8c472]"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m5 12 5 5 9-10" /></svg></div>
      <h2 className="font-lux font-bold text-2xl">ได้รับใบสมัครแล้ว</h2>
      <p className="text-[13px] text-[#d9c9b4] leading-[1.7]">ทีมงานจะตรวจเอกสารและติดต่อกลับที่ {f.phone || "เบอร์ที่ให้ไว้"} หรืออีเมล {f.email}<br />เมื่ออนุมัติ คุณจะได้ลิงก์ตั้งรหัสผ่านเข้าพอร์ทัลร้านค้า</p>
      <Link href="/market" className="btn-red-lux mt-4 h-[52px] w-full rounded-[14px] border text-white text-[15px] font-semibold font-lux grid place-items-center" style={{ background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>กลับหน้า Marketplace</Link>
    </div>
  );

  return (
    <form onSubmit={submit} className="px-[18px] py-4 flex flex-col gap-3" noValidate>
      <div className={`${card} flex flex-col gap-2`} style={{ borderColor: "rgba(232,196,114,.55)", background: "#1d1712" }}>
        <b className="font-lux text-[16px] text-[#e8c472]">ขายสินค้าบน Marketplace</b>
        <p className="text-[12.5px] text-[#d9c9b4] leading-relaxed">มีหน้าร้านของตัวเอง · ลงสินค้าและส่งของเอง · ลูกค้าจ่ายผ่านระบบ · ส่วนของร้าน (หักค่าธรรมเนียม GP รวมค่าส่ง) เข้ากระเป๋าร้านเมื่อออเดอร์สำเร็จ ถอนได้</p>
        <ol className="text-[12px] text-[#d9c9b4] leading-[1.8] list-decimal pl-4">{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
      </div>

      <h2 className="font-lux font-semibold text-[15px] mt-1">ข้อมูลร้าน</h2>
      <label className={fl}>ชื่อร้าน / แบรนด์ *<input className={fi} style={bd("shop_name", f.shop_name)} maxLength={80} value={f.shop_name} onChange={set("shop_name")} placeholder="ชื่อที่แสดงบนหน้าร้าน" /></label>
      <div className={fl}>ประเภทผู้ขาย *
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ประเภทผู้ขาย">
          {(Object.keys(BUSINESS_TYPES) as BusinessType[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={f.business_type === k} onClick={() => { setF({ ...f, business_type: k }); setMain(null); }} className="h-12 rounded-[14px] border text-sm" style={{ borderColor: f.business_type === k ? "#e8c472" : LINE, color: f.business_type === k ? "#e8c472" : "#d9c9b4", background: "#211a18" }}>{BUSINESS_TYPES[k]}</button>
          ))}
        </div>
      </div>
      <label className={fl}>หมวดสินค้าหลัก *
        <select className={fi} style={bd("category", f.category)} value={f.category} onChange={set("category")}>
          <option value="">เลือกหมวดสินค้า</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className={fl}>เกี่ยวกับร้าน / สินค้าที่จะขาย<textarea rows={4} maxLength={1000} className={`${fi} h-auto py-3`} style={bd("description", f.description)} value={f.description} onChange={set("description")} placeholder="สินค้าหลัก จุดเด่น ช่องทางขายที่มีอยู่" /></label>

      <h2 className="font-lux font-semibold text-[15px] mt-1">ผู้ติดต่อ</h2>
      <label className={fl}>ชื่อเจ้าของร้าน / ผู้ติดต่อ *<input className={fi} style={bd("owner_name", f.owner_name)} maxLength={80} autoComplete="name" value={f.owner_name} onChange={set("owner_name")} /></label>
      <label className={fl}>เบอร์มือถือ *<input className={fi} style={bd("phone", f.phone)} inputMode="tel" autoComplete="tel" maxLength={20} value={f.phone} onChange={set("phone")} placeholder="08x-xxx-xxxx" /></label>
      <label className={fl}>อีเมล * (ใช้เข้าพอร์ทัลร้านค้า)<input className={fi} style={bd("email", f.email)} type="email" autoComplete="email" maxLength={120} value={f.email} onChange={set("email")} /></label>
      <label className={fl}>LINE ID<input className={fi} style={bd("line_id", f.line_id)} maxLength={60} value={f.line_id} onChange={set("line_id")} /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" value={f.website} onChange={set("website")} />

      <h2 className="font-lux font-semibold text-[15px] mt-1">เอกสาร</h2>
      {[["doc_main", mainLabel, main, setMain], ["doc_fda", "ใบอนุญาต อย. (ถ้ามี)", fda, setFda]].map(([k, label, file, fn]) => (
        <div key={k as string} className={fl}>{label as string}
          <label className="min-h-[64px] rounded-[14px] border-[1.5px] border-dashed bg-[#211a18] text-[13px] flex items-center justify-center gap-2 cursor-pointer px-3 text-center"
            style={{ borderColor: bad.includes(k as string) ? "#ef8a97" : file ? "#3f8f63" : "#5a4a3a", color: file ? "#7fd6a3" : "#e8c472" }}>
            {file ? `✓ ${(file as File).name} · แตะเพื่อเปลี่ยน` : "+ แตะเพื่อแนบรูป หรือ PDF (ไม่เกิน 8MB)"}
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={pick(fn as (x: File | null) => void, k as string)} />
          </label>
        </div>
      ))}
      <p className="text-[11.5px] text-[#b5a596] leading-relaxed">สินค้าทุกชิ้นที่ลงขายต้องมีเลข อย. และผ่านการตรวจคำโฆษณาจากทีมงานก่อนแสดงบนเว็บ</p>

      <button type="button" role="checkbox" aria-checked={consent} onClick={() => setConsent(!consent)} className="flex gap-2.5 items-start text-left text-[#d9c9b4] text-[13px] py-1.5 min-h-11">
        <span className="w-[22px] h-[22px] shrink-0 rounded-md border-[1.5px] grid place-items-center text-white text-sm" style={{ borderColor: consent ? "#e8c472" : bad.includes("consent") ? "#ef8a97" : "#5a4a3a", background: consent ? "#e8c472" : "transparent" }}>{consent ? "✓" : ""}</span>
        <span>ยินยอมให้เก็บข้อมูลและเอกสารเพื่อตรวจสอบการเปิดร้าน ตาม <Link href="/policy/privacy-shop" className="text-[#e8c472]">นโยบายความเป็นส่วนตัว</Link></span>
      </button>
      <Turnstile key={tsKey} onToken={setTs} />
      {err && <p role="alert" className="text-[13px] text-[#ef8a97]">{err}</p>}
      <button type="submit" disabled={busy} className="btn-red-lux h-[52px] w-full rounded-[14px] border text-white text-[15px] font-semibold font-lux grid place-items-center disabled:opacity-45" style={{ background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>{busy ? "กำลังส่ง…" : "ส่งใบสมัคร"}</button>
      <Link href="/vendor" className="text-center text-[12.5px] text-[#e8c472] py-2">เป็นร้านค้าอยู่แล้ว? เข้าพอร์ทัลร้านค้า →</Link>
    </form>
  );
}
