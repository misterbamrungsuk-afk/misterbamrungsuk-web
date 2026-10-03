"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { BRAND, CLOSE_AT, EXPERIENCE, FAQ, HERO_IMAGE, PACKAGES, QUOTA, STRENGTHS, TERMS_SUMMARY, type PackageKey } from "@/lib/join/config";
import { FORM_KEY, emptyForm, resizeImage, type FileField, type JoinForm } from "@/lib/join/form";

const WHY = [
  { t: "มาตรฐานสูง", d: "ศิลปะการบริการแบบ Butler", icon: "M12 3l2.6 5.6 6 .7-4.5 4 1.3 6L12 16.4 6.6 19.3l1.3-6-4.5-4 6-.7z" },
  { t: "กลุ่มลูกค้าชัดเจน", d: "สุภาพสตรีและชาวต่างชาติ", icon: "M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
  { t: "ความปลอดภัย", d: "ระบบคัดกรองลูกค้าที่รัดกุม", icon: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM8.5 12l2.5 2.5 4.5-5" },
  { t: "รายได้คุ้มค่า", d: "รับงานแบบ On-Demand", icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
];

const baht = (n: number) => n.toLocaleString("th-TH");

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function SalePage() {
  const router = useRouter();
  const [f, setF] = useState<JoinForm>(emptyForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [faq, setFaq] = useState<number | null>(0);
  const [seats, setSeats] = useState<{ left: number; closed: boolean } | null>(null);
  const [parallax, setParallax] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  useReveal();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      if (saved) setF({ ...emptyForm, ...JSON.parse(saved) });
    } catch {}
    fetch("/api/join/seats").then((r) => r.json()).then(setSeats).catch(() => {});
    const onScroll = () => {
      setParallax(Math.min(window.scrollY, 700) * 0.35);
      // แถบจองด้านล่าง: โผล่หลังพ้น hero และซ่อนเมื่อถึงฟอร์ม
      const formTop = formRef.current?.getBoundingClientRect().top ?? 9999;
      setShowBar(window.scrollY > window.innerHeight * 0.7 && formTop > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const set = <K extends keyof JoinForm>(k: K, v: JoinForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrs((e) => ({ ...e, [k]: "" }));
  };
  const toForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const pick = (k: PackageKey) => {
    set("package", k);
    setTimeout(toForm, 180);
  };

  const onFile = async (k: FileField, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs((e) => ({ ...e, [k]: "รับเฉพาะไฟล์รูปภาพ (ถ่ายรูปเอกสารได้)" }));
    set(k, await resizeImage(file, k === "photo" ? 1000 : 1400));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.package) e.package = "เลือกแพ็กเกจก่อน";
    if (!f.first_name.trim()) e.first_name = "กรอกชื่อ";
    if (!f.last_name.trim()) e.last_name = "กรอกนามสกุล";
    if (!f.nickname.trim()) e.nickname = "กรอกชื่อเล่น";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!/^0\d{9}$/.test(f.tel.replace(/[-\s]/g, ""))) e.tel = "เบอร์โทร 10 หลัก";
    if (!/^\d{5}$/.test(f.zipcode)) e.zipcode = "5 หลัก";
    if (!(+f.height >= 140 && +f.height <= 220)) e.height = "140–220";
    if (!(+f.weight >= 35 && +f.weight <= 200)) e.weight = "35–200";
    if (!f.experience) e.experience = "เลือกประสบการณ์";
    if (!f.photo) e.photo = "แนบรูปถ่าย";
    if (!f.id_card) e.id_card = "แนบบัตรประชาชน";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) {
      setTimeout(() => document.querySelector("[data-err='1']")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(f));
    } catch {
      return setErrs({ photo: "รูปใหญ่เกินไป ลองรูปอื่น" });
    }
    router.push("/join/pay");
  };

  const closeDate = new Date(CLOSE_AT).toLocaleDateString("th-TH", { month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
  const closed = seats?.closed ?? false;
  const left = seats?.left ?? QUOTA;
  const sel = f.package ? PACKAGES[f.package] : null;

  return (
    <div className="phone-stage">
      <main className="phone relative">
        {/* ── 1 · Hero (เต็มจอแนวตั้ง) ── */}
        <section className="relative h-[100dvh] min-h-[640px] flex flex-col overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-[118%] object-cover object-[50%_72%]" style={{ transform: `translateY(${parallax}px)` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-ink-900" />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-ink-900 via-ink-900/85 to-transparent" />
          <div className="absolute -left-24 bottom-24 w-72 h-72 rounded-full bg-gold-400/35 blur-3xl" />

          <header className="relative z-10 flex items-center justify-between px-5 pt-[max(14px,env(safe-area-inset-top))] h-16">
            <Logo size={28} />
            <span className="text-[10px] font-semibold tracking-[0.25em] text-gold-400 border border-gold-500/40 rounded-full px-3 py-1.5 bg-white/80 backdrop-blur">PREMIUM</span>
          </header>

          <div className="relative z-10 mt-auto px-5 pb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur border border-gold-500/50 pl-1.5 pr-3.5 py-1.5">
              <span className="w-6 h-6 rounded-full bg-gold-500 text-[#3a1208] grid place-items-center text-xs">⚡</span>
              <span className="text-[12px] text-gold-200 leading-tight">รับจำกัด {QUOTA} ท่าน · ถึงสิ้น {closeDate}</span>
            </div>

            <h1 className="font-display text-[34px] leading-[1.18] font-semibold mt-4 tracking-tight">
              ยกระดับอาชีพของคุณ<br />
              <span className="text-gradient-gold">สู่ผู้ให้บริการ<br />ระดับพรีเมียม</span>
            </h1>
            <p className="text-[15px] text-ink-200 mt-3 leading-relaxed">รายได้มั่นคง พร้อมการฝึกอบรมมาตรฐานสากล สำหรับดูแลลูกค้า VVIP <span className="text-gold-300">(เฉพาะสุภาพสตรี)</span></p>

            {/* แถบตัวเลขความน่าเชื่อถือ */}
            <div className="grid grid-cols-3 mt-5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur divide-x divide-white/10">
              {[
                [String(closed ? 0 : left), "ที่นั่งคงเหลือ"],
                ["2 วัน", "อบรมเข้มข้น"],
                ["VVIP", "ฐานลูกค้า"],
              ].map(([v, k]) => (
                <div key={k} className="py-3 text-center">
                  <p className="font-display text-lg font-semibold text-gold-300 leading-none">{v}</p>
                  <p className="text-[11px] text-ink-300 mt-1.5">{k}</p>
                </div>
              ))}
            </div>

            <button onClick={toForm} disabled={closed} className="btn-crimson w-full h-14 mt-5 font-display font-semibold text-[17px] flex items-center justify-center gap-2">
              {closed ? "ปิดรับสมัครแล้ว" : <>สมัครเข้าร่วมโครงการ <span aria-hidden>→</span></>}
            </button>
            <p className="text-center text-[11px] text-ink-400 mt-3 animate-bounce">เลื่อนดูรายละเอียด ↓</p>
          </div>
        </section>

        <div className="px-5">
          {/* ── 2 · Why choose us ── */}
          <section className="pt-8 pb-12">
            <SectionHead kicker="WHY US" title="ทำไมต้องร่วมงานกับเรา" />
            <div className="mt-6 rounded-[28px] border border-gold-500/25 bg-[linear-gradient(165deg,rgba(224,164,0,.08),rgba(255,255,255,.01)_45%)] px-5">
              {WHY.map((w, i) => (
                <div key={w.t} className={`reveal flex items-center gap-4 py-5 ${i ? "border-t border-white/[0.07]" : ""}`} style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className="font-display text-[28px] font-bold leading-none text-gradient-gold w-10 shrink-0 tabular-nums">0{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[16px] font-semibold">{w.t}</span>
                    <span className="block text-[13px] text-ink-300 mt-0.5">{w.d}</span>
                  </span>
                  <span className="w-10 h-10 rounded-full border border-gold-500/40 grid place-items-center text-gold-400 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d={w.icon} /></svg>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3 · Pricing ── */}
          <section className="pb-10" id="packages">
            <SectionHead kicker="PACKAGES" title="เลือกแพ็กเกจของคุณ" sub="ชำระครั้งเดียว รวมค่าอบรมแล้ว" />
            <div className="flex flex-col gap-4 mt-5" role="radiogroup" aria-label="แพ็กเกจ">
              {(Object.keys(PACKAGES) as PackageKey[]).map((k) => {
                const p = PACKAGES[k];
                const on = f.package === k;
                const premium = k === "B";
                return (
                  <button key={k} role="radio" aria-checked={on} onClick={() => pick(k)}
                    className={`reveal relative text-left rounded-[28px] p-[1.5px] transition active:scale-[0.99] ${on ? "bg-gradient-to-br from-gold-300 via-gold-500 to-crimson-500" : premium ? "bg-gradient-to-br from-gold-500/60 to-white/5" : "bg-[#3a1208]/[.06]"}`}>
                    <div className={`rounded-[26.5px] p-5 ${premium ? "bg-[linear-gradient(160deg,#fbefdd,#fff4e4_70%)]" : "bg-ink-850"}`}>
                      {premium && <span className="absolute -top-3 right-5 rounded-full bg-gold-500 text-[#3a1208] text-[11px] font-bold px-3 py-1 shadow-lg">PREMIUM</span>}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-500">แพ็กเกจ {k}</p>
                          <p className="font-display text-xl font-semibold mt-1">{p.name}</p>
                        </div>
                        <span className={`mt-1 w-7 h-7 rounded-full border-2 grid place-items-center shrink-0 ${on ? "border-gold-400 bg-gold-500" : "border-ink-500"}`}>
                          {on && <svg viewBox="0 0 24 24" fill="none" stroke="#fffaf2" strokeWidth="3" className="w-4 h-4"><path d="m5 12 5 5 9-10" /></svg>}
                        </span>
                      </div>
                      <p className="mt-4 flex items-baseline gap-1">
                        <span className="text-gold-400 text-lg">฿</span>
                        <span className="font-display text-[40px] leading-none font-bold text-gradient-gold">{baht(p.price)}</span>
                      </p>
                      <div className="h-px bg-[#3a1208]/[.06] my-4" />
                      <ul className="space-y-2.5 text-[14px] text-ink-100">
                        {p.items.map((it) => (
                          <li key={it} className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-gold-500/15 text-gold-400 grid place-items-center text-[11px] shrink-0 mt-0.5">✓</span>{it}
                          </li>
                        ))}
                      </ul>
                      <span className={`mt-5 h-12 grid place-items-center rounded-full font-semibold text-[15px] transition ${on ? "bg-gold-500 text-[#3a1208]" : "border border-white/15 text-ink-100"}`}>
                        {on ? "✓ เลือกแพ็กเกจนี้แล้ว" : "เลือกแพ็กเกจนี้"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 4 · FAQ ── */}
          <section className="pb-10">
            <SectionHead kicker="FAQ" title="คำถามที่พบบ่อย" />
            <div className="mt-5 space-y-2.5">
              {FAQ.map((x, i) => {
                const open = faq === i;
                return (
                  <div key={x.q} className={`reveal rounded-2xl border transition-colors ${open ? "border-gold-500/50 bg-white/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
                    <button onClick={() => setFaq(open ? null : i)} aria-expanded={open} className="w-full min-h-14 px-4 flex items-center justify-between gap-3 text-left text-[15px] font-medium">
                      {x.q}
                      <span className={`w-7 h-7 rounded-full grid place-items-center shrink-0 transition ${open ? "bg-gold-500 text-[#3a1208] rotate-45" : "bg-[#3a1208]/[.06] text-gold-400"}`}>+</span>
                    </button>
                    <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <p className="overflow-hidden px-4 text-[14px] text-ink-200 leading-relaxed"><span className="block pb-4">{x.a}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 5 · Registration form ── */}
          <section ref={formRef} className="pb-10 scroll-mt-3" id="register">
            <SectionHead kicker="STEP 1 / 3" title="ใบสมัคร" sub="ใช้เวลาประมาณ 2 นาที" />
            <Steps at={1} />

            <div className="flex flex-col gap-5 mt-5">
              <Card title="แพ็กเกจที่เลือก" err={errs.package}>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PACKAGES) as PackageKey[]).map((k) => (
                    <button key={k} type="button" onClick={() => set("package", k)} aria-pressed={f.package === k}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${f.package === k ? "border-gold-500 bg-gold-500/10" : "border-white/10"}`}>
                      <span className="block text-[11px] text-gold-500 font-semibold">แพ็กเกจ {k}</span>
                      <span className="block text-[13px] font-medium mt-0.5">{PACKAGES[k].name}</span>
                      <span className="block font-display text-gold-300 mt-1">฿{baht(PACKAGES[k].price)}</span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="ข้อมูลผู้สมัคร">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ชื่อ" err={errs.first_name}><input className="input-dark h-12" autoComplete="given-name" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
                  <Field label="นามสกุล" err={errs.last_name}><input className="input-dark h-12" autoComplete="family-name" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ชื่อเล่น" err={errs.nickname}><input className="input-dark h-12" value={f.nickname} onChange={(e) => set("nickname", e.target.value)} /></Field>
                  <Field label="รหัสไปรษณีย์" err={errs.zipcode}><input className="input-dark h-12" inputMode="numeric" maxLength={5} autoComplete="postal-code" value={f.zipcode} onChange={(e) => set("zipcode", e.target.value.replace(/\D/g, ""))} /></Field>
                </div>
                <Field label="เบอร์โทร" err={errs.tel}><input className="input-dark h-12" type="tel" autoComplete="tel" inputMode="tel" placeholder="08x-xxx-xxxx" value={f.tel} onChange={(e) => set("tel", e.target.value)} /></Field>
                <Field label="อีเมล" err={errs.email}><input className="input-dark h-12" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ส่วนสูง (ซม.)" err={errs.height}><input className="input-dark h-12" inputMode="numeric" value={f.height} onChange={(e) => set("height", e.target.value.replace(/\D/g, "").slice(0, 3))} /></Field>
                  <Field label="น้ำหนัก (กก.)" err={errs.weight}><input className="input-dark h-12" inputMode="numeric" value={f.weight} onChange={(e) => set("weight", e.target.value.replace(/\D/g, "").slice(0, 3))} /></Field>
                </div>
              </Card>

              <Card title="ประสบการณ์และจุดเด่น">
                <Field label="ประสบการณ์" err={errs.experience}>
                  <Seg options={EXPERIENCE} value={f.experience} onChange={(v) => set("experience", v)} />
                </Field>
                <Field label="จุดเด่นของคุณ (เลือกได้หลายข้อ)">
                  <div className="flex flex-wrap gap-2">
                    {STRENGTHS.map((x) => {
                      const on = f.skills.includes(x);
                      return (
                        <button key={x} type="button" aria-pressed={on} onClick={() => set("skills", on ? f.skills.filter((s) => s !== x) : [...f.skills, x])}
                          className={`h-10 px-4 rounded-full border text-[13px] transition ${on ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-white/15"}`}>{on ? "✓ " : ""}{x}</button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="แนะนำตัวสั้นๆ (ไม่บังคับ)"><textarea className="input-dark min-h-24 py-3" maxLength={1000} value={f.intro} onChange={(e) => set("intro", e.target.value)} placeholder="เล่าเกี่ยวกับตัวคุณ หรือเหตุผลที่สนใจ" /></Field>
              </Card>

              <Card title="รูปถ่ายและเอกสาร">
                <div className="grid grid-cols-2 gap-3">
                  <Upload label="รูปถ่ายหน้าตรง" hint="เห็นหน้าชัด" value={f.photo} err={errs.photo} onPick={(file) => onFile("photo", file)} />
                  <Upload label="บัตรประชาชน" hint="สำเนาพร้อมลงนาม" value={f.id_card} err={errs.id_card} onPick={(file) => onFile("id_card", file)} />
                </div>
                <p className="text-[12px] text-ink-400 -mt-1">ข้อมูลอื่น เช่น บัญชีรับเงินและที่อยู่ ทีมงานจะขอเพิ่มตอนอบรม</p>
              </Card>

              <Card title="เงื่อนไขและความยินยอม">
                <ul className="space-y-2 text-[13px] text-ink-300 leading-relaxed">
                  {TERMS_SUMMARY.map((t) => <li key={t} className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-[8px] shrink-0" /><span>{t}</span></li>)}
                </ul>
                <Consent checked={f.accept_terms} onChange={(v) => set("accept_terms", v)} required>
                  ข้าพเจ้าได้อ่านและยอมรับ <a href="/join/terms" target="_blank" rel="noopener" className="text-gold-300 underline underline-offset-2">ข้อกำหนดและเงื่อนไขการสมัคร</a> รวมถึงนโยบายการคืนเงิน
                </Consent>
                <Consent checked={f.consent_pdpa} onChange={(v) => set("consent_pdpa", v)} required>
                  ข้าพเจ้ายินยอมให้เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคล รวมถึงข้อมูลอ่อนไหวบนสำเนาบัตรประชาชน เพื่อพิจารณาการสมัครและยืนยันตัวตน ตาม <a href="/join/privacy" target="_blank" rel="noopener" className="text-gold-300 underline underline-offset-2">นโยบายความเป็นส่วนตัว</a>
                </Consent>
                <Consent checked={f.consent_marketing} onChange={(v) => set("consent_marketing", v)}>
                  ยินยอมรับข่าวสาร โปรโมชัน และรอบรับสมัครถัดไป (ไม่บังคับ ถอนได้ทุกเมื่อ)
                </Consent>
              </Card>

              <button onClick={next} disabled={!f.accept_terms || !f.consent_pdpa || closed} className="btn-crimson h-14 font-display font-semibold text-[17px]">
                {closed ? "ปิดรับสมัครแล้ว" : f.accept_terms && f.consent_pdpa ? "ถัดไป · ชำระค่าสมัคร →" : "ติ๊กยอมรับ 2 ข้อที่จำเป็นก่อน"}
              </button>
            </div>
          </section>
        </div>

        <footer className="px-6 pt-2 pb-8 text-center">
          <nav className="flex justify-center items-center gap-1 text-[13px]">
            <a href="/join/privacy" className="min-h-10 px-2 inline-flex items-center text-gold-300">นโยบายความเป็นส่วนตัว</a>
            <span className="text-ink-500" aria-hidden>·</span>
            <a href="/join/terms" className="min-h-10 px-2 inline-flex items-center text-gold-300">ข้อกำหนดการสมัคร</a>
          </nav>
          <p className="text-[11.5px] text-ink-400 leading-relaxed mt-2">
            ข้อมูลของคุณได้รับการคุ้มครองตาม<br />พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>
          <p className="text-[11px] text-ink-500 mt-3">© {new Date().getFullYear()} {BRAND.name}</p>
        </footer>

        {/* ── แถบจองลอยด้านล่าง ── */}
        <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 transition-all duration-300 ${showBar && !closed ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}>
          <div className="flex items-center gap-3 rounded-full bg-ink-950/90 backdrop-blur-xl border border-gold-500/30 pl-5 pr-1.5 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,.6)]">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-ink-300 truncate">{sel ? sel.name : `เหลือ ${left} ที่นั่ง`}</p>
              <p className="font-display text-gold-300 font-semibold leading-tight">{sel ? `฿${baht(sel.price)}` : `เริ่ม ฿${baht(PACKAGES.A.price)}`}</p>
            </div>
            <button onClick={toForm} className="btn-crimson h-12 px-6 font-semibold text-[15px] shrink-0">สมัครเลย</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="reveal">
      <p className="text-[11px] font-semibold tracking-[0.25em] text-gold-500">{kicker}</p>
      <h2 className="font-display text-[26px] font-semibold mt-1 leading-tight">{title}</h2>
      {sub && <p className="text-[13px] text-ink-300 mt-1">{sub}</p>}
    </div>
  );
}

function Steps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5 mt-4" aria-label={`ขั้นตอน ${at} จาก 3`}>
      {["ใบสมัคร", "ชำระเงิน", "รับรหัส MB"].map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-1.5 rounded-full ${i < at ? "bg-gradient-to-r from-gold-400 to-gold-600" : "bg-[#3a1208]/[.06]"}`} />
          <p className={`text-[11px] mt-1.5 ${i + 1 === at ? "text-gold-300" : "text-ink-400"}`}>{s}</p>
        </div>
      ))}
    </div>
  );
}

function Seg({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((x) => (
        <button key={x} type="button" aria-pressed={value === x} onClick={() => onChange(x)}
          className={`h-11 rounded-full border text-[13px] transition ${value === x ? "border-gold-500 bg-gold-500 text-[#3a1208] font-semibold" : "border-white/15"}`}>{x}</button>
      ))}
    </div>
  );
}

function Upload({ label, hint, value, err, onPick }: { label: string; hint: string; value: string; err?: string; onPick: (f?: File) => void }) {
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer min-w-0" data-err={err ? "1" : undefined}>
      <span className={`relative aspect-[4/5] rounded-2xl overflow-hidden grid place-items-center border-2 bg-white/[0.03] ${value ? "border-gold-500" : err ? "border-crimson-500 border-dashed" : "border-gold-500/40 border-dashed"}`}>
        {value
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover" />
          : <span className="flex flex-col items-center gap-1.5 text-gold-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-8 h-8"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
              <span className="text-[11px]">แตะเพื่อเลือก</span>
            </span>}
        {value && <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-gold-500 text-[#3a1208] grid place-items-center text-xs font-bold">✓</span>}
      </span>
      <span className="text-[13px] font-medium leading-tight">{label}</span>
      <span className="text-[11px] text-ink-400 leading-tight -mt-1">{hint}</span>
      {err && <span role="alert" className="text-[11px] text-crimson-300">{err}</span>}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
    </label>
  );
}

function Consent({ checked, onChange, required, children }: { checked: boolean; onChange: (v: boolean) => void; required?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 cursor-pointer transition ${checked ? "border-gold-500 bg-gold-500/10" : "border-white/15"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#e0a400] shrink-0" />
      <span className="text-[13.5px] leading-relaxed">
        {children}
        {required && <span className="text-crimson-300"> *</span>}
      </span>
    </label>
  );
}

function Card({ title, err, children }: { title: string; err?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border p-4 flex flex-col gap-4 bg-white/[0.03] ${err ? "border-crimson-500" : "border-white/10"}`} data-err={err ? "1" : undefined}>
      <p className="text-[15px] font-semibold">{title}</p>
      {children}
      {err && <span role="alert" className="text-xs text-crimson-300 -mt-2">{err}</span>}
    </div>
  );
}

function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0" data-err={err ? "1" : undefined}>
      <span className="text-[13px] text-ink-300">{label}</span>
      {children}
      {err && <span role="alert" className="text-xs text-crimson-300">{err}</span>}
    </div>
  );
}
