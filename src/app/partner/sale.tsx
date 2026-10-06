"use client";

import { useState } from "react";
import { Logo } from "@/components/ui";
import { BRAND, LINE_OA_ID, lineAddUrl } from "@/lib/join/config";
import {
  BOOKING_COMMISSION, PACKAGE_INCLUDES, PACKAGE_KEYS, PARTNER_FAQ, PARTNER_PACKAGES, PARTNER_STATS, PARTNER_TYPES, baht,
  type PartnerPackageKey,
} from "@/lib/partner/config";

const SEEKING = [
  { t: "SPA", th: "สปา & นวดเพื่อสุขภาพ", d: "ห้องส่วนตัว มาตรฐานการนวดระดับพรีเมียม" },
  { t: "HOTEL", th: "โรงแรม & รีสอร์ต", d: "แพ็กเกจพักผ่อนสำหรับลูกค้าผู้หญิงและต่างชาติ" },
  { t: "DINING", th: "ร้านอาหาร & ไฟน์ไดนิ่ง", d: "ประสบการณ์มื้อพิเศษ บรรยากาศเป็นส่วนตัว" },
  { t: "WELLNESS", th: "เวลเนส & บิวตี้", d: "คลินิก ฟิตเนส โยคะ และการดูแลตัวเอง" },
];

const PLACEMENTS = [
  { n: "01", t: "หน้าแรก", d: "แบนเนอร์และการ์ดแนะนำ ที่ลูกค้าเห็นทันทีเมื่อเข้าเว็บไซต์" },
  { n: "02", t: "หน้าค้นหา", d: "แสดงในผลค้นหาเมื่อลูกค้าค้นบริการในพื้นที่ของคุณ" },
  { n: "03", t: "หน้าเลือกสถานที่", d: "อยู่ในหมวด “สปาพาร์ทเนอร์” ตอนลูกค้าเลือกสถานที่รับบริการ" },
  { n: "04", t: "แคมเปญร่วม", d: "โปรโมชันและคอนเทนต์ร่วมกับมาดามกอ ผ่านช่องทางโซเชียล" },
];

const STEPS = ["ส่งข้อมูลสมัคร", "ตรวจสอบมาตรฐาน QC", "ทำสัญญาและชำระค่าแพ็กเกจ", "ถ่ายคลิป / จัดทำโปรไฟล์", "เปิดแสดงบนแพลตฟอร์ม"];

const REQUIREMENTS = [
  "มาตรฐานการนวดแบบเดียวกับบำรุงสุข",
  "ใบอนุญาตประกอบกิจการถูกต้อง",
  "ห้องส่วนตัว สะอาด ปลอดภัย",
  "ยินยอมให้ทีมงานสุ่มตรวจ QC",
  "ไม่มีบริการทางเพศทุกรูปแบบ",
];

type Form = {
  business_name: string; type: string; province: string; contact_name: string; tel: string; email: string;
  line_id: string; links: string; package: PartnerPackageKey | ""; message: string; consent: boolean; website: string;
};
const EMPTY: Form = { business_name: "", type: "", province: "", contact_name: "", tel: "", email: "", line_id: "", links: "", package: "", message: "", consent: false, website: "" };

const priceText = (k: PartnerPackageKey) => {
  const p = PARTNER_PACKAGES[k].price;
  return p == null ? "ติดต่อทีมงาน" : `฿${baht(p)}`;
};

