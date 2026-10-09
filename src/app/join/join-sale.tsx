"use client";
/* eslint-disable @next/next/no-img-element */

// หน้า sale รับสมัคร Part-Time (ตามบอร์ด Join.dc.html) — ฟอร์มสมัครย้ายไป /join/apply
// (ฟอร์มเดิมสำรองไว้ที่ ./_legacy-form.tsx.txt)
import { useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FAQ, INVITE, LOOKING_FOR, PACKAGES, SALE_CARDS, TIMELINE, type PackageKey } from "@/lib/join/config";

const fmt = (n: number) => n.toLocaleString("en-US");

const TH = {
  A: {
    tx: "#fff6e3", sub2: "#d9cbb5", lab: "#f0c75a", codeBg: "#f0c75a", codeFg: "#1a1206", price: "#ffd76a",
    div: "rgba(240,200,90,.3)", kc: "#f0c75a", vc: "#ffffff", nc: "#bfb3a3",
    hl: { bg: "rgba(240,200,90,.14)", kc: "#ffd76a", vc: "#ffffff", nc: "#e0d2bd" },
    tickOn: { bg: "linear-gradient(180deg,#ffe08a,#f0c75a)", fg: "#1a1206", bd: "#ffe08a" }, tickOff: { bg: "transparent", fg: "#f6efe4", bd: "rgba(240,200,90,.55)" },
    bg: "linear-gradient(160deg, #1f1c18 0%, #0b0a09 100%)", bdOn: "#f0c75a", bdOff: "rgba(240,200,90,.4)", sh: "0 0 0 3px rgba(240,200,90,.4), 0 18px 36px rgba(0,0,0,.6)",
  },
  B: {
    tx: "#1a1206", sub2: "#3d2c10", lab: "#5a3c06", codeBg: "#1a1206", codeFg: "#ffd76a", price: "#1a1206",
    div: "rgba(26,18,6,.25)", kc: "#5a3c06", vc: "#1a1206", nc: "#3d2c10",
    hl: { bg: "#1a1206", kc: "#ffd76a", vc: "#ffffff", nc: "#e6d3a8" },
    tickOn: { bg: "#1a1206", fg: "#ffd76a", bd: "#1a1206" }, tickOff: { bg: "transparent", fg: "#1a1206", bd: "rgba(26,18,6,.5)" },
    bg: "linear-gradient(160deg, #f8e3a3 0%, #ecc976 50%, #ddb257 100%)", bdOn: "#fff1c4", bdOff: "rgba(255,225,150,.6)", sh: "0 0 0 3px rgba(255,235,170,.55), 0 0 28px rgba(255,200,80,.4), 0 18px 36px rgba(0,0,0,.55)",
  },
} as const;

const KEYS: PackageKey[] = ["A", "B"];
const kicker = "text-[10.5px] tracking-[2.5px] text-[#ffd76a] text-center";
const h2 = "font-lux font-semibold text-[21px] text-center";

