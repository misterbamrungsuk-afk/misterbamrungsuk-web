"use client";

// จัดการแชท (ลูกค้า + Part-Time): เมนูข้อความ (ยกเลิกการส่ง · ลบข้อความ · คัดลอก) + เมนูกล่องแชท (ซ่อนแชท · ลบกล่องแชท)
// ไม่ลบข้อความจริง — เปลี่ยนแค่สิ่งที่ฉันเห็น ทีมงานยังเก็บประวัติครบ · ยืนยันในหน้า (ไม่ใช้ window.confirm)
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_ACTIVE, UNSEND_MS, UNSENT_TEXT } from "@/lib/chat-manage-rules";

export type CM = { id: number; sender_type: "customer" | "parttime" | "system"; body: string; blocked: boolean; created_at: string; unsent?: boolean };
type Role = "customer" | "parttime";
type Auth = { mb: string; t: string } | null | undefined;
const LN = "rgba(243,234,217,0.09)";

export async function chatAction(bookingId: string, action: string, auth: Auth, extra: Record<string, unknown> = {}): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(`/api/bookings/${bookingId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra, ...(auth ?? {}) }) }).catch(() => null);
  const d = await r?.json().catch(() => null);
  return d?.ok ? { ok: true } : { ok: false, error: d?.error || "ทำรายการไม่สำเร็จ" };
}
/** แก้ข้อความที่ถูกยกเลิกการส่งในที่ (จาก poll: unsent ids) */
export const patchUnsent = (ms: CM[], ids: number[]) => (ids.length ? ms.map((m) => (ids.includes(m.id) ? { ...m, body: "", unsent: true } : m)) : ms);
export const canUnsend = (m: CM, role: Role) => m.sender_type === role && !m.blocked && !m.unsent && Date.now() - Date.parse(m.created_at) < UNSEND_MS;

/** แผ่นเมนูจากด้านล่าง */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // กดค้างเปิดเมนู → นิ้วยกขึ้นอาจเกิด click บนพื้นหลังทันที: ไม่ปิดในช่วงแรกที่เพิ่งเปิด
  const [t0] = useState(() => Date.now());
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] bg-black/60 flex items-end justify-center" onClick={() => { if (Date.now() - t0 > 450) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-[22px] bg-[#211a18] text-[#f3ead9] flex flex-col gap-2" style={{ padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", borderTop: `1px solid ${LN}` }}>
        <b className="text-[15px] font-semibold px-1">{title}</b>
        {children}
        <button type="button" onClick={onClose} className="min-h-12 rounded-[14px] text-[15px] text-[#d9c9b4]" style={{ border: `1px solid ${LN}` }}>ปิด</button>
      </div>
    </div>
  );
}
const Item = ({ onClick, children, danger, disabled }: { onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="min-h-12 rounded-[14px] bg-[#2a211e] text-left px-4 py-2.5 text-[15px] disabled:opacity-50" style={{ color: danger ? "#ff8a9a" : "#f3ead9" }}>{children}</button>
);
function Confirm({ title, body, ok, busy, err, onOk, onBack }: { title: string; body: string; ok: string; busy: boolean; err: string; onOk: () => void; onBack: () => void }) {
  return (
    <Sheet title={title} onClose={onBack}>
      <p className="m-0 px-1 text-[13.5px] leading-relaxed text-[#d9c9b4] whitespace-pre-line">{body}</p>
      {err && <p role="alert" className="m-0 px-1 text-[13px] text-[#ff8a9a]">{err}</p>}
      <button type="button" onClick={onOk} disabled={busy} className="min-h-12 rounded-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#c9283d" }}>{busy ? "กำลังทำรายการ…" : ok}</button>
    </Sheet>
  );
}

/** ปุ่ม ⋯ ข้างฟองข้อความ (พื้นที่แตะ 44px) */
export function MsgMore({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="จัดการข้อความ" className="shrink-0 w-11 h-11 rounded-full grid place-items-center text-[#b5a596] hover:text-[#f3ead9] self-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
    </button>
  );
}
/** ข้อความที่ถูกยกเลิกการส่ง (ทั้งสองฝ่ายเห็นแบบนี้) */
export function UnsentBubble({ mine }: { mine: boolean }) {
  return <div className={`max-w-[76%] text-[14px] italic text-[#b5a596] ${mine ? "self-end" : "self-start"}`} style={{ border: `1px dashed ${LN}`, borderRadius: mine ? "20px 20px 6px 20px" : "20px 20px 20px 6px", padding: "9px 14px" }}>{UNSENT_TEXT}</div>;
}

/** เมนูข้อความ: open(m) จากปุ่ม ⋯ หรือ press(m) = กดค้างบนมือถือ · ui วางไว้ใน JSX */
export function useMsgActions({ bookingId, role, auth, setMs }: { bookingId: string; role: Role; auth?: Auth; setMs: React.Dispatch<React.SetStateAction<CM[]>> }) {
  const [sel, setSel] = useState<CM | null>(null);
  const [step, setStep] = useState<"menu" | "unsend" | "delete">("menu");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = useCallback((m: CM) => { setSel(m); setStep("menu"); setErr(""); }, []);
  const close = useCallback(() => { setSel(null); setBusy(false); }, []);
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const press = (m: CM) => ({
    onTouchStart: () => { stop(); timer.current = setTimeout(() => open(m), 500); },
    onTouchEnd: stop, onTouchMove: stop, onTouchCancel: stop,
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); open(m); },
    style: { WebkitTouchCallout: "none" } as React.CSSProperties,
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(""), 2500); return () => clearTimeout(t); }, [note]);
  const run = async (action: "unsend" | "delete") => {
    if (!sel || busy) return;
    setBusy(true); setErr("");
    const r = await chatAction(bookingId, action, auth, { message_id: sel.id });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "ทำรายการไม่สำเร็จ");
    const id = sel.id;
    setMs((x) => (action === "unsend" ? patchUnsent(x, [id]) : x.filter((m) => m.id !== id)));
    setNote(action === "unsend" ? "ยกเลิกการส่งแล้ว" : "ลบข้อความแล้ว (เฉพาะฝั่งคุณ)");
    close();
  };
  const copy = async () => {
    if (!sel) return;
    await navigator.clipboard?.writeText(sel.body).then(() => setNote("คัดลอกแล้ว")).catch(() => setNote("คัดลอกไม่สำเร็จ"));
    close();
  };
  const ui = !sel ? (note ? <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[120px] z-[90] rounded-full bg-[#2a211e] text-[13px] text-[#f3ead9] px-4 py-2" style={{ border: `1px solid ${LN}` }}>{note}</div> : null)
    : step === "unsend" ? <Confirm title="ยกเลิกการส่งข้อความนี้?" body={"ทั้งสองฝ่ายจะเห็นว่า “" + UNSENT_TEXT + "” แทนข้อความนี้"} ok="ยกเลิกการส่ง" busy={busy} err={err} onOk={() => run("unsend")} onBack={() => setStep("menu")} />
    : step === "delete" ? <Confirm title="ลบข้อความนี้?" body={"ลบเฉพาะฝั่งคุณ · อีกฝ่ายยังเห็นข้อความนี้ตามเดิม"} ok="ลบข้อความ" busy={busy} err={err} onOk={() => run("delete")} onBack={() => setStep("menu")} />
    : (
      <Sheet title="ข้อความ" onClose={close}>
        {!sel.unsent && <p className="m-0 px-1 text-[13px] font-light text-[#b5a596] line-clamp-2 break-words">{sel.body}</p>}
        {canUnsend(sel, role) && <Item onClick={() => setStep("unsend")}>ยกเลิกการส่ง <span className="block text-[12px] text-[#b5a596]">ได้ภายใน 24 ชม. หลังส่ง · ทั้งสองฝ่ายจะไม่เห็นข้อความนี้</span></Item>}
        <Item danger onClick={() => setStep("delete")}>ลบข้อความ <span className="block text-[12px] text-[#b5a596]">เฉพาะฝั่งคุณ</span></Item>
        {!sel.unsent && <Item onClick={copy}>คัดลอก</Item>}
        {err && <p role="alert" className="m-0 px-1 text-[13px] text-[#ff8a9a]">{err}</p>}
      </Sheet>
    );
  return { open, press, ui };
}

/** เมนูกล่องแชท (หัวห้องแชท / แถวในรายการแชท) — ซ่อนแชท · เลิกซ่อน · ลบกล่องแชท (เฉพาะนัดที่จบแล้ว) */
export function ChatBoxMenu({ bookingId, status, auth, hidden, onDone, className }: { bookingId: string; status: string; auth?: Auth; hidden?: boolean; onDone: (action: "hide" | "unhide" | "delete_box") => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "delete">("menu");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const active = CHAT_ACTIVE.includes(status);
  const close = useCallback(() => { setOpen(false); setStep("menu"); setErr(""); }, []);
  const run = async (action: "hide" | "unhide" | "delete_box") => {
    if (busy) return;
    setBusy(true); setErr("");
    const r = await chatAction(bookingId, action, auth);
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "ทำรายการไม่สำเร็จ");
    close(); onDone(action);
  };
  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} aria-label="จัดการแชท" className={className ?? "w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#d9c9b4] hover:text-[#f3ead9]"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (step === "delete"
        ? <Confirm title="ลบกล่องแชทนี้?" body={"แชทนี้จะหายจากรายการของคุณ และล้างข้อความทั้งหมดฝั่งคุณ\nอีกฝ่ายและทีมงานยังเก็บประวัติแชทไว้ครบ (ใช้ตรวจสอบเมื่อมีปัญหา)\nถ้ามีข้อความใหม่ แชทจะกลับมาพร้อมข้อความใหม่เท่านั้น"} ok="ลบกล่องแชท" busy={busy} err={err} onOk={() => run("delete_box")} onBack={() => setStep("menu")} />
        : (
          <Sheet title="จัดการแชท" onClose={close}>
            {hidden ? <Item onClick={() => run("unhide")} disabled={busy}>เลิกซ่อน <span className="block text-[12px] text-[#b5a596]">กลับมาแสดงในรายการแชท</span></Item>
              : <Item onClick={() => run("hide")} disabled={busy}>ซ่อนแชท <span className="block text-[12px] text-[#b5a596]">ซ่อนจากรายการ · มีข้อความใหม่จะกลับมาเอง</span></Item>}
            {active ? <p className="m-0 px-1 text-[12.5px] text-[#b5a596]">นัดนี้ยังไม่จบ · ลบกล่องแชทได้หลังจบนัด ตอนนี้ซ่อนได้อย่างเดียว</p>
              : <Item danger onClick={() => setStep("delete")}>ลบกล่องแชท <span className="block text-[12px] text-[#b5a596]">ล้างประวัติฝั่งคุณ · อีกฝ่ายและทีมงานยังเก็บไว้</span></Item>}
            {err && <p role="alert" className="m-0 px-1 text-[13px] text-[#ff8a9a]">{err}</p>}
          </Sheet>
        ))}
    </>
  );
}
