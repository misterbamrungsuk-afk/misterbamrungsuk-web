"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// กล่องยืนยันในหน้า (แทน window.confirm) — ใช้กับปุ่มที่ย้อนกลับไม่ได้/เกี่ยวกับเงิน
// ใช้: const [confirmUi, ask] = useConfirm(); ... if (!(await ask({ title, body }))) return;  แล้ววาง {confirmUi} ไว้ใน JSX
export type ConfirmOpts = { title: string; body?: React.ReactNode; ok?: string; cancel?: string; danger?: boolean };

export function useConfirm(): [React.ReactNode, (o: ConfirmOpts) => Promise<boolean>] {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const done = useRef<((v: boolean) => void) | null>(null);
  const okBtn = useRef<HTMLButtonElement>(null);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((res) => { done.current?.(false); done.current = res; setOpts(o); }), []);
  const close = (v: boolean) => { done.current?.(v); done.current = null; setOpts(null); };
  useEffect(() => {
    if (!opts) return;
    okBtn.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [opts]);
  const ui = opts ? (
    <div role="dialog" aria-modal="true" aria-labelledby="adm-confirm-t" className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4" onClick={() => close(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-2xl border border-[rgba(240,200,90,.38)] bg-[#1c1414] p-5 text-[#f6efe4] shadow-[0_16px_48px_rgba(0,0,0,.6)] flex flex-col gap-3 text-[14px]">
        <b id="adm-confirm-t" className="font-lux text-[17px]" style={{ color: opts.danger ? "#fecaca" : "#ffd76a" }}>{opts.title}</b>
        {opts.body && <div className="text-[13.5px] leading-relaxed text-[#d3c7bc] whitespace-pre-line">{opts.body}</div>}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button type="button" onClick={() => close(false)} className="h-11 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc]">{opts.cancel ?? "ยกเลิก"}</button>
          <button ref={okBtn} type="button" onClick={() => close(true)} className={`h-11 rounded-full font-semibold ${opts.danger ? "bg-crimson-500 text-white" : "text-[#1a1206]"}`} style={opts.danger ? undefined : { background: "#f0c75a" }}>{opts.ok ?? "ยืนยัน"}</button>
        </div>
      </div>
    </div>
  ) : null;
  return [ui, ask];
}

export const EXPIRED = "เซสชันหมดอายุ · เข้าสู่ระบบใหม่";

/** ข้อความแจ้งผลชั่วคราว — ล้าง timer เก่าก่อนตั้งใหม่ (กันข้อความใหม่หายเร็วเพราะ timer ของข้อความก่อน) · 401 = แจ้งเซสชันหมดอายุพร้อมลิงก์ (ค้างไว้) */
export function useFlash(ms = 4000) {
  const [msg, setMsg] = useState<{ text: string; expired?: boolean; ok?: boolean } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((text: string, o: { ok?: boolean; keep?: boolean; expired?: boolean } = {}) => {
    if (t.current) clearTimeout(t.current);
    t.current = null;
    setMsg({ text: o.expired ? EXPIRED : text, expired: o.expired, ok: o.ok });
    if (!o.keep && !o.expired && text) t.current = setTimeout(() => setMsg(null), ms);
  }, [ms]);
  /** แจ้งผลจาก response: 401 = หมดอายุ · อื่น ๆ ใช้ข้อความที่ส่งมา */
  const fromRes = useCallback((res: Response | null | undefined, text: string, ok?: boolean) => flash(text, { expired: res?.status === 401, ok }), [flash]);
  const clear = useCallback(() => { if (t.current) clearTimeout(t.current); t.current = null; setMsg(null); }, []);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  return { msg, flash, fromRes, clear };
}

export function FlashMsg({ msg, className = "text-sm" }: { msg: { text: string; expired?: boolean; ok?: boolean } | null; className?: string }) {
  if (!msg) return null;
  const color = msg.expired ? "#fca5a5" : msg.ok === false ? "#fca5a5" : msg.ok ? "#4ade80" : "#eed58a";
  return (
    <p role="status" className={`m-0 whitespace-pre-line break-words ${className}`} style={{ color }}>
      {msg.text}
      {msg.expired && <> · <a href="/admin-login" className="underline text-[#ffd76a]">ไปหน้าเข้าสู่ระบบ</a></>}
    </p>
  );
}
