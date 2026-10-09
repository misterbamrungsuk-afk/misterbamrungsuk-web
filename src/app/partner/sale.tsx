"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/join/config";
import { SiteHeader } from "@/components/site-header";
import {
  BOOKING_COMMISSION, PACKAGE_KEYS, PARTNER_APPLY_TYPES, PARTNER_PACKAGES, SELL_PRICE_NOTE, baht,
  type PartnerPackageKey,
} from "@/lib/partner/config";

// หน้าขายพาร์ทเนอร์ (สปา/โรงแรม) — ตามบอร์ด Partner.dc.html (390px, กว้างสุด 480px)

const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";

const WHY = [
  ["คลิปโปรโมทโดยทีมแบรนด์", "1 คลิป/แพ็กเกจ ลง IG & FB ของแบรนด์"],
  ["มีฐานลูกค้าพรีเมียมรองรับ", "เรารับจองให้ ไม่ต้องหาลูกค้าเอง"],
  ["ช่วยตั้งราคาขาย (mark up)", "ตั้งราคาขายบนแพลตฟอร์มให้เหมาะกับตลาดพรีเมียม"],
  ["ป้ายรับรองแบรนด์", "ได้ป้าย “ทำงานร่วมกับ Mister Bamrungsuk”"],
];
const CONDS = [
  ["มาตรฐานการนวดเทียบเท่า Bamrungsuk", "ผ่านการตรวจมาตรฐานจากทีมงานก่อนเปิดขาย"],
  ["ยินยอมให้ทีมงาน QC", "ตรวจก่อนเริ่ม และสุ่ม QC ตลอดระยะแพ็กเกจ"],
  ["รับจองผ่านแพลตฟอร์ม", `เราหัก ${BOOKING_COMMISSION}% ต่อ booking ที่มาจากแพลตฟอร์ม`],
  ["ราคาขายผ่านแพลตฟอร์ม", `เราช่วย mark up ราคา · ราคาขายต่อบริการ ${SELL_PRICE_NOTE}`],
  ["ชำระค่าป้ายแบรนด์", "พาร์ทเนอร์ชำระค่าป้ายแบรนด์ [รอกำหนด]"],
];
const KINDS = [
  ["/brand/venue.jpg", "สปา", "เดย์สปา · สปาเพื่อสุขภาพ · ทั่วประเทศ"],
  ["/brand/hotel1.jpg", "โรงแรม", "โรงแรม · สปาในโรงแรม"],
];
const STEPS = ["ส่งใบสมัคร", "ชำระแพ็กเกจ (QR + สลิป)", "นัด QC สถานที่ · มาตรฐานเทียบเท่า Bamrungsuk", "ทำสัญญา + ป้ายแบรนด์ · ถ่ายคลิปโปรโมท", "เปิดแสดงบนแพลตฟอร์ม"];
const FAQ = [
  ["หักค่าธรรมเนียมเท่าไร", `หัก ${BOOKING_COMMISSION}% ต่อ booking ที่มาจากแพลตฟอร์ม (กำลังสรุปอัตรา)`],
  ["โรงแรมสมัครได้ไหม", "ได้ ทั้งโรงแรมที่มีสปาและโรงแรมที่ต้องการขายห้องพัก/แพ็กเกจผ่านแพลตฟอร์ม"],
  ["QC ตรวจอะไรบ้าง", "มาตรฐานการนวด ความสะอาด ห้อง/สถานที่ ใบอนุญาต และเอกสาร"],
  ["ค่าป้ายแบรนด์เท่าไร", "ค่าป้ายแบรนด์ [รอกำหนด] แจ้งให้ทราบก่อนทำสัญญา"],
];

type Form = {
  business_name: string; type: string; province: string; contact_name: string; tel: string; email: string;
  line_id: string; links: string; package: PartnerPackageKey; message: string; consent: boolean; website: string;
};
const EMPTY: Form = { business_name: "", type: PARTNER_APPLY_TYPES[0], province: "", contact_name: "", tel: "", email: "", line_id: "", links: "", package: "6m", message: "", consent: false, website: "" };

