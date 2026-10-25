/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { SLOTS, type CoverRow, type CoverSlot } from "@/lib/covers-config";
import { cropToSlot } from "@/lib/covers-crop";
import { EXPIRED, useConfirm } from "../confirm";

type State = Record<CoverSlot, CoverRow[]>;

const card = "rounded-2xl border border-[rgba(240,200,90,.38)] bg-[#241717] p-4";
const title = "font-lux font-semibold text-[17px]";
const hint = "text-[12px] text-[#9a8a85]";
const goldBtn = "rounded-full border-[1.5px] border-[#e8d3a0] px-4 font-semibold text-[#2a1c0c] disabled:opacity-60";
const goldBg = { background: "linear-gradient(100deg, #b8915a 0%, #d9bf8a 22%, #f0e0b4 48%, #dcc390 72%, #b38b55 100%)" };
const navBtn = "rounded-lg border border-[rgba(240,200,90,.38)] bg-transparent text-[#ffd76a] disabled:opacity-40";
const delBtn = "ml-auto rounded-lg border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] px-2.5 text-[12px] text-[#fecaca]";
const ACCEPT = "image/jpeg,image/png,image/webp";

export function CoversAdmin({ initial, defaults, configured }: { initial: State; defaults: Record<CoverSlot, string[]>; configured: boolean }) {
  const [s, setS] = useState<State>(initial);
  const [busy, setBusy] = useState<CoverSlot | null>(null);
  const [saved, setSaved] = useState(true);
  const [err, setErr] = useState("");
  const [p, setP] = useState(0);
  const [drag, setDrag] = useState<CoverSlot | null>(null);
  const inputs = useRef<Partial<Record<CoverSlot, HTMLInputElement | null>>>({});
  const [confirmUi, ask] = useConfirm();

  const urls = (slot: CoverSlot) => (s[slot].length ? s[slot].map((r) => r.url) : defaults[slot]);

  async function upload(slot: CoverSlot, files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!list.length) return;
    const cfg = SLOTS[slot];
    setErr("");
    setBusy(slot);
    setSaved(false);
    try {
      const room = cfg.max === 1 ? 1 : cfg.max - s[slot].length;
      for (const f of list.slice(0, Math.max(0, room))) {
        if (f.size > 5 * 1024 * 1024) { setErr("ไฟล์ใหญ่เกิน 5 MB"); continue; }
        const out = await cropToSlot(f, cfg.w, cfg.h);
        const fd = new FormData();
        fd.set("slot", slot);
        fd.set("file", out);
        const res = await fetch("/api/admin/covers", { method: "POST", body: fd });
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: CoverRow; error?: string };
        if (!res.ok || !j.ok || !j.row) { setErr(j.error || "อัปโหลดไม่สำเร็จ"); break; }
        const row = j.row;
        setS((x) => ({ ...x, [slot]: cfg.max === 1 ? [row] : [...x[slot], row] }));
      }
      setSaved(true);
    } catch {
      setErr("อ่านไฟล์รูปไม่ได้");
    } finally {
      setBusy(null);
      const el = inputs.current[slot];
      if (el) el.value = "";
    }
  }

  async function remove(slot: CoverSlot, id: string) {
    // ลบรูปจริงจากคลัง (ย้อนกลับไม่ได้ ต้องอัปโหลดใหม่)
    if (!(await ask({ title: "ลบรูปนี้?", body: "รูปจะถูกลบจากคลังทันที · ถ้าต้องการกลับมาต้องอัปโหลดใหม่", ok: "ลบรูป", danger: true }))) return;
    setErr("");
    setSaved(false);
    const res = await fetch(`/api/admin/covers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) { setErr(res.status === 401 ? EXPIRED : "ลบไม่สำเร็จ"); return; }
    setS((x) => ({ ...x, [slot]: x[slot].filter((r) => r.id !== id) }));
    setP(0);
    setSaved(true);
  }

  async function move(slot: CoverSlot, i: number, d: number) {
    const a = s[slot].slice();
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setS((x) => ({ ...x, [slot]: a }));
    setSaved(false);
    const res = await fetch("/api/admin/covers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, ids: a.map((r) => r.id) }) });
    if (!res.ok) setErr("จัดลำดับไม่สำเร็จ");
    else setSaved(true);
  }

  async function publish() {
    setErr("");
    const res = await fetch("/api/admin/covers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revalidate: true }) });
    if (res.ok) setSaved(true);
    else setErr("ขึ้นเว็บไม่สำเร็จ");
  }

  const pick = (slot: CoverSlot) => inputs.current[slot]?.click();
  const fileInput = (slot: CoverSlot) => (
    <input ref={(el) => { inputs.current[slot] = el; }} type="file" accept={ACCEPT} multiple={SLOTS[slot].max > 1} className="hidden" onChange={(e) => upload(slot, e.target.files)} />
  );
  const dropProps = (slot: CoverSlot) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDrag(slot); },
    onDragLeave: () => setDrag(null),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDrag(null); upload(slot, e.dataTransfer.files); },
  });

  const slides = s.main_slider;
  const pvList = urls("main_slider");
  const n = pvList.length;
  const pi = Math.min(p, Math.max(n - 1, 0));
  const banners = s.market_banner;

  const single = (slot: "join_poster" | "partner_hero" | "market_hero") => urls(slot)[0];

  return (
    <div className="font-lux-body flex gap-[18px] min-w-0 text-[#f6efe4]">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex justify-between items-end gap-3">
          <div>
            <div className="text-[11px] tracking-[2.5px] text-[#f0c75a] font-semibold">COVER IMAGES</div>
            <h1 className="mt-0.5 font-lux font-bold text-[24px]">รูปหน้าปก</h1>
            <div className="text-[12.5px] text-[#cdbfb3] mt-0.5">สไลด์หน้าแรก · โปสเตอร์ Part-Time · ปกพาร์ทเนอร์ · ปกและแบนเนอร์ Marketplace · บันทึกแล้วขึ้นเว็บทันที</div>
          </div>
          <span className="text-[12px] shrink-0" style={{ color: saved ? "#2f7a46" : "#eed58a" }}>{saved ? "✓ บันทึกแล้ว · ตรงกับหน้าเว็บ" : busy ? "กำลังบันทึก…" : "มีการแก้ไขที่ยังไม่บันทึก"}</span>
        </div>

        {!configured && (
          <p className="rounded-2xl border border-[rgba(240,200,90,.4)] px-4 py-3 text-xs text-[#cdbfb3]">ยังไม่ได้ตั้ง Supabase หรือยังไม่ได้รัน supabase/site/0001_covers.sql — หน้าเว็บใช้รูปเริ่มต้นอยู่ และยังอัปโหลดไม่ได้</p>
        )}
        {err && <p role="alert" className="rounded-xl border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] px-4 py-2 text-[13px] text-[#fecaca]">{err}</p>}

        {/* สไลด์หน้าแรก */}
        <section className={`${card} flex flex-col gap-3`}>
          <div>
            <div className={title}>สไลด์หน้าแรก · เลือกเส้นทางของคุณ</div>
            <div className={hint}>{n} รูป · ขนาดคงที่ แนวนอน 4:3 · 1600×1200 px (ขั้นต่ำ 780×585) · ระบบครอปให้พอดีอัตโนมัติ · JPG/PNG/WebP ไม่เกิน 5 MB · สูงสุด 6 รูป</div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {slides.length === 0 && defaults.main_slider.map((u, i) => (
              <div key={u} className="rounded-[14px] border-[1.5px] bg-[#130e0e] overflow-hidden flex flex-col" style={{ borderColor: i === pi ? "#f0c75a" : "rgba(240,200,90,.3)" }}>
                <div className="relative">
                  <img src={u} alt={`รูปสไลด์ที่ ${i + 1}`} className="w-full aspect-[4/3] object-cover block" />
                  <span className="absolute top-2 left-2 w-[26px] h-[26px] rounded-full bg-[#f0c75a] text-[#1a1206] grid place-items-center font-bold text-[13px]">{i + 1}</span>
                </div>
                <div className="p-2 text-[11px] text-[#9a8a85]">รูปเริ่มต้น · อัปรูปใหม่เพื่อแทนที่</div>
              </div>
            ))}
            {slides.map((r, i) => (
              <div key={r.id} className="rounded-[14px] border-[1.5px] bg-[#130e0e] overflow-hidden flex flex-col" style={{ borderColor: i === pi ? "#f0c75a" : "rgba(240,200,90,.3)" }}>
                <button type="button" className="relative p-0 border-0 bg-transparent" onClick={() => setP(i)} aria-label={`ดูตัวอย่างรูปที่ ${i + 1}`}>
                  <img src={r.url} alt={`รูปสไลด์ที่ ${i + 1}`} className="w-full aspect-[4/3] object-cover block" />
                  <span className="absolute top-2 left-2 w-[26px] h-[26px] rounded-full bg-[#f0c75a] text-[#1a1206] grid place-items-center font-bold text-[13px]">{i + 1}</span>
                </button>
                <div className="flex items-center gap-1 p-2">
                  <button type="button" onClick={() => move("main_slider", i, -1)} disabled={i === 0} aria-label="เลื่อนไปก่อน" className={`${navBtn} w-8 h-8`}>‹</button>
                  <button type="button" onClick={() => move("main_slider", i, 1)} disabled={i === slides.length - 1} aria-label="เลื่อนไปหลัง" className={`${navBtn} w-8 h-8`}>›</button>
                  <button type="button" onClick={() => remove("main_slider", r.id)} className={`${delBtn} h-8`}>ลบรูป</button>
                </div>
              </div>
            ))}
            {slides.length < SLOTS.main_slider.max && (
              <button type="button" onClick={() => pick("main_slider")} disabled={!configured || busy === "main_slider"} {...dropProps("main_slider")}
                className="rounded-[14px] border-[1.5px] border-dashed border-[rgba(240,200,90,.55)] text-[#ffd76a] min-h-[180px] flex flex-col items-center justify-center gap-2 text-[13px] disabled:opacity-60"
                style={{ background: drag === "main_slider" ? "rgba(240,200,90,.14)" : "rgba(240,200,90,.05)" }}>
                <span className="w-11 h-11 rounded-full border border-[#c9a24a] grid place-items-center text-[24px]">+</span>
                {busy === "main_slider" ? "กำลังอัปโหลด…" : "เพิ่มรูป"}
                <span className="text-[11px] text-[#9a8a85]">ลากไฟล์มาวาง หรือกดเลือก</span>
              </button>
            )}
          </div>
          {fileInput("main_slider")}
        </section>

        {/* โปสเตอร์ /join */}
        <section className={`${card} flex gap-4 items-center`} {...dropProps("join_poster")}>
          <img src={single("join_poster")} alt="โปสเตอร์หน้ารับสมัคร Part-Time" className="w-[120px] aspect-[3/4] object-cover rounded-xl border border-[rgba(240,200,90,.5)]" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className={title}>โปสเตอร์หน้ารับสมัคร Part-Time</div>
            <div className={hint}>แสดงใต้หัวหน้าเว็บในหน้า /join · 1 รูป · ขนาดคงที่ แนวตั้ง 3:4 · 1080×1440 px (ขั้นต่ำ 720×960)</div>
            <div className="flex gap-2 mt-1.5">
              <button type="button" onClick={() => pick("join_poster")} disabled={!configured || busy === "join_poster"} className={`${goldBtn} h-[38px]`} style={goldBg}>{busy === "join_poster" ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}</button>
              {s.join_poster[0] && <button type="button" onClick={() => remove("join_poster", s.join_poster[0].id)} className="h-[38px] px-3 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] text-[12px] text-[#fecaca]">ใช้รูปเริ่มต้น</button>}
            </div>
          </div>
          {fileInput("join_poster")}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {([
            ["partner_hero", "ปกหน้าพาร์ทเนอร์", "ปกหน้าพาร์ทเนอร์ สปา · โรงแรม", "หน้า /partner · 1 รูป · ขนาดคงที่ สี่เหลี่ยมจัตุรัส 1:1 · 1200×1200 px", "w-[120px] aspect-square"],
            ["market_hero", "ปกหน้าโรงแรม · สปา", "ปกหน้าโรงแรม · สปา", "หน้า /stay โรงแรม · สปา · 1 รูป · ขนาดคงที่ แนวนอน 4:3 · 1600×1200 px", "w-[140px] aspect-[4/3]"],
          ] as const).map(([slot, alt, t, h, size]) => (
            <section key={slot} className={`${card} flex gap-3.5 items-center`} {...dropProps(slot)}>
              {single(slot)
                ? <img src={single(slot)} alt={alt} className={`${size} shrink-0 object-cover rounded-xl border border-[rgba(240,200,90,.5)]`} />
                : <div className={`${size} shrink-0 rounded-xl border border-dashed border-[rgba(240,200,90,.5)] grid place-items-center text-[11px] text-[#9a8a85]`}>ยังไม่มีรูป</div>}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className={title}>{t}</div>
                <div className={hint}>{h}</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => pick(slot)} disabled={!configured || busy === slot} className={`${goldBtn} h-9`} style={goldBg}>{busy === slot ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}</button>
                  {s[slot][0] && <button type="button" onClick={() => remove(slot, s[slot][0].id)} className="h-9 px-3 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] text-[12px] text-[#fecaca]">ลบรูป</button>}
                </div>
              </div>
              {fileInput(slot)}
            </section>
          ))}
        </div>

        {/* แบนเนอร์ Marketplace */}
        <section className={`${card} flex flex-col gap-3`}>
          <div>
            <div className={title}>แบนเนอร์โปรโมท Marketplace</div>
            <div className={hint}>{banners.length} รูป · ขนาดคงที่ แนวนอนยาว 8:3 · 1600×600 px · เลื่อนอัตโนมัติ · สูงสุด 5 รูป</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {banners.map((r, i) => (
              <div key={r.id} className="rounded-[14px] border border-[rgba(240,200,90,.3)] bg-[#130e0e] overflow-hidden">
                <div className="relative">
                  <img src={r.url} alt={`แบนเนอร์ ${i + 1}`} className="w-full aspect-[8/3] object-cover block" />
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-[#ffd76a] text-[11px]">{i + 1}</span>
                </div>
                <div className="flex items-center gap-1 p-2">
                  <button type="button" onClick={() => move("market_banner", i, -1)} disabled={i === 0} aria-label="เลื่อนไปก่อน" className={`${navBtn} w-[30px] h-[30px]`}>‹</button>
                  <button type="button" onClick={() => move("market_banner", i, 1)} disabled={i === banners.length - 1} aria-label="เลื่อนไปหลัง" className={`${navBtn} w-[30px] h-[30px]`}>›</button>
                  <button type="button" onClick={() => remove("market_banner", r.id)} className={`${delBtn} h-[30px]`}>ลบรูป</button>
                </div>
              </div>
            ))}
            {banners.length < SLOTS.market_banner.max && (
              <button type="button" onClick={() => pick("market_banner")} disabled={!configured || busy === "market_banner"} {...dropProps("market_banner")}
                className="rounded-[14px] border-[1.5px] border-dashed border-[rgba(240,200,90,.55)] text-[#ffd76a] min-h-[110px] flex flex-col items-center justify-center gap-1.5 text-[13px] disabled:opacity-60"
                style={{ background: drag === "market_banner" ? "rgba(240,200,90,.14)" : "rgba(240,200,90,.05)" }}>
                <span className="text-[22px]">+</span>{busy === "market_banner" ? "กำลังอัปโหลด…" : "เพิ่มแบนเนอร์"}
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#9a8a85]">ข้อความ/ลิงก์บนแบนเนอร์ยังจัดการที่ Marketplace (แอดมิน) — รูปที่นี่จะแทนรูปของแบนเนอร์ตามลำดับ</p>
          {fileInput("market_banner")}
        </section>
      </div>

      {/* ตัวอย่างบนมือถือ */}
      <aside className="hidden lg:flex w-[300px] shrink-0 flex-col gap-2.5 items-center">
        <div className="text-[11px] tracking-[2px] text-[#f0c75a] font-semibold">ตัวอย่างบนมือถือ</div>
        <div className="w-[260px] rounded-[30px] border-[6px] border-[#2a2222] bg-[#0e0a0a] overflow-hidden">
          <div className="flex justify-between items-center px-2.5 py-2">
            <span className="inline-flex items-center gap-[5px]">
              <img src="/brand/logo.png" alt="" className="w-6 h-6 object-contain" />
              <span className="font-lux font-semibold text-[13px] text-[#e8c472]">Mister Bamrungsuk</span>
            </span>
            <span className="px-[7px] py-0.5 rounded-full border border-[#f0c75a] text-[7px] tracking-[1.5px] text-[#ffd76a]">PREMIUM</span>
          </div>
          <div className="relative">
            {n ? <img src={pvList[pi]} alt="" className="w-full aspect-[4/3] object-cover block" /> : <div className="w-full aspect-[4/3]" />}
            <button type="button" onClick={() => setP((pi - 1 + n) % Math.max(n, 1))} aria-label="ก่อนหน้า" className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full border border-[rgba(240,200,90,.7)] bg-black/50 text-[#ffd76a]">‹</button>
            <button type="button" onClick={() => setP((pi + 1) % Math.max(n, 1))} aria-label="ถัดไป" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full border border-[rgba(240,200,90,.7)] bg-black/50 text-[#ffd76a]">›</button>
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
              {pvList.map((u, k) => <span key={u + k} className="h-1.5 rounded-[3px]" style={{ width: k === pi ? 16 : 6, background: k === pi ? "#f0c75a" : "rgba(255,255,255,.5)" }} />)}
            </div>
          </div>
          <div className="p-3 text-center font-lux font-semibold text-[15px]">เลือกเส้นทางของคุณ</div>
        </div>
        <button type="button" onClick={publish} className="btn-red-lux w-[260px] h-[46px] rounded-full border-[1.5px] border-[#ffd76a] text-white font-semibold">บันทึกและขึ้นเว็บ</button>
      </aside>
      {confirmUi}
    </div>
  );
}