export function PartnerSalePage() {
  const [f, setF] = useState<Form>(EMPTY);
  const [faq, setFaq] = useState<number | null>(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const pick = (k: PartnerPackageKey) => {
    set("package", k);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!f.consent) return setErr("กรุณายินยอมการเก็บข้อมูลส่วนบุคคล (PDPA)");
    setBusy(true);
    try {
      const res = await fetch("/api/partner/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; token?: string };
      if (!res.ok || !out.ok) setErr(out.error || "ส่งไม่สำเร็จ กรุณาลองใหม่");
      else {
        setToken(out.token ?? "");
        setDone(true);
      }
    } catch {
      setErr("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  const label = "block text-xs text-ink-300 mb-1.5";

  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <header className="sticky top-0 z-30 bg-ink-900/90 backdrop-blur-xl border-b border-ink-600">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 h-14">
          <Logo size={28} />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-gold-500">PARTNER</span>
          <a href="#apply" className="ml-auto btn-crimson h-9 px-4 rounded-full text-sm inline-flex items-center">สมัครพาร์ทเนอร์</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(160,20,30,0.25),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <p className="text-xs font-semibold tracking-[0.3em] text-gold-500">PARTNER PROGRAM</p>
          <h1 className="mt-3 text-3xl lg:text-5xl font-semibold leading-tight max-w-3xl">
            ให้แบรนด์ของคุณอยู่ตรงหน้า<span className="text-gold-500">ลูกค้าระดับพรีเมียม</span>
          </h1>
          <p className="mt-4 text-ink-300 max-w-2xl leading-relaxed">
            เปิดพื้นที่ให้สปา โรงแรม ร้านอาหาร และพาร์ทเนอร์ด้านเวลเนส ลงประกาศบนเว็บไซต์ เข้าถึงฐานลูกค้าผู้หญิงกลุ่มพรีเมียมโดยตรง
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#packages" className="btn-crimson h-12 px-6 rounded-full inline-flex items-center font-semibold">ดูแพ็กเกจพื้นที่โฆษณา</a>
            <a href="#apply" className="btn-ghost h-12 px-6 rounded-full inline-flex items-center">ส่งข้อมูลสมัคร</a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
            {PARTNER_STATS.map((s) => (
              <div key={s.k} className="glass rounded-2xl p-3 lg:p-4">
                <p className="font-display text-lg lg:text-2xl font-semibold text-gold-500 truncate">{s.v}</p>
                <p className="text-[11px] lg:text-xs text-ink-300 mt-1">{s.k}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seeking */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="section-title text-2xl font-semibold">เรากำลังมองหาพาร์ทเนอร์</h2>
        <p className="text-ink-300 text-sm mt-1">SPA • HOTEL • DINING • WELLNESS</p>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SEEKING.map((s) => (
            <div key={s.t} className="rounded-2xl border border-ink-600 bg-ink-800 p-5 hover:border-gold-500/60 transition">
              <p className="text-xs font-semibold tracking-[0.25em] text-gold-500">{s.t}</p>
              <p className="mt-2 font-semibold">{s.th}</p>
              <p className="mt-1 text-xs text-ink-300 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Placements */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="section-title text-2xl font-semibold">แบรนด์ของคุณจะปรากฏที่ไหน</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLACEMENTS.map((p) => (
            <div key={p.n} className="glass rounded-2xl p-5">
              <p className="font-display text-3xl text-crimson-500 font-semibold">{p.n}</p>
              <p className="mt-2 font-semibold">{p.t}</p>
              <p className="mt-1 text-xs text-ink-300 leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-16">
        <h2 className="section-title text-2xl font-semibold">แพ็กเกจพื้นที่โปรโมท</h2>
        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          {PACKAGE_KEYS.map((k) => {
            const p = PARTNER_PACKAGES[k];
            const hot = !!p.badge;
            return (
              <div key={k} className={`relative rounded-3xl border p-6 flex flex-col ${hot ? "border-gold-500 bg-ink-800 shadow-[0_0_40px_rgba(212,175,55,0.12)]" : "border-ink-600 bg-ink-800"}`}>
                {hot && <span className="absolute -top-3 right-5 h-6 px-3 rounded-full bg-gold-500 text-ink-900 text-xs font-bold grid place-items-center">{p.badge}</span>}
                <p className="text-sm text-gold-500 font-semibold">{p.label}</p>
                <p className="font-display text-3xl font-semibold mt-1">{priceText(k)}</p>
                <p className="mt-3 font-semibold">{p.tagline}</p>
                <p className="text-sm text-ink-300">{p.desc}</p>
                <ul className="mt-4 space-y-2 text-sm flex-1">
                  {PACKAGE_INCLUDES.map((i) => (
                    <li key={i} className="flex gap-2"><span className="text-gold-500">✓</span><span>{i}</span></li>
                  ))}
                </ul>
                <button type="button" onClick={() => pick(k)} className={`mt-6 h-11 rounded-full font-semibold ${hot ? "btn-crimson" : "btn-ghost"}`}>
                  {p.price == null ? "ติดต่อทีมงาน" : "เลือกแพ็กเกจนี้"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink-300">
          * แพลตฟอร์มรับ booking แทน หัก {BOOKING_COMMISSION}% ต่อรายการ และช่วย mark up ราคาขายให้เหมาะกับกลุ่มลูกค้าพรีเมียม
        </p>
      </section>

      {/* Steps + requirements */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="section-title text-2xl font-semibold">เริ่มต้นใน 5 ขั้นตอน</h2>
          <ol className="mt-6 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-4 rounded-2xl border border-ink-600 bg-ink-800 p-4">
                <span className="w-9 h-9 shrink-0 rounded-full bg-crimson-500 text-white font-semibold grid place-items-center">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="section-title text-2xl font-semibold">คุณสมบัติพาร์ทเนอร์</h2>
          <ul className="mt-6 glass rounded-2xl p-5 space-y-3">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex gap-3"><span className="text-gold-500">◆</span><span>{r}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="section-title text-2xl font-semibold">คำถามที่พบบ่อย</h2>
        <div className="mt-6 space-y-2">
          {PARTNER_FAQ.map((q, i) => (
            <div key={q.q} className="rounded-2xl border border-ink-600 bg-ink-800">
              <button type="button" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? null : i)} className="w-full text-left flex items-center gap-3 p-4 font-semibold">
                <span className="flex-1">{q.q}</span>
                <span className={`text-gold-500 transition ${faq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {faq === i && <p className="px-4 pb-4 text-sm text-ink-300 leading-relaxed">{q.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="max-w-3xl mx-auto px-4 py-12 scroll-mt-16">
        <div className="glass rounded-3xl p-5 lg:p-8">
          {done ? (
            <div className="text-center py-8">
              <p className="text-4xl text-gold-500">✓</p>
              <h2 className="mt-3 text-2xl font-semibold">ได้รับข้อมูลของคุณแล้ว</h2>
              <p className="mt-2 text-ink-300">ทีมงานจะติดต่อกลับภายใน 24 ชม.</p>
              {token && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  {f.package && PARTNER_PACKAGES[f.package].price != null && (
                    <a href={`/partner/pay?t=${encodeURIComponent(token)}&pkg=${f.package}`} className="btn-crimson h-12 px-6 rounded-full inline-flex items-center font-semibold">
                      ชำระค่าแพ็กเกจ {PARTNER_PACKAGES[f.package].label} ด้วย QR
                    </a>
                  )}
                  <a href={`/partner/register?t=${encodeURIComponent(token)}`} className="text-sm text-gold-300 underline underline-offset-4">ตั้งรหัสผ่านเข้าพอร์ทัลพาร์ทเนอร์</a>
                </div>
              )}
              <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="mt-6 btn-ghost h-12 px-6 rounded-full inline-flex items-center font-semibold">
                ทัก LINE OA {LINE_OA_ID}
              </a>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="section-title text-2xl font-semibold">สมัครเป็นพาร์ทเนอร์</h2>
              <p className="text-sm text-ink-300 mt-1">กรอกข้อมูลเบื้องต้น ทีมงานจะติดต่อกลับเพื่อนัดตรวจ QC</p>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} />
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="bn">ชื่อธุรกิจ *</label>
                  <input id="bn" className="input-dark w-full" required value={f.business_name} onChange={(e) => set("business_name", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="tp">ประเภท *</label>
                  <select id="tp" className="input-dark w-full" required value={f.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="">เลือกประเภท</option>
                    {PARTNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="pv">จังหวัด / พื้นที่ *</label>
                  <input id="pv" className="input-dark w-full" required value={f.province} onChange={(e) => set("province", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="cn">ผู้ติดต่อ *</label>
                  <input id="cn" className="input-dark w-full" required value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="tel">โทร *</label>
                  <input id="tel" type="tel" inputMode="tel" className="input-dark w-full" required value={f.tel} onChange={(e) => set("tel", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="em">อีเมล *</label>
                  <input id="em" type="email" className="input-dark w-full" required value={f.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="ln">LINE ID</label>
                  <input id="ln" className="input-dark w-full" value={f.line_id} onChange={(e) => set("line_id", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="lk">เว็บไซต์ / IG / FB</label>
                  <input id="lk" className="input-dark w-full" value={f.links} onChange={(e) => set("links", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <span className={label}>แพ็กเกจที่สนใจ *</span>
                  <div className="flex flex-wrap gap-2">
                    {PACKAGE_KEYS.map((k) => (
                      <button type="button" key={k} onClick={() => set("package", k)} className={`chip h-10 px-4 ${f.package === k ? "chip-red" : ""}`}>
                        {PARTNER_PACKAGES[k].label} · {priceText(k)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="msg">ข้อความ</label>
                  <textarea id="msg" rows={4} className="input-dark w-full" value={f.message} onChange={(e) => set("message", e.target.value)} />
                </div>
                <label className="sm:col-span-2 flex gap-3 text-sm text-ink-300">
                  <input type="checkbox" className="mt-1 accent-[var(--color-crimson-500)]" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
                  <span>ยินยอมให้ {BRAND.name} เก็บและใช้ข้อมูลข้างต้นเพื่อติดต่อกลับและพิจารณาการเป็นพาร์ทเนอร์ ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
                </label>
              </div>
              {err && <p role="alert" className="mt-4 rounded-xl border border-crimson-500 bg-crimson-500/10 px-4 py-2 text-sm">{err}</p>}
              <button type="submit" disabled={busy} className="mt-6 w-full btn-crimson h-12 rounded-full font-semibold disabled:opacity-60">
                {busy ? "กำลังส่ง…" : "ส่งข้อมูลสมัคร"}
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-ink-600 py-8 text-center text-xs text-ink-300">
        © {BRAND.name} — By Madame Gor · {BRAND.domain}
      </footer>
    </main>
  );
}
