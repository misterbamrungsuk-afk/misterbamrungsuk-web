"use client";

import { useState } from "react";
import { Card, Pill } from "../admin-nav";
import { useConfirm } from "../confirm";
import { APPLY_DOC_LABEL, BUSINESS_TYPES } from "@/lib/market/config";
import type { AdminData } from "@/lib/market/admin-data";

type App = AdminData["applications"][number];
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—");
const ST: Record<App["status"], [string, "gold" | "green" | "red"]> = { pending: ["รอตรวจ", "gold"], approved: ["อนุมัติแล้ว", "green"], rejected: ["ไม่อนุมัติ", "red"] };

// คิวใบสมัครเปิดร้าน (/market/sell) — อนุมัติ = สร้างร้าน + บัญชีร้านจากอีเมลผู้สมัคร + ลิงก์เชิญตั้งรหัสผ่าน (ส่งให้ร้านเอง) · ไม่อนุมัติต้องมีเหตุผล
export function Applications({ d, reload, setMsg }: { d: AdminData; reload: () => Promise<void>; setMsg: (s: string) => void }) {
  const [confirmUi, ask] = useConfirm();
  const [filter, setFilter] = useState<App["status"] | "all">("pending");
  const [gp, setGp] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [invite, setInvite] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const call = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/market/admin/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; invite?: string };
  };
  const approve = async (a: App) => {
    const g = (gp[a.id] ?? "").trim();
    if (!(await ask({ title: `อนุมัติร้าน “${a.shop_name}”?`, body: `สร้างร้าน + บัญชีร้านค้า (${a.email})\nGP ${g === "" ? "รอกำหนด (ตั้งทีหลังได้ในแท็บร้านค้า / GP)" : `${g}%`}\nแล้วคัดลอกลิงก์เชิญส่งให้ร้านตั้งรหัสผ่าน`, ok: "อนุมัติ" }))) return;
    setBusy(a.id);
    const out = await call({ op: "approve", id: a.id, gp_pct: g === "" ? null : Number(g) });
    setBusy("");
    if (!out.ok) return setMsg(out.error || "อนุมัติไม่สำเร็จ");
    setInvite({ ...invite, [a.id]: location.origin + out.invite });
    setMsg(`อนุมัติ ${a.shop_name} แล้ว · คัดลอกลิงก์เชิญส่งให้ร้าน (ใช้ได้ 7 วัน)`);
    await reload();
  };
  const reject = async (a: App) => {
    const r = (reason[a.id] ?? "").trim();
    if (!r) return setMsg("ใส่เหตุผลที่ไม่อนุมัติก่อน");
    if (!(await ask({ title: `ไม่อนุมัติ “${a.shop_name}”?`, body: `เหตุผล: ${r}\nผู้สมัครสมัครใหม่ด้วยอีเมลเดิมได้`, ok: "ไม่อนุมัติ", danger: true }))) return;
    setBusy(a.id);
    const out = await call({ op: "reject", id: a.id, reason: r });
    setBusy("");
    setMsg(out.ok ? `ไม่อนุมัติ ${a.shop_name} แล้ว` : out.error || "ไม่สำเร็จ");
    if (out.ok) await reload();
  };
  const reInvite = async (a: App) => {
    setBusy(a.id);
    const out = await call({ op: "invite", id: a.id });
    setBusy("");
    if (!out.ok) return setMsg(out.error || "ไม่สำเร็จ");
    setInvite({ ...invite, [a.id]: location.origin + out.invite });
    setMsg("ออกลิงก์เชิญใหม่แล้ว · ลิงก์เก่าใช้ไม่ได้");
  };
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); setMsg("คัดลอกลิงก์เชิญแล้ว"); } catch { setMsg("คัดลอกไม่ได้ · กดค้างที่ลิงก์เพื่อคัดลอกเอง"); } };
  const rows = d.applications.filter((a) => filter === "all" || a.status === filter);
  const lbl = "text-xs text-ink-300";
  return (
    <>
      {confirmUi}
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip h-8 px-3 text-xs ${filter === s ? "chip-red" : ""}`}>
            {s === "all" ? "ทั้งหมด" : ST[s][0]}{s === "pending" ? ` (${d.applications.filter((a) => a.status === "pending").length})` : ""}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-300">ร้านสมัครเองที่ /market/sell · ตรวจเอกสารก่อนอนุมัติ · อนุมัติแล้วร้านเพิ่มสินค้าเองในพอร์ทัล (สินค้าต้องมีเลข อย. และรอแอดมินอนุมัติทุกชิ้น)</p>
      {!rows.length && <Card><p className="text-sm text-ink-300">ไม่มีใบสมัคร</p></Card>}
      {rows.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[240px]">
              <div className="flex flex-wrap items-center gap-2"><b>{a.shop_name}</b><Pill tone={ST[a.status][1]}>{ST[a.status][0]}</Pill><span className="text-xs text-ink-300">{BUSINESS_TYPES[a.business_type] ?? a.business_type} · {a.category}</span></div>
              <p className="text-sm mt-1">{a.owner_name} · {a.phone} · {a.email}{a.line_id ? ` · LINE ${a.line_id}` : ""}</p>
              {a.description && <p className="text-xs text-ink-300 whitespace-pre-line mt-1">{a.description}</p>}
              <p className="text-xs text-[#9a8a85] mt-2">สมัคร {dt(a.created_at)}{a.reviewed_by ? ` · ตรวจโดย ${a.reviewed_by} ${dt(a.reviewed_at)}` : ""}</p>
              {a.reject_reason && <p className="text-xs text-crimson-300">เหตุผลที่ไม่อนุมัติ: {a.reject_reason}</p>}
              {a.vendor_id && <p className="text-xs text-emerald-300">ร้าน: {d.vendors.find((v) => v.id === a.vendor_id)?.name ?? a.vendor_id}{d.accounts.some((x) => x.vendor_id === a.vendor_id && x.active) ? " · ตั้งรหัสผ่านแล้ว" : " · ยังไม่ได้ตั้งรหัสผ่าน"}</p>}
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <span className={lbl}>เอกสาร</span>
              {a.docs.map((x, i) => <a key={x.path} href={`/api/market/admin/apply-doc?id=${a.id}&i=${i}`} target="_blank" rel="noreferrer" className="chip h-9 px-3 text-xs inline-flex items-center">{APPLY_DOC_LABEL[x.kind] ?? x.kind}{x.type === "application/pdf" ? " (PDF)" : ""} ↗</a>)}
              {!a.docs.some((x) => x.kind === "fda_license") && <span className="text-xs text-[#9a8a85]">ไม่ได้แนบใบอนุญาต อย.</span>}
            </div>
          </div>
          {a.status === "pending" && (
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <input inputMode="decimal" placeholder="GP % (ว่าง = รอกำหนด)" value={gp[a.id] ?? ""} onChange={(e) => setGp({ ...gp, [a.id]: e.target.value })} className="input-dark h-10 w-44 text-sm" aria-label="GP %" />
              <button disabled={busy === a.id} onClick={() => approve(a)} className="btn-crimson h-10 px-4 rounded-full text-sm disabled:opacity-40">อนุมัติ + สร้างลิงก์เชิญ</button>
              <input placeholder="เหตุผลถ้าไม่อนุมัติ" value={reason[a.id] ?? ""} onChange={(e) => setReason({ ...reason, [a.id]: e.target.value })} className="input-dark h-10 flex-1 min-w-40 text-sm" aria-label="เหตุผลที่ไม่อนุมัติ" />
              <button disabled={busy === a.id || !(reason[a.id] ?? "").trim()} onClick={() => reject(a)} className="chip h-10 px-4 disabled:opacity-40">ไม่อนุมัติ</button>
            </div>
          )}
          {a.status === "approved" && !invite[a.id] && !d.accounts.some((x) => x.vendor_id === a.vendor_id && x.active) && (
            <button disabled={busy === a.id} onClick={() => reInvite(a)} className="chip h-10 px-4 mt-3">ออกลิงก์เชิญใหม่</button>
          )}
          {invite[a.id] && (
            <div className="mt-3 rounded-xl border border-gold-500/50 p-3 flex flex-wrap gap-2 items-center text-sm">
              <span className="text-xs text-ink-300 w-full">ลิงก์เชิญตั้งรหัสผ่าน (ใช้ได้ 7 วัน · ส่งให้ร้านทาง LINE/อีเมล)</span>
              <input readOnly value={invite[a.id]} onFocus={(e) => e.currentTarget.select()} className="input-dark h-10 flex-1 min-w-48 text-xs" aria-label="ลิงก์เชิญ" />
              <button onClick={() => copy(invite[a.id])} className="btn-crimson h-10 px-4 rounded-full text-sm">คัดลอก</button>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
