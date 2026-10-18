"use client";

import { useEffect, useRef, useState } from "react";
import type { CallView } from "@/lib/calls/rules";
import { authBody, callBusy, canWebRtc, externalHref, gathered, getJ, inLine, micError, mmss, postJ, qs, type CallAuth } from "./engine";

// หน้าจอโทรเต็มจอ (เสียงอย่างเดียว) — ผู้โทร: ขอไมค์ → เปิดสาย → ส่ง offer ครบชุด → รอ answer
// ผู้รับ: ขอไมค์ → รับสาย → รอ offer → ส่ง answer ครบชุด · ถามสถานะทุก 1 วิระหว่างต่อสาย / ทุก 4 วิระหว่างคุย
type Phase = "init" | "calling" | "connecting" | "connected" | "ended";
const GOLD = "#e8c472", RED = "#c9283d", LN = "rgba(243,234,217,.12)";
const STUN_ONLY: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

function endText(v: CallView): string {
  const caller = v.me === "caller";
  if (v.status === "missed") return v.end_reason === "cancelled" ? (caller ? "ยกเลิกการโทรแล้ว" : "ผู้โทรวางสายแล้ว") : caller ? "ไม่มีผู้รับสาย" : "สายที่ไม่ได้รับ";
  if (v.status === "declined") return caller ? "อีกฝั่งไม่สะดวกรับสาย · ทักแชทไว้ก่อนได้" : "ไม่รับสายแล้ว";
  if (v.end_reason === "max") return `ครบ 10 นาที · วางสายอัตโนมัติ${v.duration_s != null ? ` (${mmss(v.duration_s)})` : ""}`;
  if (v.end_reason === "failed") return "ต่อสายไม่สำเร็จ · ลองใหม่อีกครั้งหรือคุยในแชท";
  return `จบสาย${v.duration_s != null ? ` · ${mmss(v.duration_s)}` : ""}`;
}

