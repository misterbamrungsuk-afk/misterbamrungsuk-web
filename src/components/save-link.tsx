"use client";

// บันทึกลิงก์เข้าโปรไฟล์ Part-Time — ใช้ในป๊อปอัปหลังจ่าย (/join/pay) และหน้าหลัก Part-Time
// LINE in-app browser กับ Chrome/Safari คุกกี้แยกกัน → ให้เก็บลิงก์ไว้เอง: คัดลอก · ส่งเข้า LINE ตัวเอง (Keep/แชท) · ส่งอีเมลซ้ำ
import { useEffect, useRef, useState } from "react";

const btn = "min-h-12 w-full rounded-[14px] text-[15px] font-semibold grid place-items-center text-center px-3";

export function lineShareUrl(text: string) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

export function SaveLink({ mb, t = "", link: initial = "", email: initialEmail = "", heading = true }: { mb: string; t?: string; link?: string; email?: string; heading?: boolean }) {
  const [link, setLink] = useState(initial);
  const [email, setEmail] = useState(initialEmail);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const raw = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial && initialEmail) return;
    fetch(`/api/join/link?mb=${encodeURIComponent(mb)}${t ? `&t=${encodeURIComponent(t)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((d: { ok?: boolean; url?: string; email?: string }) => { if (d.ok) { if (!initial && d.url) setLink(d.url); setEmail(d.email ?? ""); } })
      .catch(() => {});
  }, [mb, t, initial, initialEmail]);

  useEffect(() => { if (showRaw) raw.current?.select(); }, [showRaw]);

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setMsg({ ok: true, text: "คัดลอกลิงก์แล้ว · วางเก็บไว้ในโน้ตหรือแชทของตัวเอง" }); return; } catch {}
    // เบราว์เซอร์ในแอปบางตัวไม่ให้ใช้คลิปบอร์ด → โชว์ลิงก์ให้กดค้างคัดลอกเอง
    setShowRaw(true);
    setTimeout(() => { raw.current?.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} setMsg(ok ? { ok: true, text: "คัดลอกลิงก์แล้ว" } : { ok: false, text: "กดค้างที่ลิงก์ด้านล่างแล้วเลือก \"คัดลอก\"" }); }, 30);
  };

  const resend = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/join/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mb, t }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; email?: string; error?: string };
      setMsg(d.ok ? { ok: true, text: `ส่งลิงก์ไปที่ ${d.email || "อีเมลที่ใช้สมัคร"} แล้ว · ตรวจกล่องจดหมายและสแปม` } : { ok: false, text: d.error || "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } catch { setMsg({ ok: false, text: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" }); }
    finally { setBusy(false); }
  };

  const shareText = `ลิงก์เข้าโปรไฟล์ Part-Time ของฉัน (${mb}) · Mister Bamrungsuk\n${link}`;
  return (
    <div className="flex flex-col gap-2.5 w-full text-left" data-save-link="1">
      {heading && <div className="font-semibold text-[15px] text-[#e8c472]">บันทึกลิงก์เข้าโปรไฟล์</div>}
      <p className="m-0 text-[13px] leading-[1.6] text-[#d9c9b4]">เก็บลิงก์นี้ไว้ ใช้เข้าโปรไฟล์จากเครื่องอื่นหรือจากแอป LINE{email ? ` · เราส่งลิงก์ไปที่ ${email} ด้วย` : ""}</p>
      <button type="button" onClick={copy} disabled={!link} className={btn + " bg-[#e8c472] text-[#1b130b] disabled:opacity-50"}>คัดลอกลิงก์</button>
      {link
        ? <a href={lineShareUrl(shareText)} target="_blank" rel="noopener noreferrer" className={btn + " text-white hover:text-white"} style={{ background: "#06c755" }}>ส่งลิงก์เข้า LINE ของฉัน</a>
        : <span className={btn + " text-white opacity-50"} style={{ background: "#06c755" }}>ส่งลิงก์เข้า LINE ของฉัน</span>}
      <button type="button" onClick={resend} disabled={busy} aria-busy={busy} className={btn + " text-[#e8c472] disabled:opacity-50"} style={{ border: "1px solid rgba(232,196,114,.6)" }}>{busy ? "กำลังส่ง…" : "ส่งลิงก์ไปอีเมลอีกครั้ง"}</button>
      {showRaw && <input ref={raw} readOnly value={link} aria-label="ลิงก์เข้าโปรไฟล์" onFocus={(e) => e.currentTarget.select()} className="w-full min-h-11 rounded-xl bg-[#211a18] text-[#f3ead9] px-3 text-[13px]" />}
      {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
      <p className="m-0 text-[12px] text-[#b5a596] leading-[1.5]">ใน LINE เลือกส่งให้ &quot;Keep&quot; หรือแชทของตัวเอง · ลิงก์ใช้ได้ 30 วัน · อย่าส่งให้คนอื่น</p>
    </div>
  );
}
