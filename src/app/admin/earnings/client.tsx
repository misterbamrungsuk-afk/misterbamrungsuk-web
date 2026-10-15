"use client";

// ราคาและส่วนแบ่ง (บอร์ด A-Earnings) — แก้แล้วกด "บันทึก" มีผลกับหน้า /join/earnings และราคาบนการ์ดโปรไฟล์ทันที
import { useState } from "react";
import { Card, PageHead } from "../admin-nav";
import type { EarningsSettings, Tier } from "@/lib/join/earnings-settings";

const GOLD = "#e8c472";
const inp = "h-10 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 text-[14px] tabular-nums outline-none focus:border-gold-500";
const thTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");

export function EarningsAdmin({ initial }: { initial: EarningsSettings }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const up = (f: (x: EarningsSettings) => EarningsSettings) => { setS((x) => f(structuredClone(x))); setDirty(true); setMsg(null); };
  const price = (svc: "eat" | "massage", tier: "top" | "silver", v: string) => up((x) => { x.price3h[svc][tier] = Math.max(0, Math.round(+v || 0)); return x; });
  const tier = (i: number, k: keyof Tier, v: string) => up((x) => { (x.tiers[i] as Record<string, number | null>)[k] = k === "max" && v.trim() === "" ? null : +v; return x; });

  const save = async () => {
    setBusy(true); setMsg(null);
    const { history: _h, ...body } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res = await fetch("/api/admin/earnings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { ok?: boolean; data?: EarningsSettings; error?: string } | null;
    setBusy(false);
    if (d?.ok && d.data) { setS(d.data); setDirty(false); setMsg({ ok: true, t: "บันทึกแล้ว · หน้ารายได้ของผู้สมัครใช้ตัวเลขนี้แล้ว" }); }
    else setMsg({ ok: false, t: d?.error ?? "บันทึกไม่สำเร็จ" });
  };

  // ตัวอย่างที่ผู้สมัครเห็น: สายนวด · TOP · 15 นัด/เดือน (ตามบอร์ด)
  const ex = 15;
  const pct = s.tiers.reduce((p, t) => (ex >= t.min ? t.pct : p), s.tiers[0]?.pct ?? 0);

  return (
    <>
      <PageHead title="ราคาและส่วนแบ่ง (หน้าสมัครอบรม)" sub="PRICING · REVENUE SHARE · มีผลกับหน้า “รายได้และส่วนแบ่ง” และราคาบนการ์ดโปรไฟล์"
        right={<button onClick={save} disabled={busy || !dirty} className="btn-crimson h-11 px-5 rounded-xl font-semibold">{busy ? "กำลังบันทึก…" : dirty ? "บันทึก" : "✓ บันทึกแล้ว"}</button>} />
      {msg && <p role="status" className="mb-3 text-sm" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
          <Card>
            <h2 className="font-semibold mb-3">ราคาต่อนัด 3 ชม.</h2>
            <div className="overflow-x-auto">
              <div className="grid gap-2 items-center text-[14px] min-w-[520px]" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
                <span className="text-xs text-ink-300">สายงาน</span><span className="text-xs text-ink-300">TOP</span><span className="text-xs text-ink-300">Silver</span><span className="text-xs text-ink-300">5 ชม. (ตัวคูณ)</span>
                {([["eat", "เพื่อนกินเที่ยว"], ["massage", "เพื่อนกินเที่ยว · นวด"]] as const).map(([k, l], i) => (
                  <Row4 key={k} label={l}>
                    <input aria-label={`${l} TOP`} className={inp} inputMode="numeric" value={s.price3h[k].top} onChange={(e) => price(k, "top", e.target.value)} />
                    <input aria-label={`${l} Silver`} className={inp} inputMode="numeric" value={s.price3h[k].silver} onChange={(e) => price(k, "silver", e.target.value)} />
                    {i === 0
                      ? <input aria-label="ตัวคูณ 5 ชม." className={inp} inputMode="decimal" value={s.fiveHourMultiplier} onChange={(e) => up((x) => { x.fiveHourMultiplier = +e.target.value || 0; return x; })} />
                      : <span className="text-ink-300 text-[13px]">× {s.fiveHourMultiplier} (ใช้ค่าเดียวกัน)</span>}
                  </Row4>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold mb-3">ขั้นส่วนแบ่งของ Part-Time (นับนัดต่อเดือน)</h2>
            <div className="overflow-x-auto">
              <div className="grid gap-2 items-center text-[14px] min-w-[460px]" style={{ gridTemplateColumns: "1fr 1fr 1fr 60px" }}>
                <span className="text-xs text-ink-300">ตั้งแต่</span><span className="text-xs text-ink-300">ถึง (ว่าง = ไม่จำกัด)</span><span className="text-xs text-ink-300">ส่วนของ Part-Time (%)</span><span />
                {s.tiers.map((t, i) => (
                  <Row4 key={i}>
                    <input aria-label={`ขั้น ${i + 1} ตั้งแต่`} className={inp} inputMode="numeric" value={t.min} onChange={(e) => tier(i, "min", e.target.value)} />
                    <input aria-label={`ขั้น ${i + 1} ถึง`} className={inp} inputMode="numeric" placeholder="ไม่จำกัด" value={t.max ?? ""} onChange={(e) => tier(i, "max", e.target.value)} />
                    <input aria-label={`ขั้น ${i + 1} ส่วนแบ่ง`} className={inp} inputMode="numeric" value={t.pct} onChange={(e) => tier(i, "pct", e.target.value)} />
                    <button type="button" disabled={s.tiers.length <= 1} onClick={() => up((x) => { x.tiers.splice(i, 1); return x; })} className="h-10 text-[13px] text-ink-300 hover:text-crimson-200 disabled:opacity-40">ลบ</button>
                  </Row4>
                ))}
              </div>
            </div>
            <button type="button" disabled={s.tiers.length >= 8} onClick={() => up((x) => { const last = x.tiers[x.tiers.length - 1]; if (last.max === null) last.max = last.min + 4; x.tiers.push({ min: last.max + 1, max: null, pct: last.pct }); return x; })}
              className="mt-3 h-10 px-4 rounded-xl border border-ink-600 text-[13px] text-gold-300">+ เพิ่มขั้น</button>
          </Card>

          <Card className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-300">รอบโอนให้ Part-Time (หลังจบนัด)</span><input className={inp} value={s.payout} onChange={(e) => up((x) => { x.payout = e.target.value; return x; })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-300">ไม่มาตามนัด (ลูกค้าผิด)</span><input className={inp} value={s.noShow} onChange={(e) => up((x) => { x.noShow = e.target.value; return x; })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-300">ทิป (Part-Time ได้ %)</span><input className={inp} inputMode="numeric" value={s.tipPct} onChange={(e) => up((x) => { x.tipPct = +e.target.value || 0; return x; })} /></label>
            <div className="flex flex-col gap-1"><span className="text-xs text-ink-300">มีผลกับ</span><div className="h-10 flex items-center text-[14px]">หน้ารายได้และการ์ดโปรไฟล์ ทันทีที่บันทึก</div></div>
          </Card>

          <Card>
            <button type="button" role="switch" aria-checked={s.show} onClick={() => up((x) => { x.show = !x.show; return x; })} className="w-full flex justify-between items-center gap-4 text-left">
              <span><b className="font-semibold">แสดงหน้า “รายได้และส่วนแบ่ง” บนหน้าสมัครอบรม</b><span className="block text-xs text-ink-300">ปิดไว้ระหว่างปรับราคาได้ (ปุ่มในหน้า /join และเมนูหน้าแรกจะซ่อน)</span></span>
              <span className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: s.show ? GOLD : "rgba(243,234,217,0.18)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: s.show ? 21 : 3 }} /></span>
            </button>
          </Card>

          <Card>
            <h2 className="font-semibold mb-2">ประวัติการแก้</h2>
            {s.history.length ? s.history.map((h) => <p key={h.at} className="text-[13px] text-ink-300 m-0 py-1">{thTime(h.at)} · {h.by} · {h.note}</p>)
              : <p className="text-[13px] text-ink-300 m-0">ใช้ค่าเริ่มต้น {s.tiers.map((t) => t.pct).join(" / ")}% (ยังไม่เคยแก้)</p>}
          </Card>
        </div>

        <aside className="w-full xl:w-[320px] shrink-0 p-4 rounded-[18px] bg-[#2c1a1f] flex flex-col gap-2.5 xl:sticky xl:top-6">
          <div className="font-semibold">ตัวอย่างที่ผู้สมัครเห็น</div>
          <div className="text-[13px] text-ink-200">สายนวด · TOP · {ex} นัด/เดือน</div>
          <div className="font-semibold text-[30px] text-[#e8c472] tabular-nums">{baht(ex * s.price3h.massage.top * pct / 100)}</div>
          <div className="text-xs text-ink-300">{ex} × {baht(s.price3h.massage.top)} × {pct}%</div>
          <a href="/join/earnings" target="_blank" rel="noopener" className="h-11 rounded-xl grid place-items-center text-[14px] font-semibold text-[#e8c472]" style={{ background: "rgba(232,196,114,0.14)" }}>เปิดหน้าที่ผู้สมัครเห็น</a>
          <div className="text-xs text-ink-300">ระดับ TOP / Silver รายคนตั้งที่ <a href="/admin/applicants" className="text-gold-300">ผู้สมัคร</a> · ยอดโอนจริงดูที่ <a href="/admin/payouts" className="text-gold-300">โอนให้ Part-Time</a></div>
        </aside>
      </div>
    </>
  );
}

function Row4({ label, children }: { label?: string; children: React.ReactNode }) {
  return <>{label !== undefined && <span>{label}</span>}{children}</>;
}