const priceText = (k: PartnerPackageKey) => {
  const p = PARTNER_PACKAGES[k].price;
  return p == null ? "ติดต่อทีมงาน" : `฿${baht(p)}`;
};

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="font-lux m-0 mb-2.5 font-semibold text-[19px]">{children}</h2>;
const INPUT = "h-[46px] w-full rounded-xl border border-[rgba(240,200,90,.38)] bg-[#130e0e] px-3 text-[14px] text-[#f6efe4] placeholder:text-[#7d6d6a] outline-none focus:border-[#f0c75a]";
const LBL = "flex flex-col gap-[5px] text-[12px] text-[#cdbfb3]";
const RED = "btn-red-lux !border-[1.5px] !border-[#ffd76a] rounded-full text-white font-semibold";

export function PartnerSalePage({ hero }: { hero?: string }) {
  const [f, setF] = useState<Form>(EMPTY);
  const [faq, setFaq] = useState<number>(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState("");
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const sel = PARTNER_PACKAGES[f.package];
  const payHref = token && sel.price != null ? `/partner/pay?t=${encodeURIComponent(token)}&pkg=${f.package}` : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!f.consent) return setErr("กรุณายินยอมการเก็บข้อมูลส่วนบุคคล (PDPA)");
    setBusy(true);
    try {
      const res = await fetch("/api/partner/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, turnstile: ts }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; token?: string };
      if (!res.ok || !out.ok) { setErr(out.error || "ส่งไม่สำเร็จ กรุณาลองใหม่"); setTs(""); setTsKey((k) => k + 1); }
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

  return (
    <main className="font-lux-body min-h-dvh bg-[#0e0a0a] text-[#f6efe4]">
      <div className="relative mx-auto w-full max-w-[480px] overflow-x-hidden pb-[110px]">
        <SiteHeader pill="PARTNER" />
        {/* Hero */}
        <div className="relative h-[380px]">
          <img src={hero || "/brand/venue.jpg"} alt="" className="block h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,10,10,.55),rgba(14,10,10,.2)_40%,#0e0a0a)]" />
          <div className="absolute inset-x-4 bottom-4">
            <div className="text-[11px] font-semibold tracking-[3px] text-[#f0c75a]">สปาทั่วประเทศ · โรงแรม</div>
            <h1 className="font-lux mt-1.5 text-[28px] font-bold leading-[1.2] [text-wrap:balance]">ขายบริการของคุณ<br /><span className="text-[#ffd76a]">ผ่าน Mister Bamrungsuk</span></h1>
            <div className="mt-2.5 inline-flex rounded-full border border-[rgba(212,175,55,.55)] bg-black/45 px-3 py-1.5 text-[11.5px] text-[#eed58a]">
              แพ็กเกจเริ่มต้น <b className="text-[#ffd76a]">&nbsp;{priceText("3m")} / {PARTNER_PACKAGES["3m"].label}</b>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[22px] px-4">
          <p className="m-0 text-[13.5px] leading-[1.7] text-[#cdbfb3]">เปิดรับสปาทั่วประเทศและโรงแรมมาร่วมเป็นพาร์ทเนอร์ ขายบริการให้ลูกค้ากลุ่มพรีเมียมของเรา เราดูแล QC รับจองให้ และช่วยตั้งราคาขายบนแพลตฟอร์ม</p>

          <section>
            <H2>ทำไมต้องเป็นพาร์ทเนอร์</H2>
            <div className="rounded-[18px] border border-[rgba(240,200,90,.65)] bg-[#241717] px-3.5">
              {WHY.map(([t, d], i) => (
                <div key={t} className="flex items-center gap-3 py-3" style={{ borderTop: `1px solid ${i ? "rgba(255,255,255,.07)" : "transparent"}` }}>
                  <span className="font-lux w-[30px] shrink-0 text-[22px] font-bold text-[#ffd76a]">0{i + 1}</span>
                  <div className="min-w-0"><div className="text-[14px] font-semibold">{t}</div><div className="text-[12px] text-[#cdbfb3]">{d}</div></div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <H2>เงื่อนไขพาร์ทเนอร์</H2>
            <div className="flex flex-col gap-2">
              {CONDS.map(([t, d]) => (
                <div key={t} className="flex items-start gap-2.5 rounded-[14px] border bg-[#241717] px-3.5 py-3" style={{ borderColor: LINE }}>
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-[#f0c75a] text-[12px] text-[#ffd76a]">✓</span>
                  <div className="min-w-0"><div className="text-[14px] font-semibold text-[#eed58a]">{t}</div><div className="mt-0.5 text-[12px] text-[#cdbfb3]">{d}</div></div>
                </div>
              ))}
            </div>
          </section>

          <section id="packages">
            <H2>แพ็กเกจและสิ่งที่ได้รับ</H2>
            <div className="flex flex-col gap-2.5">
              {PACKAGE_KEYS.map((k) => {
                const p = PARTNER_PACKAGES[k];
                const on = f.package === k;
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => set("package", k)}
                    className="lux-card flex w-full min-w-0 flex-col gap-1.5 rounded-[18px] p-4 text-left text-[#f6efe4]"
                    style={{ border: `1.5px solid ${on ? GOLD : LINE}`, background: on ? "rgba(240,200,90,.16)" : "#241717" }}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] tracking-[2px] text-[#ffd76a]">แพ็กเกจ {p.months}M</span>
                      {p.badge && <span className="rounded-full bg-[#f0c75a] px-2 py-0.5 text-[11px] font-semibold text-[#0e0a0a]">{p.badge}</span>}
                    </span>
                    <span className="font-lux text-[17px] font-semibold">แพ็กเกจพาร์ทเนอร์ {p.label}</span>
                    <span className="text-[13px]">ค่าแพ็กเกจ <span className="font-lux text-[24px] font-bold text-[#ffd76a]">{p.price == null ? "ติดต่อทีมงาน" : `฿${baht(p.price)}`}</span> บาท</span>
                    <span className="text-[12.5px] leading-[1.6] text-[#d3c7bc]"><b className="text-[#ffd76a]">[รอกำหนด ฿]</b> ค่าป้ายแบรนด์ (ชำระเพิ่ม)</span>
                    <span className="text-[12.5px] leading-[1.6] text-[#d3c7bc]"><b className="text-[#ffd76a]">{BOOKING_COMMISSION}%</b> การหักต่อ booking ที่มาจากแพลตฟอร์ม</span>
                    <span className="text-[12.5px] leading-[1.6] text-[#d3c7bc]"><b className="text-[#ffd76a]">{SELL_PRICE_NOTE}</b> ราคาขายต่อบริการ (ช่วย mark up ให้)</span>
                    <span className="rounded-[10px] border border-[rgba(240,200,90,.65)] bg-[rgba(240,200,90,.18)] px-2.5 py-2 text-[12px] leading-[1.7] text-[#eed58a]">สิ่งที่ได้รับ: คลิปโปรโมท 1 คลิปลง IG &amp; FB ของแบรนด์ · สุ่ม QC · โปรโมทผ่านแพลตฟอร์ม · ป้าย “ทำงานร่วมกับ Mister Bamrungsuk”</span>
                    <span className="text-[12px] text-[#cdbfb3]">ระยะเวลาแสดงบนแพลตฟอร์ม {p.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <H2>ประเภทพาร์ทเนอร์</H2>
            <div className="grid grid-cols-2 gap-2.5">
              {KINDS.map(([img, t, d]) => (
                <div key={t} className="min-w-0 overflow-hidden rounded-2xl border bg-[#241717]" style={{ borderColor: LINE }}>
                  <img src={img} alt="" className="block h-[110px] w-full object-cover" />
                  <div className="px-3 py-2.5"><div className="font-lux text-[15px] font-semibold">{t}</div><div className="text-[11.5px] text-[#cdbfb3]">{d}</div></div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <H2>ตัวอย่างการแสดงบนแพลตฟอร์ม</H2>
            <div className="overflow-hidden rounded-[18px] border border-[rgba(245,210,110,.85)] bg-[#241717]">
              <div className="relative h-[150px]">
                <img src="/brand/hotel2.jpg" alt="" className="block h-full w-full object-cover" />
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#f0c75a] bg-[rgba(14,10,10,.82)] px-2.5 py-[5px] text-[11px] font-semibold text-[#ffd76a]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 12 5 5 9-10" /></svg>ทำงานร่วมกับ Mister Bamrungsuk
                </span>
              </div>
              <div className="flex flex-col gap-1 px-3.5 py-3">
                <div className="flex justify-between gap-2"><span className="font-lux text-[16px] font-semibold">Siam Serenity Spa</span><span className="text-[12px] text-[#ffd76a]">★ 4.9</span></div>
                <div className="text-[12px] text-[#cdbfb3]">เชียงใหม่ · นิมมานเหมินท์ · ผ่าน QC มาตรฐาน</div>
                <div className="mt-1.5 flex items-center justify-between"><span className="text-[12.5px]">นวดอโรมา 90 นาที</span><span className="font-lux font-bold text-[#ffd76a]">{SELL_PRICE_NOTE}</span></div>
              </div>
            </div>
          </section>

          <section>
            <H2>เริ่มต้นใน 5 ขั้นตอน</H2>
            {STEPS.map((t, i) => (
              <div key={t} className="flex items-center gap-3 border-b border-[#21191a] py-2">
                <span className="font-lux grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#f0c75a] text-[13px] text-[#ffd76a]">{i + 1}</span>
                <span className="min-w-0 text-[13.5px]">{t}</span>
              </div>
            ))}
          </section>

          <section>
            <H2>คำถามที่พบบ่อย</H2>
            {FAQ.map(([q, a], i) => (
              <div key={q} className="border-b" style={{ borderColor: LINE }}>
                <button type="button" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-2.5 bg-transparent py-3.5 text-left text-[14px] text-[#f6efe4]">
                  {q}<span className="shrink-0 text-[18px] text-[#f0c75a]">{faq === i ? "−" : "+"}</span>
                </button>
                {faq === i && <div className="pb-3.5 text-[13px] leading-[1.65] text-[#cdbfb3]">{a}</div>}
              </div>
            ))}
          </section>

          {/* Apply */}
          <div id="apply" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[20px] border border-[rgba(245,210,110,.85)] bg-[#241717] p-4">
            {done ? (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-[#f0c75a] text-[#ffd76a]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5 9-10" /></svg>
                </div>
                <div className="font-lux text-[18px] font-semibold">ได้รับใบสมัครแล้ว</div>
                <div className="text-[13px] text-[#cdbfb3]">ขั้นต่อไป: ชำระแพ็กเกจ {sel.label} แล้วทีมงานจะติดต่อนัด QC สถานที่</div>
                {payHref
                  ? <a href={payHref} className={`${RED} font-lux mt-1 grid h-[52px] w-full place-items-center text-[15px] no-underline`}>ไปชำระแพ็กเกจ</a>
                  : <div className="text-[13px] text-[#cdbfb3]">ทีมงานจะติดต่อกลับภายใน 24 ชม.</div>}
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-2.5">
                <div className="font-lux text-[17px] font-semibold">สมัครเป็นพาร์ทเนอร์</div>
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} />
                <label className={LBL}>ชื่อธุรกิจ
                  <input className={INPUT} placeholder="ชื่อธุรกิจ" required value={f.business_name} onChange={(e) => set("business_name", e.target.value)} />
                </label>
                <div className="text-[12px] text-[#cdbfb3]">ประเภทธุรกิจ</div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="ประเภทธุรกิจ">
                  {PARTNER_APPLY_TYPES.map((t) => {
                    const on = f.type === t;
                    return (
                      <button key={t} type="button" role="radio" aria-checked={on} onClick={() => set("type", t)}
                        className="h-9 rounded-full px-3 text-[12.5px] font-semibold"
                        style={{ border: `1px solid ${on ? GOLD : LINE}`, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>{t}</button>
                    );
                  })}
                </div>
                <label className={LBL}>ผู้ติดต่อ
                  <input className={INPUT} placeholder="ชื่อผู้ติดต่อ" required value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={LBL}>เบอร์โทร
                    <input className={INPUT} type="tel" inputMode="tel" placeholder="08x-xxx-xxxx" required value={f.tel} onChange={(e) => set("tel", e.target.value)} />
                  </label>
                  <label className={LBL}>LINE ID
                    <input className={INPUT} placeholder="(ถ้ามี)" value={f.line_id} onChange={(e) => set("line_id", e.target.value)} />
                  </label>
                </div>
                <label className={LBL}>อีเมล
                  <input className={INPUT} type="email" placeholder="name@example.com" required value={f.email} onChange={(e) => set("email", e.target.value)} />
                </label>
                <label className={LBL}>จังหวัด / ย่าน
                  <input className={INPUT} placeholder="จังหวัด / ย่าน" required value={f.province} onChange={(e) => set("province", e.target.value)} />
                </label>
                <label className="flex gap-2.5 text-[12px] leading-[1.5] text-[#cdbfb3]">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#f0c75a]" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
                  <span>ยินยอมให้ {BRAND.name} เก็บและใช้ข้อมูลข้างต้นเพื่อติดต่อกลับและพิจารณาการเป็นพาร์ทเนอร์ ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
                </label>
                <Turnstile key={tsKey} onToken={setTs} />
                {err && <p role="alert" className="m-0 rounded-xl border border-[#ef6b7b] bg-[rgba(239,107,123,.1)] px-3 py-2 text-[13px] text-[#ffb3bd]">{err}</p>}
                <button type="submit" disabled={busy} className={`${RED} h-[52px] text-[15px] disabled:opacity-60`}>
                  {busy ? "กำลังส่ง…" : `ส่งใบสมัคร · ${sel.label}`}
                </button>
              </form>
            )}
          </div>
          <a href="/partner/login" className="p-1.5 text-center text-[13px] text-[#ffd76a] hover:text-[#eed58a]">เป็นพาร์ทเนอร์อยู่แล้ว? เข้าสู่ระบบ</a>
        </div>
        <SiteFooter />
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3 border-t bg-[rgba(14,10,10,.97)] px-4 pb-4 pt-3" style={{ borderColor: LINE }}>
          <div className="min-w-0">
            <div className="text-[11px] text-[#cdbfb3]">แพ็กเกจ {sel.label}</div>
            <div className="font-lux text-[22px] font-bold text-[#ffd76a]">{priceText(f.package)}</div>
          </div>
          <a href={payHref || "#apply"}
            className="btn-red-lux !border-[1.5px] !border-[#ffd76a] inline-flex h-[52px] items-center whitespace-nowrap rounded-full px-[18px] text-[14px] font-semibold text-white no-underline !shadow-[0_0_0_3px_rgba(255,59,85,.18),0_10px_28px_rgba(255,40,70,.45)]">
            {payHref ? "ไปชำระแพ็กเกจ" : "สมัคร · ไปชำระแพ็กเกจ"}
          </a>
        </div>
      </div>
    </main>
  );
}
