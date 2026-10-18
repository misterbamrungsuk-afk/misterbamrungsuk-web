"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CONFIRM_HOURS, FREE_CANCEL_HOURS, MAX_AHEAD_DAYS, MAX_NIGHTS, MAX_ROOMS_PER_BOOKING, addDays, bahtTxt, bkkToday, nightsBetween, thDate } from "@/lib/hotels/types";

// จองห้องพักในแอป: วันที่ → ประเภทห้อง → จำนวนห้อง/ผู้เข้าพัก → สรุปราคา → ยืนยันชำระจากกระเป๋า → รอโรงแรมยืนยัน
export type RoomOpt = { id: string; name: string; price_satang: number; capacity: number; rooms: number; photos: string[]; description: string | null };
type Avail = RoomOpt & { left: number };

const BD = "rgba(232,196,114,.38)";
const field = "w-full min-h-11 px-3 rounded-xl bg-[#171211] text-[#f3ead9] text-[14px]";

export function StayBookSheet({ hotelId, hotelName, rooms, initialRoom, onClose }: { hotelId: string; hotelName: string; rooms: RoomOpt[]; initialRoom?: string; onClose: () => void }) {
  const router = useRouter();
  const today = useMemo(() => bkkToday(), []);
  const [cin, setCin] = useState(() => addDays(bkkToday(), 1));
  const [cout, setCout] = useState(() => addDays(bkkToday(), 2));
  const [avail, setAvail] = useState<Avail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState(initialRoom ?? rooms[0]?.id ?? "");
  const [count, setCount] = useState(1);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<{ text: string; code?: string } | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  const nights = nightsBetween(cin, cout);
  const rangeErr = cin < today ? "วันเช็กอินต้องไม่ใช่วันที่ผ่านมาแล้ว" : nights < 1 ? "เช็กเอาต์ต้องหลังเช็กอินอย่างน้อย 1 คืน" : nights > MAX_NIGHTS ? `จองได้ครั้งละไม่เกิน ${MAX_NIGHTS} คืน` : "";

  useEffect(() => {
    if (rangeErr) { setAvail(null); return; }
    let off = false;
    setLoading(true);
    fetch(`/api/hotels/${encodeURIComponent(hotelId)}/availability?in=${cin}&out=${cout}`).then((r) => r.json()).then((j: { ok?: boolean; rooms?: Avail[]; error?: string }) => {
      if (off) return;
      setAvail(j.ok && j.rooms ? j.rooms : null);
      if (!j.ok) setErr({ text: j.error ?? "โหลดห้องว่างไม่สำเร็จ" });
    }).catch(() => !off && setErr({ text: "โหลดห้องว่างไม่สำเร็จ" })).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [hotelId, cin, cout, rangeErr]);

  const list: Avail[] = avail ?? rooms.map((r) => ({ ...r, left: r.rooms }));
  const room = list.find((r) => r.id === roomId) ?? null;
  const maxCount = room ? Math.max(0, Math.min(room.left, MAX_ROOMS_PER_BOOKING)) : 0;
  const maxGuests = room ? room.capacity * Math.max(1, count) : 1;
  useEffect(() => { if (count > Math.max(1, maxCount)) setCount(Math.max(1, maxCount)); }, [maxCount, count]);
  useEffect(() => { if (guests > maxGuests) setGuests(maxGuests); }, [maxGuests, guests]);
  const total = room && nights > 0 ? room.price_satang * nights * count : 0;
  const ready = !rangeErr && !!room && room.left >= count && count >= 1 && guests >= 1 && name.trim().length >= 2 && !loading && !!avail;

  const pay = async () => {
    setBusy(true); setErr(null);
    const res = await fetch("/api/hotels/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hotel_id: hotelId, room_type_id: roomId, check_in: cin, check_out: cout, rooms: count, guests, guest_name: name, note }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string; code?: string } | undefined;
    setBusy(false); setAsk(false);
    if (out?.ok && out.id) return router.push(`/stays/bookings/${out.id}`);
    setErr({ text: out?.error ?? "จองไม่สำเร็จ ลองใหม่อีกครั้ง", code: res?.status === 401 ? "login" : out?.code });
    if (out?.code === "full") setAvail(null);
  };

  const step = (v: number, set: (n: number) => void, min: number, max: number, label: string) => (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" aria-label={`ลด${label}`} disabled={v <= min} onClick={() => set(v - 1)} className="w-11 h-11 rounded-full text-[18px] disabled:opacity-40" style={{ border: `1px solid ${BD}` }}>−</button>
      <span className="w-8 text-center font-semibold" aria-live="polite">{v}</span>
      <button type="button" aria-label={`เพิ่ม${label}`} disabled={v >= max} onClick={() => set(v + 1)} className="w-11 h-11 rounded-full text-[18px] disabled:opacity-40" style={{ border: `1px solid ${BD}` }}>+</button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.6)] z-40" onClick={onClose}>
      <div role="dialog" aria-label="จองห้องพัก" onClick={(e) => e.stopPropagation()} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] max-h-[90dvh] overflow-y-auto px-[18px] pt-[18px] pb-6 rounded-t-[22px] bg-[#211a18] flex flex-col gap-3 text-[#f3ead9]" style={{ borderTop: `1px solid ${BD}` }}>
        <div className="flex justify-between items-center gap-2">
          <div className="font-lux font-semibold text-[17px] min-w-0 truncate">จองห้องพัก · {hotelName}</div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="w-11 h-11 shrink-0 rounded-full bg-[#21191a]" style={{ border: `1px solid ${BD}` }}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px] text-[#d9c9b4] flex flex-col gap-1">เช็กอิน (14:00)
            <input type="date" className={field} style={{ border: `1px solid ${BD}` }} value={cin} min={today} max={addDays(today, MAX_AHEAD_DAYS)}
              onChange={(e) => { const v = e.target.value; setCin(v); setErr(null); if (v && nightsBetween(v, cout) < 1) setCout(addDays(v, 1)); }} />
          </label>
          <label className="text-[12px] text-[#d9c9b4] flex flex-col gap-1">เช็กเอาต์ (12:00)
            <input type="date" className={field} style={{ border: `1px solid ${BD}` }} value={cout} min={addDays(cin || today, 1)} max={addDays(cin || today, MAX_NIGHTS)} onChange={(e) => { setCout(e.target.value); setErr(null); }} />
          </label>
        </div>
        <div className="text-[12.5px]" style={{ color: rangeErr ? "#ff9b9b" : "#d9c9b4" }}>{rangeErr || `${nights} คืน · ${thDate(cin, { day: "numeric", month: "short" })} – ${thDate(cout, { day: "numeric", month: "short", year: "numeric" })}`}</div>

        <div className="font-lux font-semibold text-[15px]">เลือกห้อง {loading && <span className="text-[12px] text-[#b5a596] font-normal">กำลังเช็กห้องว่าง…</span>}</div>
        <div role="radiogroup" aria-label="ประเภทห้อง" className="flex flex-col gap-2">
          {list.map((r) => {
            const on = r.id === roomId, full = !!avail && r.left < 1;
            return (
              <button key={r.id} type="button" role="radio" aria-checked={on} disabled={full} onClick={() => { setRoomId(r.id); setErr(null); }}
                className="flex items-center gap-2.5 p-3 rounded-[14px] text-left min-h-14 disabled:opacity-50" style={{ border: `1px solid ${on ? "#e8c472" : BD}`, background: on ? "rgba(176,24,44,.14)" : "#171211" }}>
                {r.photos[0] ? <img src={r.photos[0]} alt="" className="w-14 h-14 rounded-[10px] object-cover shrink-0" /> : <span className="shrink-0 w-5 h-5 rounded-full" style={{ border: `2px solid ${on ? "#e8c472" : "#5a4a3a"}`, background: on ? "#e8c472" : "transparent" }} />}
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[14px]">{r.name}</span>
                  <span className="block text-[12px] text-[#d9c9b4]">พักได้ {r.capacity} คน/ห้อง{r.description ? ` · ${r.description}` : ""}</span>
                  {avail && <span className="block text-[12px]" style={{ color: full ? "#ff9b9b" : "#7fd6a3" }}>{full ? "เต็มในช่วงนี้" : `ว่าง ${r.left} ห้อง`}</span>}
                </span>
                <span className="font-lux font-semibold text-[#e8c472] shrink-0">{bahtTxt(r.price_satang)}<span className="text-[11px] text-[#d9c9b4]"> /คืน</span></span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-[12px] text-[#d9c9b4] flex flex-col gap-1">จำนวนห้อง{step(count, setCount, 1, Math.max(1, maxCount), "จำนวนห้อง")}</div>
          <div className="text-[12px] text-[#d9c9b4] flex flex-col gap-1">ผู้เข้าพัก (สูงสุด {maxGuests}){step(guests, setGuests, 1, maxGuests, "ผู้เข้าพัก")}</div>
        </div>
        <label className="text-[12px] text-[#d9c9b4] flex flex-col gap-1">ชื่อผู้เข้าพัก (ตามบัตร ใช้เช็กอิน)
          <input className={field} style={{ border: `1px solid ${BD}` }} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="text-[12px] text-[#d9c9b4] flex flex-col gap-1">ฝากบอกโรงแรม (ไม่บังคับ)
          <textarea rows={2} className={`${field} py-2`} style={{ border: `1px solid ${BD}` }} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ขอเตียงเสริม · ถึงประมาณ 20:00" />
        </label>

        {room && nights > 0 && (
          <div className="rounded-2xl bg-[#171211] px-4 py-3 text-[13px] flex flex-col gap-1.5" style={{ border: `1px solid ${BD}` }}>
            <div className="flex justify-between gap-2"><span className="text-[#d9c9b4]">{bahtTxt(room.price_satang)} × {nights} คืน × {count} ห้อง</span><span>{bahtTxt(total)}</span></div>
            <div className="flex justify-between gap-2 pt-1.5 font-semibold" style={{ borderTop: `1px solid ${BD}` }}><span>ยอดชำระ</span><span className="font-lux text-[#e8c472] text-[16px]">{bahtTxt(total)}</span></div>
          </div>
        )}
        <ul className="text-[12px] text-[#b5a596] leading-[1.6] list-disc pl-4">
          <li>ชำระจากกระเป๋าเงิน · เงินพักไว้กับ Mister Bamrungsuk จนเข้าพักเสร็จ</li>
          <li>โรงแรมยืนยันภายใน {CONFIRM_HOURS} ชม. · ถ้าปฏิเสธหรือไม่ตอบ คืนเงินเต็มอัตโนมัติ</li>
          <li>ยกเลิกฟรีถึง {FREE_CANCEL_HOURS} ชม. ก่อนเวลาเช็กอิน · หลังจากนั้นยกเลิกได้แต่ไม่คืนเงิน</li>
        </ul>

        {err && (
          <div role="alert" className="text-[13px] text-[#ff9b9b]">
            {err.text}
            {err.code === "login" && <> · <Link href={`/login?next=${encodeURIComponent(`/hotels/${hotelId}`)}`} className="text-[#e8c472] underline">เข้าสู่ระบบ</Link></>}
            {err.code === "funds" && <> · <Link href="/wallet" className="text-[#e8c472] underline">เติมเงินเข้ากระเป๋า</Link></>}
          </div>
        )}

        {ask ? (
          <div role="alertdialog" aria-label="ยืนยันชำระเงิน" className="rounded-2xl p-3 flex flex-col gap-2" style={{ border: "1px solid #e8c472", background: "rgba(232,196,114,.08)" }}>
            <div className="text-[13.5px]">ชำระ <b className="text-[#e8c472]">{bahtTxt(total)}</b> จากกระเป๋า สำหรับ {room?.name} × {count} · {nights} คืน?</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => setAsk(false)} className="h-12 rounded-[14px] text-[#e8c472]" style={{ border: `1px solid ${BD}` }}>กลับไปแก้</button>
              <button type="button" disabled={busy} onClick={pay} className="btn-red-lux h-12 rounded-[14px] font-semibold text-white">{busy ? "กำลังชำระ…" : "ยืนยันชำระ"}</button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={!ready} onClick={() => { setErr(null); setAsk(true); }} className="btn-red-lux h-[52px] rounded-[14px] font-lux font-semibold text-white text-[15px] w-full disabled:opacity-45">
            {!name.trim() && room ? "กรอกชื่อผู้เข้าพัก" : room && avail && room.left < count ? "ห้องว่างไม่พอ" : `จองและชำระ${total ? ` · ${bahtTxt(total)}` : ""}`}
          </button>
        )}
        <Link href="/stays/bookings" className="text-center text-[12.5px] text-[#e8c472] min-h-10 grid place-items-center">ดูการจองห้องพักของฉัน</Link>
      </div>
    </div>
  );
}