export function CallScreen({ role, bookingId, callId, auth, peerName, onClose }: {
  role: "caller" | "callee"; bookingId: string; callId?: string; auth: CallAuth; peerName: string; onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("init");
  const [msg, setMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [outs, setOuts] = useState<MediaDeviceInfo[]>([]);
  const [outIdx, setOutIdx] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const s = useRef<{ started?: boolean; mounted?: boolean; done?: boolean; id?: string; pc?: RTCPeerConnection; stream?: MediaStream; remoteSet?: boolean; answering?: boolean; connectedAt?: number; maxEnd?: number; timer?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval>; drop?: ReturnType<typeof setTimeout>; phase: Phase }>({ phase: "init" });
  const go = (p: Phase) => { s.current.phase = p; setPhase(p); };

  const teardown = () => {
    const x = s.current;
    clearTimeout(x.timer); clearInterval(x.tick); clearTimeout(x.drop);
    x.stream?.getTracks().forEach((t) => t.stop());
    try { x.pc?.close(); } catch {}
    if (audio.current) { audio.current.pause(); audio.current.srcObject = null; }
    x.pc = undefined; x.stream = undefined;
    callBusy.on = false;
  };
  /** จบสายฝั่งนี้ · tell = แจ้งเซิร์ฟเวอร์ด้วย */
  const finish = (text: string, tell: false | "hangup" | "decline" | "failed" | "max" = false) => {
    const x = s.current;
    if (x.done) return;
    x.done = true;
    if (tell && x.id) void postJ(`/api/calls/${x.id}`, { action: tell === "decline" ? "decline" : "hangup", ...(tell === "failed" || tell === "max" ? { reason: tell } : {}), ...authBody(auth) }, true);
    teardown();
    setMsg(text);
    go("ended");
  };

  useEffect(() => {
    const x = s.current;
    x.mounted = true;
    callBusy.on = true;
    if (!x.started) { x.started = true; void run(); }
    const onHide = () => {
      if (!x.done && x.id) navigator.sendBeacon?.(`/api/calls/${x.id}`, new Blob([JSON.stringify({ action: "hangup", ...authBody(auth) })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      x.mounted = false;
      window.removeEventListener("pagehide", onHide);
      // React dev ถอด/ใส่ซ้ำ → รอดูก่อนว่าถอดจริง
      setTimeout(() => { if (!x.mounted && !x.done) { x.done = true; if (x.id) void postJ(`/api/calls/${x.id}`, { action: "hangup", ...authBody(auth) }, true); teardown(); } }, 0);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    const x = s.current;
    if (inLine()) return finish("เปิดใน Chrome/Safari เพื่อโทร", role === "callee" ? "decline" : false);
    if (!canWebRtc()) return finish("เบราว์เซอร์นี้โทรไม่ได้ · เปิดใน Chrome/Safari เพื่อโทร", role === "callee" ? "decline" : false);
    if (role === "callee") x.id = callId;
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
    catch (e) { return finish(micError(e), role === "callee" ? "decline" : false); }
    if (x.done) { stream.getTracks().forEach((t) => t.stop()); return; }
    x.stream = stream;

    if (role === "caller") {
      const r = await postJ("/api/calls", { booking_id: bookingId, ...authBody(auth) });
      if (!r.ok) return finish(r.error ?? "โทรไม่สำเร็จ");
      x.id = r.call.id as string;
      if (x.done) { void postJ(`/api/calls/${x.id}`, { action: "hangup", ...authBody(auth) }, true); return; }
      go("calling");
    } else {
      const r = await postJ(`/api/calls/${x.id}`, { action: "accept", ...authBody(auth) });
      if (!r.ok) return finish(r.error ?? "รับสายไม่สำเร็จ");
      go("connecting");
    }

    const ice = await getJ(`/api/calls/${x.id}/ice?${qs(auth)}`);
    if (x.done) return;
    const pc = new RTCPeerConnection({ iceServers: (ice?.iceServers as RTCIceServer[] | undefined) ?? STUN_ONLY });
    x.pc = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (ev) => {
      const el = audio.current;
      if (!el) return;
      el.srcObject = ev.streams[0] ?? new MediaStream([ev.track]);
      el.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        clearTimeout(x.drop);
        if (x.phase !== "connected") { x.connectedAt = Date.now(); go("connected"); void listOutputs(); }
      } else if (st === "failed") finish("สัญญาณหลุด · ลองโทรใหม่อีกครั้ง", "failed");
      else if (st === "disconnected") { clearTimeout(x.drop); x.drop = setTimeout(() => { if (pc.connectionState !== "connected") finish("สัญญาณหลุด · ลองโทรใหม่อีกครั้ง", "failed"); }, 8000); }
    };

    if (role === "caller") {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        await gathered(pc);
      } catch { return finish("ต่อสายไม่สำเร็จ · ลองใหม่อีกครั้ง", "failed"); }
      if (x.done) return;
      const r = await postJ(`/api/calls/${x.id}`, { action: "signal", kind: "offer", sdp: pc.localDescription?.sdp, ...authBody(auth) });
      if (!r.ok && !x.done) return finish(r.error ?? "ต่อสายไม่สำเร็จ", "hangup");
    }
    poll();
    // นาฬิกา + ครบ 10 นาที = วางสายเอง (เซิร์ฟเวอร์ตัดซ้ำอีกชั้น)
    x.tick = setInterval(() => {
      if (x.connectedAt) setElapsed(Math.floor((Date.now() - x.connectedAt) / 1000));
      if (x.maxEnd && Date.now() >= x.maxEnd) finish("ครบ 10 นาที · วางสายอัตโนมัติ", "max");
    }, 1000);
  }

  function poll() {
    const x = s.current;
    if (x.done) return;
    x.timer = setTimeout(async () => {
      const j = await getJ(`/api/calls/${x.id}?${qs(auth)}`);
      if (x.done) return;
      const v = j?.call as CallView | undefined;
      if (j && j.ok === false) return finish("สายนี้จบแล้ว");
      if (v) {
        if (v.status !== "ringing" && v.status !== "active") return finish(endText(v));
        if (v.max_ends_at) x.maxEnd = Date.parse(v.max_ends_at);
        if (role === "caller" && v.status === "active" && x.phase === "calling") go("connecting");
        try {
          if (role === "caller" && v.answer && !x.remoteSet && x.pc) {
            x.remoteSet = true;
            await x.pc.setRemoteDescription({ type: "answer", sdp: v.answer });
            connectGuard();
          }
          if (role === "callee" && v.offer && !x.answering && x.pc) {
            x.answering = true;
            await x.pc.setRemoteDescription({ type: "offer", sdp: v.offer });
            await x.pc.setLocalDescription(await x.pc.createAnswer());
            await gathered(x.pc);
            if (x.done) return;
            const r = await postJ(`/api/calls/${x.id}`, { action: "signal", kind: "answer", sdp: x.pc.localDescription?.sdp, ...authBody(auth) });
            if (!r.ok) return finish(r.error ?? "ต่อสายไม่สำเร็จ", "failed");
            connectGuard();
          }
        } catch { return finish("ต่อสายไม่สำเร็จ · ลองใหม่อีกครั้ง", "failed"); }
      }
      poll();
    }, x.phase === "connected" ? 4000 : 1000);
  }
  /** แลก SDP แล้วแต่เสียงยังไม่ต่อใน 30 วิ = ต่อไม่สำเร็จ (มักเป็นเครือข่ายที่ต้องใช้ตัวกลาง) */
  function connectGuard() {
    const x = s.current;
    setTimeout(() => { if (!x.done && x.phase !== "connected") finish("ต่อสายไม่สำเร็จ · เครือข่ายอาจไม่รองรับ ลองใช้ Wi-Fi หรือเน็ตมือถืออีกแบบ", "failed"); }, 30_000);
  }
  async function listOutputs() {
    const el = audio.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el || typeof el.setSinkId !== "function") return;
    const ds = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const o = ds.filter((d) => d.kind === "audiooutput" && d.deviceId);
    if (o.length >= 2) setOuts(o);
  }
  async function nextOutput() {
    const el = audio.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el?.setSinkId || !outs.length) return;
    const i = (outIdx + 1) % outs.length;
    await el.setSinkId(outs[i].deviceId).then(() => setOutIdx(i)).catch(() => {});
  }
  const toggleMute = () => {
    const tr = s.current.stream?.getAudioTracks() ?? [];
    const m = !muted;
    tr.forEach((t) => { t.enabled = !m; });
    setMuted(m);
  };
  const hang = () => finish(phase === "calling" ? "ยกเลิกการโทรแล้ว" : "จบสาย" + (s.current.connectedAt ? ` · ${mmss(elapsed)}` : ""), "hangup");

  const status = phase === "init" ? (role === "caller" ? "กำลังเตรียมไมค์…" : "กำลังรับสาย…")
    : phase === "calling" ? "กำลังโทร…"
    : phase === "connecting" ? "กำลังเชื่อมต่อ…"
    : phase === "connected" ? mmss(elapsed)
    : msg ?? "จบสาย";
  const line = msg === "เปิดใน Chrome/Safari เพื่อโทร";

  return (
    <div role="dialog" aria-modal="true" aria-label={`โทรหา${peerName}`} className="fixed inset-0 z-[1000] flex flex-col items-center text-[#f3ead9]" style={{ background: "radial-gradient(120% 80% at 50% 0%, #2c1a1f 0%, #140f0d 70%)", padding: "max(48px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom))" }}>
      <audio ref={audio} autoPlay playsInline />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full max-w-sm text-center">
        <div className={`w-28 h-28 rounded-full grid place-items-center text-[40px] font-semibold ${phase === "calling" ? "animate-pulse" : ""}`} style={{ background: "#211a18", border: `2px solid ${phase === "connected" ? GOLD : LN}`, color: GOLD }} aria-hidden="true">{peerName.trim().charAt(0) || "?"}</div>
        <b className="text-[22px] font-medium">{peerName}</b>
        <p className="m-0 text-[15px] font-light text-[#d9c9b4]" aria-live="polite" style={{ fontVariantNumeric: "tabular-nums" }}>{status}</p>
        {phase === "connected" && <p className="m-0 text-[12px] font-light text-[#d9c9b4]">สายละไม่เกิน 10 นาที · ไม่บันทึกเสียง</p>}
        {line && <a href={externalHref()} target="_blank" rel="noopener" className="rounded-full font-semibold text-[#1b130b] flex items-center" style={{ background: GOLD, padding: "0 20px", height: 44 }}>เปิดใน Chrome/Safari</a>}
      </div>
      {phase !== "ended" ? (
        <div className="flex items-end justify-center gap-6 w-full max-w-sm">
          {(phase === "connected" || phase === "connecting") && (
            <button type="button" onClick={toggleMute} aria-pressed={muted} className="flex flex-col items-center gap-1.5 text-[12px] font-light">
              <span className="w-16 h-16 rounded-full grid place-items-center" style={{ background: muted ? "#f3ead9" : "#211a18", color: muted ? "#1b130b" : "#f3ead9", border: `1px solid ${LN}` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />{muted && <path d="M4 4l16 16" />}</svg>
              </span>
              {muted ? "เปิดไมค์" : "ปิดไมค์"}
            </button>
          )}
          <button type="button" onClick={hang} className="flex flex-col items-center gap-1.5 text-[12px] font-light">
            <span className="w-[72px] h-[72px] rounded-full grid place-items-center text-white" style={{ background: RED }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 9c-3.2 0-6.1.9-8.5 2.5-.6.4-.8 1.2-.4 1.8l1.4 2.1c.4.6 1.1.8 1.7.5l2.6-1.2c.5-.2.8-.8.7-1.3l-.3-1.6c1.8-.6 3.8-.6 5.6 0l-.3 1.6c-.1.5.2 1.1.7 1.3l2.6 1.2c.6.3 1.3.1 1.7-.5l1.4-2.1c.4-.6.2-1.4-.4-1.8C18.1 9.9 15.2 9 12 9z" /></svg>
            </span>
            {phase === "calling" ? "ยกเลิก" : "วางสาย"}
          </button>
          {phase === "connected" && outs.length >= 2 && (
            <button type="button" onClick={nextOutput} className="flex flex-col items-center gap-1.5 text-[12px] font-light max-w-[80px]">
              <span className="w-16 h-16 rounded-full grid place-items-center" style={{ background: "#211a18", border: `1px solid ${LN}` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg>
              </span>
              <span className="truncate w-full">{outs[outIdx]?.label || "ลำโพง"}</span>
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={onClose} className="w-full max-w-sm h-12 rounded-full font-semibold text-[#1b130b]" style={{ background: GOLD }}>ปิด</button>
      )}
    </div>
  );
}