export function JoinSalePage({ poster }: { poster: string }) {
  const [pkg, setPkg] = useState<PackageKey>("B");
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const sel = SALE_CARDS[pkg];

  return (
    <main className="min-h-dvh bg-[#0e0a0a]">
      <div className="mb-page font-lux-body relative mx-auto w-full max-w-[480px] overflow-hidden pb-6">
        <SiteHeader />

        <img src={poster} alt="เปิดรับสมัครทีม Part-time Mister Bamrungsuk · เพื่อนกินเที่ยว 2 แพ็กเกจ · รับสมัคร 20 ต.ค. – 10 พ.ย." className="w-full block border-y border-[rgba(240,200,90,.5)]" />

        <div className="px-4 pt-[22px] flex flex-col gap-[30px]">
          {/* คำเชิญ */}
          <section className="text-center flex flex-col gap-1.5 items-center">
            <p className="m-0 text-[14px] leading-[1.5] text-[#f6efe4] [text-wrap:balance]">
              {INVITE.lead} <br />{INVITE.body} <b className="text-[#ffd76a]">Mister Bamrungsuk</b> <br />{INVITE.bodyEnd}
            </p>
            <p className="m-0 text-[13px] leading-[1.45] text-[#cdbfb3]">{INVITE.sub} <br />{INVITE.sub2}</p>
          </section>

          {/* คุณสมบัติ */}
          <section>
            <div className={kicker}>WHO WE ARE LOOKING FOR</div>
            <h2 className={`${h2} mt-0.5 mb-2`}>คุณสมบัติที่เรามองหา</h2>
            <div className="flex flex-wrap justify-center gap-1.5 mb-2.5">
              {INVITE.traits.map((t) => (
                <span key={t} className="px-3 py-[5px] rounded-full border border-[#f0c75a] text-[#ffd76a] text-[12.5px]">✓ {t}</span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {LOOKING_FOR.map((x) => (
                <div key={x.t} className="px-1">
                  <div className="font-lux font-semibold text-[16px] leading-[1.3] text-[#ffd76a]">{x.t}</div>
                  <div className="text-[13px] text-[#d3c7bc] mt-px leading-[1.45]">{x.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* แพ็กเกจ */}
          <section className="-mx-4 px-4 pt-[26px] pb-14 -mb-[46px]" style={{ background: "linear-gradient(180deg, #0e0a0a 0%, #2a0a10 16%, #6e1020 40%, #6e1020 64%, #4a0c17 78%, #2a0a10 90%, #0e0a0a 100%)" }}>
            <h2 className={`${h2} mt-1 mb-1.5`}>เลือกแพ็กเกจของคุณ</h2>
            <p className="m-0 mb-3.5 text-[12.5px] leading-[1.65] text-[#cdbfb3] text-center">
              ค่าการันตี Branding <b className="text-[#ffd76a]">ได้รับคืนเต็มจำนวน</b> เมื่อครบ 1 ปี <br />หากไม่ทำผิดกฎบริษัทและกฎหมาย
            </p>
            <div className="grid grid-cols-2 gap-2 items-stretch">
              {KEYS.map((k) => {
                const T = TH[k], C = SALE_CARDS[k], on = pkg === k, tk = on ? T.tickOn : T.tickOff;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPkg(k)}
                    aria-pressed={on}
                    className="min-w-0 px-[9px] py-2.5 rounded-2xl text-left flex flex-col gap-1.5 transition-all duration-300 cursor-pointer"
                    style={{ border: `1.5px solid ${on ? T.bdOn : T.bdOff}`, background: T.bg, color: T.tx, boxShadow: on ? T.sh : "none", opacity: on ? 1 : 0.5, filter: on ? "none" : "saturate(.4) brightness(.75)", transform: on ? "scale(1.03)" : "scale(.95)" }}
                  >
                    <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[.5px]" style={{ background: T.codeBg, color: T.codeFg }}>{C.code}</span>
                    <span>
                      <span className="flex items-center flex-nowrap gap-1 whitespace-nowrap">
                        <span className="font-lux font-bold text-[15px] leading-[1.2]" style={{ color: T.tx }}>{C.title}</span>
                        {C.premium && <span className="shrink-0 px-1 py-px rounded bg-[#1a1206] text-[#ffd76a] font-lux text-[9.5px] font-bold">PREMIUM</span>}
                      </span>
                      <span className="block text-[11px] font-semibold" style={{ color: T.lab }}>{C.track}</span>
                    </span>
                    <span className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-[10px] font-semibold" style={{ color: T.sub2 }}>เริ่มต้น</span>
                      <span className="font-lux font-bold text-[26px] leading-[1.05]" style={{ color: T.price }}>{fmt(PACKAGES[k].price)}</span>
                      <span className="text-[11px] font-semibold" style={{ color: T.sub2 }}>บาท</span>
                    </span>
                    <span className="h-px" style={{ background: T.div }} />
                    <span className="flex-1 flex flex-col gap-[5px]">
                      {C.lines.map((l, i) => {
                        const h = i === 3;
                        return (
                          <span key={l.k} className="flex flex-col rounded-[9px]" style={{ padding: h ? "6px 8px" : 0, background: h ? T.hl.bg : "transparent" }}>
                            <span className="flex justify-between items-baseline flex-wrap gap-x-1">
                              <span className="leading-[1.4]" style={{ fontSize: h ? "11.5px" : "11px", fontWeight: h ? 700 : 500, color: h ? T.hl.kc : T.kc }}>{l.k}</span>
                              <span className="text-[12.5px] font-bold leading-[1.4]" style={{ color: h ? T.hl.vc : T.vc }}>{l.v}</span>
                            </span>
                            {l.n && <span className="text-[10px] leading-[1.4]" style={{ color: h ? T.hl.nc : T.nc }}>{l.n}</span>}
                          </span>
                        );
                      })}
                    </span>
                    <span className="text-center text-[11.5px] font-bold p-1.5 rounded-full" style={{ border: `1px solid ${tk.bd}`, background: tk.bg, color: tk.fg }}>{on ? "✓ แพ็กเกจที่เลือก" : "แตะเพื่อเลือก"}</span>
                  </button>
                );
              })}
            </div>

            {/* แถบสรุป + CTA (sticky ภายในส่วนแพ็กเกจ) */}
            <div className="sticky bottom-3 z-10 mt-4 py-3 pr-3 pl-3.5 rounded-2xl bg-[rgba(14,10,10,.92)] border border-[rgba(240,200,90,.5)] flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-[11px] text-[#cdbfb3] whitespace-nowrap overflow-hidden text-ellipsis">{sel.code} · {sel.title}{sel.premium ? " PREMIUM" : ""}</div>
                <div className="font-lux font-bold text-[20px] text-[#7fd6a3]">฿{fmt(PACKAGES[pkg].price)}</div>
              </div>
              <Link
                href={`/join/apply?pkg=${pkg}`}
                className="shrink-0 min-h-[52px] px-[18px] py-1.5 rounded-2xl text-white hover:text-white font-lux font-semibold text-[14px] leading-[1.3] no-underline flex items-center text-center"
                style={{ background: "linear-gradient(100deg, #7e0a1e 0%, #c8102e 24%, #ff5068 50%, #c8102e 76%, #7e0a1e 100%)", border: "1.5px solid #ffd76a", boxShadow: "0 0 0 3px rgba(255,59,85,.18), 0 10px 28px rgba(255,40,70,.45)" }}
              >
                สมัครและชำระเงิน<br />เริ่มต้นทันที
              </Link>
            </div>
          </section>

          {/* กำหนดการ */}
          <section>
            <div className={kicker}>TIMELINE</div>
            <h2 className={`${h2} mt-1 mb-3`}>กำหนดการ</h2>
            <div className="flex flex-col pl-1.5">
              {TIMELINE.map((t) => (
                <div key={t.t} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span className="w-3 h-3 rounded-full bg-[#f0c75a] shadow-[0_0_0_4px_rgba(240,200,90,.2)] mt-1" />
                    <span className="flex-1 w-0.5 bg-[rgba(240,200,90,.35)]" />
                  </span>
                  <span className="pb-3.5">
                    <span className="block text-[12px] text-[#ffd76a]">{t.d}</span>
                    <span className="block text-[14px]">{t.t}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className={`${h2} mb-1`}>คำถามที่พบบ่อย</h2>
            {FAQ.map((f, i) => {
              const o = !!faqOpen[i];
              return (
                <div key={f.q} className="border-b border-[rgba(240,200,90,.3)]">
                  <button type="button" onClick={() => setFaqOpen((s) => ({ ...s, [i]: !o }))} aria-expanded={o} className="w-full flex justify-between items-center gap-2.5 py-3.5 bg-transparent border-0 text-[#ffd76a] font-lux font-medium text-[14.5px] text-left cursor-pointer">
                    {f.q}<span className="text-[#f0c75a] text-[18px]">{o ? "−" : "+"}</span>
                  </button>
                  {o && <div className="pb-3.5 text-[13px] text-[#cdbfb3] leading-[1.65]">{f.a}</div>}
                </div>
              );
            })}
          </section>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
