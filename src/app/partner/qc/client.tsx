"use client";

import { useMemo, useRef, useState } from "react";
import { fileUrl } from "@/lib/partner/portal-types";
import { QC_CHECKS, QC_DOC_DEFS, QC_TIMES, qcDays, qcDocCount, qcSlotLabel, type QcDocKey, type QcDocs } from "@/lib/partner/status";
import { CARD, CTA, CheckIcon, GHOST } from "../ui";

const GOLD = "#f0c75a";
const BDC = "rgba(240,200,90,.38)";

async function post(fd: FormData) {
  const res = await fetch("/api/partner/qc", { method: "POST", body: fd }).catch(() => null);
  return ((await res?.json().catch(() => ({}))) ?? {}) as { ok?: boolean; error?: string; docs?: QcDocs; qc_slot?: string };
}

export function QcClient({ token, business, initialSlot, initialDocs, passed }: { token: string; business: string; initialSlot: string | null; initialDocs: QcDocs; passed: boolean }) {
  const days = useMemo(() => qcDays(10), []);
  const [slot, setSlot] = useState(initialSlot);
  const [editing, setEditing] = useState(!initialSlot);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState(-1);
  const [docs, setDocs] = useState<QcDocs>(initialDocs);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const inputs = useRef<Partial<Record<QcDocKey, HTMLInputElement | null>>>({});
  const nDoc = qcDocCount(docs);
  const ok = time >= 0;
  const d = days[day];
  const label = `${d.day} ${d.mo} · ${ok ? QC_TIMES[time] : "เลือกเวลา"}`;

  const base = (action: string) => {
    const fd = new FormData();
    fd.set("action", action);
    if (token) fd.set("token", token);
    return fd;
  };
  const upload = async (key: QcDocKey, files: FileList | null) => {
    if (!files?.length) return;
    const fd = base("upload");
    fd.set("key", key);
    for (const f of Array.from(files)) fd.append("files", f);
    setBusy(key);
    setErr("");
    const out = await post(fd);
    setBusy("");
    if (out.ok && out.docs) setDocs(out.docs);
    else setErr(out.error ?? "อัปโหลดไม่สำเร็จ");
  };
  const remove = async (key: QcDocKey, path: string) => {
    const fd = base("remove");
    fd.set("key", key);
    fd.set("path", path);
    setBusy(key);
    const out = await post(fd);
    setBusy("");
    if (out.ok && out.docs) setDocs(out.docs);
  };
  const confirm = async () => {
    if (!ok) return;
    const fd = base("book");
    fd.set("date", d.date);
    fd.set("time", QC_TIMES[time]);
    setBusy("book");
    setErr("");
    const out = await post(fd);
    setBusy("");
    if (out.ok && out.qc_slot) {
      setSlot(out.qc_slot);
      setEditing(false);
    } else setErr(out.error ?? "บันทึกไม่สำเร็จ");
  };

  if (passed)
    return <div className={`${CARD} text-center text-sm`}><span className="text-[#7fd6a3]">ผ่าน QC แล้ว</span> · ขั้นต่อไป ทำสัญญา + ป้ายแบรนด์</div>;

  if (!editing && slot)
    return (
      <div className="flex flex-col gap-3 items-center text-center pt-2.5">
        <div className="w-[76px] h-[76px] rounded-full border-2 border-[#4cc283] grid place-items-center text-[#7fd6a3]"><CheckIcon size={34} /></div>
        <div className="font-lux font-semibold text-xl text-[#f0c75a]">ยืนยันนัด QC แล้ว</div>
        <div className={`${CARD} w-full text-left flex flex-col gap-2 text-[13px]`}>
          <div className="flex justify-between gap-2"><span className="text-[#cdbfb3]">วัน-เวลา</span><span>{qcSlotLabel(slot)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-[#cdbfb3] shrink-0">สถานที่</span><span className="text-right">{business}</span></div>
          <div className="flex justify-between gap-2"><span className="text-[#cdbfb3]">เอกสาร</span><span>{nDoc} / 3 รายการ</span></div>
        </div>
        <p className="m-0 text-[12.5px] text-[#cdbfb3]">ทีม QC จะโทรยืนยันก่อนเข้า 1 วัน · หลังผ่าน QC ทำสัญญา + ป้ายแบรนด์</p>
        <button type="button" className={GHOST} onClick={() => setEditing(true)}>เปลี่ยนวันนัด</button>
      </div>
    );

  return (
    <div className="flex flex-col gap-3.5">
      <div className={`${CARD} flex flex-col gap-2.5`}>
        <div className="font-lux font-semibold text-[15px]">เลือกวัน</div>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="วันนัด">
          {days.map((x, i) => (
            <button key={x.date} type="button" role="radio" aria-checked={day === i} onClick={() => setDay(i)}
              className="min-h-[58px] rounded-xl border flex flex-col items-center justify-center min-w-0"
              style={{ borderColor: day === i ? GOLD : BDC, background: day === i ? "rgba(240,200,90,.18)" : "#21191a" }}>
              <span className="font-lux font-semibold text-lg text-[#ffd76a]">{x.day}</span>
              <span className="text-[11px] text-[#cdbfb3]">{x.wd}</span>
            </button>
          ))}
        </div>
        <div className="font-lux font-semibold text-[15px]">เลือกเวลา</div>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="เวลานัด">
          {QC_TIMES.map((t, i) => (
            <button key={t} type="button" role="radio" aria-checked={time === i} onClick={() => setTime(i)}
              className="min-h-11 rounded-xl border text-[13px] font-semibold"
              style={{ borderColor: time === i ? GOLD : BDC, background: time === i ? GOLD : "#21191a", color: time === i ? "#0e0a0a" : "#f6efe4" }}>{t}</button>
          ))}
        </div>
      </div>
      <div className={`${CARD} flex flex-col gap-2`}>
        <div className="font-lux font-semibold text-[15px]">สิ่งที่ทีม QC ตรวจ</div>
        {QC_CHECKS.map((c, i) => (
          <div key={c} className="flex gap-2.5 items-center text-[13px]">
            <span className="shrink-0 w-5 h-5 rounded-full border border-[#f0c75a] text-[#ffd76a] grid place-items-center text-[11px]">{i + 1}</span>
            <span className="min-w-0">{c}</span>
          </div>
        ))}
      </div>
      <div className={`${CARD} flex flex-col gap-2`}>
        <div className="flex justify-between"><span className="font-lux font-semibold text-[15px]">เอกสารที่ต้องเตรียม</span><span className="text-xs text-[#ffd76a]">{nDoc} / 3 รายการ</span></div>
        {QC_DOC_DEFS.map((x) => {
          const list = docs[x.key] ?? [];
          const has = list.length > 0;
          return (
            <div key={x.key} className="flex flex-col gap-1.5">
              <input ref={(el) => { inputs.current[x.key] = el; }} type="file" hidden multiple={x.multi} accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => { void upload(x.key, e.target.files); e.target.value = ""; }} />
              <button type="button" disabled={busy === x.key} onClick={() => inputs.current[x.key]?.click()}
                className="min-h-12 rounded-xl border border-dashed bg-[#21191a] flex items-center justify-between gap-2 px-3 text-[13px] text-left"
                style={{ borderColor: has ? "#4cc283" : "#5a4a4d", color: has ? "#7fd6a3" : "#cdbfb3" }}>
                <span className="min-w-0">{x.label}{x.multi && has ? ` (${list.length})` : ""}</span>
                <span className="shrink-0 text-xs">{busy === x.key ? "กำลังอัปโหลด…" : has ? (x.multi ? "✓ เพิ่มรูป" : "✓ อัปโหลดแล้ว") : "แตะเพื่ออัปโหลด"}</span>
              </button>
              {has && (
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {list.map((path, i) => (
                    <span key={path} className="inline-flex items-center gap-1 rounded-full border border-[rgba(240,200,90,.38)] pl-2 pr-1 py-0.5">
                      <a href={fileUrl(path)} target="_blank" rel="noopener noreferrer">ไฟล์ {i + 1}</a>
                      <button type="button" aria-label="ลบไฟล์" onClick={() => remove(x.key, path)} className="w-5 h-5 text-[#cdbfb3]">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {err && <p role="alert" className="text-xs text-[#ef6b7b] m-0">{err}</p>}
      <button type="button" className={CTA} onClick={confirm} disabled={!ok || busy === "book"}>{busy === "book" ? "กำลังบันทึก…" : `ยืนยันนัด QC · ${label}`}</button>
    </div>
  );
}
