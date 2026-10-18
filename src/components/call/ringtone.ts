"use client";

// เสียงเรียกเข้า (WebAudio ล้วน — ไม่มีไฟล์เสียง)
// เบราว์เซอร์ไม่ให้เล่นเสียงก่อนผู้ใช้แตะหน้า → primeRingtone() รอแตะ/กดปุ่มครั้งแรกที่ไหนก็ได้ แล้วเปิด AudioContext ไว้
// สายเข้าก่อนแตะ = ยังไม่ดัง (สั่นแทน) แต่ถ้าแตะระหว่างสายยังดังอยู่ เสียงจะเริ่มทันที · ปิดเสียงได้ (จำในเครื่อง localStorage)
const MUTE_KEY = "mb_call_ring_muted";
type W = Window & { webkitAudioContext?: typeof AudioContext };
const st: { ctx: AudioContext | null; primed: boolean; wanted: boolean; loop: ReturnType<typeof setInterval> | null; nodes: { o: OscillatorNode[]; g: GainNode }[] } = { ctx: null, primed: false, wanted: false, loop: null, nodes: [] };

export function ringMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setRingMuted(m: boolean) {
  try { if (m) localStorage.setItem(MUTE_KEY, "1"); else localStorage.removeItem(MUTE_KEY); } catch {}
  if (m) silence(); else if (st.wanted) begin();
}

function unlock() {
  if (!st.ctx) {
    const AC = window.AudioContext ?? (window as W).webkitAudioContext;
    if (!AC) return;
    try { st.ctx = new AC(); } catch { return; }
  }
  if (st.ctx.state === "suspended") void st.ctx.resume().catch(() => {});
  if (st.wanted) begin();
}
/** ติดตั้งครั้งเดียว: รอการแตะ/กดครั้งแรกเพื่อปลดล็อกเสียง */
export function primeRingtone() {
  if (st.primed || typeof window === "undefined") return;
  st.primed = true;
  const EVENTS = ["pointerdown", "touchstart", "keydown"] as const;
  const once = () => { unlock(); if (st.ctx && st.ctx.state !== "suspended") for (const ev of EVENTS) window.removeEventListener(ev, once, true); };
  for (const ev of EVENTS) window.addEventListener(ev, once, true);
}

/** รูปแบบเสียง: ดู๊ด-ดู๊ด (2 ความถี่ผสม 0.4 วิ ×2) แล้วเงียบ ~2 วิ · วนทุก 3 วิ */
function burst() {
  const ctx = st.ctx;
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.02;
  for (const off of [0, 0.6]) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0 + off);
    g.gain.linearRampToValueAtTime(0.16, t0 + off + 0.03);
    g.gain.setValueAtTime(0.16, t0 + off + 0.37);
    g.gain.linearRampToValueAtTime(0, t0 + off + 0.4);
    g.connect(ctx.destination);
    const o = [440, 480].map((f) => { const x = ctx.createOscillator(); x.type = "sine"; x.frequency.value = f; x.connect(g); x.start(t0 + off); x.stop(t0 + off + 0.42); return x; });
    const n = { o, g };
    st.nodes.push(n);
    o[0].onended = () => { try { g.disconnect(); } catch {} st.nodes = st.nodes.filter((y) => y !== n); };
  }
}
function begin() {
  if (st.loop || ringMuted() || !st.ctx) return;
  if (st.ctx.state === "suspended") void st.ctx.resume().then(() => { if (st.loop) burst(); }).catch(() => {});
  else burst();
  st.loop = setInterval(burst, 3000);
}
function silence() {
  if (st.loop) clearInterval(st.loop);
  st.loop = null;
  for (const n of st.nodes) { for (const o of n.o) { try { o.stop(); } catch {} } try { n.g.disconnect(); } catch {} }
  st.nodes = [];
}

/** เริ่มดัง (ถ้ายังไม่ได้แตะหน้า = รอแตะก่อน) */
export function startRing() { st.wanted = true; begin(); }
/** หยุด: รับสาย / ไม่รับ / หมดเวลา */
export function stopRing() { st.wanted = false; silence(); }
