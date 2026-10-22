"use client";

// ลิงก์เชิญ (บอร์ด AdminInvites) — ช่องทางสมัครพิเศษจากทีมงาน · ค่าสมัครเท่าสมัครปกติ
import { useEffect, useState } from "react";
import { Card, PageHead } from "../admin-nav";
import type { Invite } from "@/lib/join/invites";

const GOLD = "#e8c472";
const inp = "h-10 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 text-[14px] outline-none focus:border-gold-500";
const thDate = (d: string) => new Date(`${d}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const stateOf = (i: Invite) => !i.enabled ? "ปิดอยู่" : Date.now() > Date.parse(`${i.expires}T23:59:59+07:00`) ? "หมดอายุ" : i.limit !== null && i.used >= i.limit ? "ครบจำนวน" : "ใช้งานได้";
const plus30 = () => new Date(Date.now() + 30 * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);

export function InvitesAdmin({ initial, recent }: { initial: Invite[]; recent: { name: string; mb: string; src: string; at: string }[] }) {
  const [list, setList] = useState(initial);
  const [f, setF] = useState({ name: "", limit: "10", unl: false, expires: plus30(), secret: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const url = (c: string) => `${origin}/join/i/${c}`;

  const create = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, limit: f.unl ? null : Number(f.limit), expires: f.expires, kind: f.secret ? "secret" : undefined }) }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { ok?: boolean; data?: Invite; error?: string } | null;
    setBusy(false);
    if (d?.ok && d.data) { setList((l) => [d.data!, ...l]); setF((x) => ({ ...x, name: "" })); setMsg({ ok: true, t: `สร้างแล้ว · ${url(d.data.code)}` }); }
    else setMsg({ ok: false, t: d?.error ?? "สร้างไม่สำเร็จ" });
  };
  const toggle = async (i: Invite) => {
    const res = await fetch("/api/admin/invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: i.code, enabled: !i.enabled }) }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { ok?: boolean; data?: Invite } | null;
    if (d?.ok && d.data) setList((l) => l.map((x) => (x.code === i.code ? d.data! : x)));
  };
  const copy = async (c: string) => { try { await navigator.clipboard.writeText(url(c)); setCopied(c); setTimeout(() => setCopied(""), 1600); } catch { setCopied(""); } };

  return (
    <>
      <PageHead title="ลิงก์เชิญ" sub="INVITE LINKS · ช่องทางสมัครพิเศษ · สมัครฟรี (ปกติ = TOP · Secret = ระดับ Secret)" />
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="font-semibold mb-3">สร้างลิงก์ใหม่</h2>
          <div role="radiogroup" aria-label="ประเภทลิงก์" className="grid grid-cols-2 gap-2 mb-3 max-w-[520px]">
            {([[false, "เชิญปกติ", "สมัครฟรี · ได้ระดับ TOP"], [true, "Secret", "สมัครฟรี · ระดับ Secret · ราคาแอดมินกำหนด"]] as const).map(([v, t, d]) => (
              <button key={t} type="button" role="radio" aria-checked={f.secret === v} data-invite-kind={v ? "secret" : "normal"} onClick={() => setF({ ...f, secret: v })} className="rounded-xl border px-3 py-2 text-left"
                style={{ borderColor: f.secret === v ? (v ? "#b9a6ff" : GOLD) : "rgba(243,234,217,0.10)", background: f.secret === v ? (v ? "rgba(10,8,12,.9)" : "rgba(232,196,114,0.14)") : "transparent", boxShadow: f.secret === v && v ? "0 0 14px rgba(185,166,255,.35)" : "none" }}>
                <b className="block text-[14px]" style={{ color: v ? "#d9ccff" : GOLD }}>{t}</b><span className="text-[12px] text-ink-300">{d}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[2fr_1.4fr_1fr_auto] md:items-end">
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-300">ชื่อ / โน้ต</span><input className={inp} value={f.name} maxLength={60} placeholder="เช่น ทีมนวด รุ่น 1" onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <div className="flex flex-col gap-1"><span className="text-xs text-ink-300">ใช้ได้กี่ครั้ง</span>
              <div className="flex gap-2">
                <input className={inp} inputMode="numeric" aria-label="จำนวนครั้ง" disabled={f.unl} value={f.unl ? "∞" : f.limit} onChange={(e) => setF({ ...f, limit: e.target.value.replace(/\D/g, "") })} style={{ opacity: f.unl ? 0.4 : 1 }} />
                <button type="button" aria-pressed={f.unl} onClick={() => setF({ ...f, unl: !f.unl })} className="h-10 px-3 rounded-lg border text-[13px] whitespace-nowrap" style={{ borderColor: f.unl ? GOLD : "rgba(243,234,217,0.10)", background: f.unl ? "rgba(232,196,114,0.18)" : "transparent", color: f.unl ? GOLD : undefined }}>ไม่จำกัด</button>
              </div>
            </div>
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-300">วันหมดอายุ</span><input type="date" className={inp} value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} style={{ colorScheme: "dark" }} /></label>
            <button type="button" onClick={create} disabled={busy || !f.name.trim()} className="btn-crimson h-10 px-5 rounded-xl font-semibold disabled:opacity-50">{busy ? "กำลังสร้าง…" : "สร้างลิงก์"}</button>
          </div>
          {msg && <p role="status" className="mt-3 text-sm break-all" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] min-w-[760px]">
              <thead><tr className="text-left text-xs text-ink-300">{["ชื่อ / โน้ต", "ลิงก์", "ใช้แล้ว", "หมดอายุ", "สถานะ", "เปิด/ปิด"].map((h) => <th key={h} className="font-normal pb-2 pr-3">{h}</th>)}</tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-ink-300">ยังไม่มีลิงก์เชิญ · สร้างลิงก์แรกด้านบน</td></tr>}
                {list.map((i) => {
                  const st = stateOf(i);
                  return (
                    <tr key={i.code} className="border-t border-ink-600" style={{ opacity: i.enabled ? 1 : 0.6 }}>
                      <td className="py-2.5 pr-3">{i.kind === "secret" && <span className="mr-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#0b0910", color: "#d9ccff", boxShadow: "0 0 8px rgba(185,166,255,.45)" }}>SECRET</span>}{i.name}</td>
                      <td className="py-2.5 pr-3"><span className="flex items-center gap-2"><code className="text-[12.5px] text-gold-300 break-all">{origin ? url(i.code).replace(/^https?:\/\//, "") : `/join/i/${i.code}`}</code><button type="button" onClick={() => copy(i.code)} className="shrink-0 h-8 px-2.5 rounded-lg border border-ink-600 text-[12px]">{copied === i.code ? "คัดลอกแล้ว" : "คัดลอก"}</button></span></td>
                      <td className="py-2.5 pr-3 tabular-nums">{i.used} / {i.limit ?? "ไม่จำกัด"}</td>
                      <td className="py-2.5 pr-3">{thDate(i.expires)}</td>
                      <td className="py-2.5 pr-3" style={{ color: st === "ใช้งานได้" ? "#7fd6a3" : st === "ปิดอยู่" ? undefined : "#ff8a9a" }}>{st}</td>
                      <td className="py-2.5"><button type="button" role="switch" aria-checked={i.enabled} aria-label={`เปิด/ปิด ${i.name}`} onClick={() => toggle(i)} className="w-11 h-[26px] rounded-full relative" style={{ background: i.enabled ? GOLD : "rgba(243,234,217,0.18)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: i.enabled ? 21 : 3 }} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-2">ผู้สมัครล่าสุดจากลิงก์เชิญ</h2>
          {recent.length === 0 ? <p className="text-[13px] text-ink-300 m-0">ยังไม่มีผู้สมัครจากลิงก์เชิญ</p> : (
            <ul className="m-0 p-0 list-none flex flex-col">
              {recent.map((r) => <li key={r.mb} className="flex justify-between gap-3 py-2 border-t border-ink-600 first:border-0 text-[14px]"><span>{r.name} · <a href={`/admin/applicants?q=${r.mb}`} className="text-gold-300">{r.mb}</a></span><span className="text-ink-300 text-[13px]">{r.src}</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
