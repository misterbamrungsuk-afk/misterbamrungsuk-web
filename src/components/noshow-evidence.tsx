"use client";

import { useEffect, useState } from "react";

type Gps = { lat: number; lng: number; accuracy: number };

function Row({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink-600 p-3">
      <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-sm ${ok ? "bg-gold-500 text-ink-950" : "border border-ink-500 text-ink-400"}`}>{ok ? "✓" : ""}</span>
      <div className="flex-1 min-w-0 text-sm">{children}</div>
    </div>
  );
}

export interface NoShowEvidenceProps {
  side: "provider" | "customer";
  bookingId: string;
  amount: number;
  customerName: string;
  providerName: string;
  providerId: string;
  /** ห้องแชทสำหรับนับจำนวนครั้งที่ติดต่อ */
  roomId?: string;
  senderId?: string;
  note?: string;
  th: boolean;
  onDone: () => void;
  onCancel?: () => void;
}

// เช็กลิสต์หลักฐานผิดนัด: GPS + รูปสถานที่ + จำนวนครั้งที่โทร/แชท
export function NoShowEvidence(p: NoShowEvidenceProps) {
  const { th } = p;
  const photoRequired = p.side === "provider";
  const [gps, setGps] = useState<Gps | null>(null);
  const [gpsErr, setGpsErr] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [fromLog, setFromLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!p.roomId || !p.senderId) return;
    fetch(`/api/noshow?room=${encodeURIComponent(p.roomId)}&sender=${encodeURIComponent(p.senderId)}`)
      .then((r) => r.json())
      .then((d: { attempts: number | null }) => { if (typeof d.attempts === "number") { setAttempts(d.attempts); setFromLog(true); } })
      .catch(() => {});
  }, [p.roomId, p.senderId]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const checkIn = () => {
    setGpsErr("");
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGpsErr(th ? "อุปกรณ์นี้ไม่รองรับ GPS" : "GPS not supported"); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGpsBusy(false); },
      (err) => {
        setGpsErr(err.code === err.PERMISSION_DENIED ? (th ? "ไม่ได้อนุญาตตำแหน่ง — แอดมินจะใช้รูปถ่ายและแชทประกอบ" : "Location denied — admin will rely on photo and chat") : (th ? "หาตำแหน่งไม่ได้ ลองอีกครั้งหรือส่งต่อได้" : "Couldn't get location"));
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const canSubmit = (gps || gpsErr) && (!photoRequired || photo) && !busy;

  const submit = async () => {
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("side", p.side); fd.set("bookingId", p.bookingId); fd.set("amount", String(p.amount));
    fd.set("customerName", p.customerName); fd.set("providerName", p.providerName); fd.set("providerId", p.providerId);
    if (gps) { fd.set("lat", String(gps.lat)); fd.set("lng", String(gps.lng)); fd.set("accuracy", String(gps.accuracy)); } else fd.set("gpsError", gpsErr);
    fd.set("attempts", String(attempts)); fd.set("attemptsSource", fromLog ? "chat_log" : "manual");
    if (p.note) fd.set("note", p.note);
    if (photo) fd.set("photo", photo);
    try {
      const r = await fetch("/api/noshow", { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) throw new Error(d.error || (th ? "ส่งไม่สำเร็จ" : "Failed"));
      p.onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 text-left">
      <Row ok={!!gps}>
        <p className="font-medium">{p.side === "provider" ? (th ? "เช็กอิน GPS ที่จุดนัด" : "GPS check-in at meeting point") : (th ? "ตำแหน่งของคุณตอนนี้" : "Your current location")}</p>
        {gps ? <p className="text-xs text-ink-400 mt-0.5">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} · ±{Math.round(gps.accuracy)} ม.</p>
          : <button type="button" onClick={checkIn} disabled={gpsBusy} className="mt-1.5 h-9 px-3 rounded-xl border border-gold-500 text-gold-300 text-xs disabled:opacity-50">{gpsBusy ? "…" : th ? "📍 แชร์ตำแหน่ง" : "📍 Share location"}</button>}
        {gpsErr && <p className="text-xs text-crimson-300 mt-1">{gpsErr}</p>}
      </Row>
      <Row ok={!!photo}>
        <p className="font-medium">{th ? "รูปถ่ายสถานที่" : "Photo of the location"} {!photoRequired && <span className="text-xs text-ink-400 font-normal">· {th ? "ไม่บังคับ" : "optional"}</span>}</p>
        <label className="mt-1.5 flex items-center gap-2 cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="w-14 h-14 rounded-xl object-cover" /> : <span className="w-14 h-14 rounded-xl grid place-items-center bg-ink-850 text-2xl">📷</span>}
          <span className="text-xs text-ink-300">{photo ? (th ? "เปลี่ยนรูป" : "Change") : th ? "ถ่ายรูป/เลือกรูป (บันทึกเวลาอัตโนมัติ)" : "Take/choose a photo (timestamped)"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </Row>
      <Row ok={attempts > 0}>
        <p className="font-medium">{th ? "จำนวนครั้งที่โทร/แชทหาอีกฝ่าย" : "Call/chat attempts"}</p>
        <p className="text-xs text-ink-400 mt-0.5">{fromLog ? (th ? "นับจากแชทในแอปอัตโนมัติ" : "Counted from in-app chat") : th ? "ไม่พบบันทึกแชท — กรอกเอง" : "No chat log — enter manually"}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <button type="button" onClick={() => { setAttempts(Math.max(0, attempts - 1)); setFromLog(false); }} className="w-9 h-9 rounded-xl border border-ink-500" aria-label="-">−</button>
          <span className="w-8 text-center font-display text-lg text-gold-300">{attempts}</span>
          <button type="button" onClick={() => { setAttempts(Math.min(99, attempts + 1)); setFromLog(false); }} className="w-9 h-9 rounded-xl border border-ink-500" aria-label="+">+</button>
        </div>
      </Row>
      {error && <p className="text-xs text-crimson-300" role="alert">{error}</p>}
      <div className="flex gap-2 mt-1">
        {p.onCancel && <button type="button" onClick={p.onCancel} className="btn-ghost rounded-xl flex-1 py-3 text-sm">{th ? "ยกเลิก" : "Cancel"}</button>}
        <button type="button" onClick={submit} disabled={!canSubmit} className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold disabled:opacity-50">
          {busy ? "…" : th ? "ส่งหลักฐานให้แอดมิน" : "Send evidence"}
        </button>
      </div>
    </div>
  );
}
