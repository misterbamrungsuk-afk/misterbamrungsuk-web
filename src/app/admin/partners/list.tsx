"use client";

import { useMemo, useState } from "react";
import { Card, Pill } from "../admin-nav";
import { PACKAGE_KEYS, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";
import { ACCOUNT_LABEL, ACCOUNT_STATUSES, CLIP_LABEL, CLIP_STATUSES, PURCHASE_LABEL, fileUrl, type AccountStatus, type ClipStatus, type Purchase } from "@/lib/partner/portal-types";
import { LISTING_TYPES, venueKind } from "@/lib/partner/kind";
import { PARTNER_STATUSES, QC_LABEL, QC_STATES, STATUS_LABEL, daysLeft, planDays, QC_DOC_DEFS, qcSlotLabel, type PartnerQc, type PartnerStatus, type QcDocs, type QcStatus } from "@/lib/partner/status";

// ชนิดฝั่ง client (ตรงกับ Partner ใน store.ts — store เป็น server-only)
export type PartnerRow = {
  id: string; business_name: string; type: string; province: string; contact_name: string; tel: string; email: string;
  line_id: string; links: string; package: PartnerPackageKey; message: string; status: PartnerStatus; qc: PartnerQc;
  starts_at: string | null; ends_at: string | null; amount: number; notes: string | null; created_at: string;
  account_status?: AccountStatus; clip_status?: ClipStatus | null; clip_note?: string | null; platform_pct?: number | null; has_login?: boolean;
  qc_slot?: string | null; qc_docs?: QcDocs | null; qc_status?: QcStatus | null;
};

const TONE: Record<PartnerStatus, "gold" | "red" | "muted" | "green"> = {
  new: "gold", contacted: "muted", qc: "gold", active: "green", expired: "muted", rejected: "red",
};
const fmt = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" }) : "—");

function Remaining({ p }: { p: PartnerRow }) {
  const left = daysLeft(p.ends_at);
  if (left == null || !p.starts_at || !p.ends_at) return <span className="text-ink-300 text-xs">—</span>;
  const total = Math.max(1, planDays(p.starts_at, p.ends_at) ?? 1);
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const warn = left <= 30;
  return (
    <div className="min-w-28">
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <div className={`h-full ${warn ? "bg-crimson-500" : "bg-gold-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[11px] mt-1 ${warn ? "text-crimson-200" : "text-ink-300"}`}>{left > 0 ? `เหลือ ${left} วัน` : "หมดอายุแล้ว"}</p>
    </div>
  );
}

export function PartnerList({ initial, purchases: initialPurchases }: { initial: PartnerRow[]; purchases: Purchase[] }) {
  const [rows, setRows] = useState(initial);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [tab, setTab] = useState<PartnerStatus | "all">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const kpi = useMemo(() => {
    const soon = rows.filter((r) => r.status === "active" && (daysLeft(r.ends_at) ?? 999) <= 30).length;
    return [
      ["พาร์ทเนอร์ทั้งหมด", String(rows.length)],
      ["กำลังโปรโมท", String(rows.filter((r) => r.status === "active").length)],
      ["รอทำสัญญา / QC", String(rows.filter((r) => r.status === "qc" || r.status === "contacted").length)],
      ["ใกล้หมดอายุ ≤30 วัน", String(soon)],
      ["สลิปแผนโปรโมทรอตรวจ", String(purchases.filter((x) => x.status === "pending").length)],
      ["รายได้รวม", `฿${baht(rows.reduce((s, r) => s + (r.amount || 0), 0))}`],
    ];
  }, [rows, purchases]);

  // ค้นหา: ชื่อธุรกิจ / ผู้ติดต่อ / อีเมล / เบอร์ / จังหวัด / ประเภท
  const needle = q.trim().toLowerCase();
  const shown = (tab === "all" ? rows : rows.filter((r) => r.status === tab))
    .filter((r) => !needle || [r.business_name, r.contact_name, r.email, r.tel, r.province, r.type].some((v) => String(v ?? "").toLowerCase().includes(needle)));
  const cur = rows.find((r) => r.id === sel) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpi.map(([k, v]) => (
          <Card key={k}><p className="text-xs text-ink-300">{k}</p><p className="font-display text-2xl font-semibold mt-1 truncate">{v}</p></Card>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-5 pb-1">
        {(["all", ...PARTNER_STATUSES] as const).map((s) => {
          const n = s === "all" ? rows.length : rows.filter((r) => r.status === s).length;
          return (
            <button key={s} onClick={() => setTab(s)} className={`chip whitespace-nowrap h-9 px-3.5 ${tab === s ? "chip-red" : ""}`}>
              {s === "all" ? "ทั้งหมด" : STATUS_LABEL[s]} · {n}
            </button>
          );
        })}
      </div>

      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อธุรกิจ · ผู้ติดต่อ · อีเมล · เบอร์ · จังหวัด" aria-label="ค้นหาพาร์ทเนอร์" className="input-dark w-full md:max-w-md mt-3 min-h-11" />
      <div className="mt-4 flex flex-col lg:flex-row gap-4 items-start">
        <Card className="flex-1 min-w-0 w-full overflow-x-auto !p-0">
          {shown.length === 0 ? (
            <p className="p-6 text-sm text-ink-300">ยังไม่มีพาร์ทเนอร์ในสถานะนี้</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-300 border-b border-ink-600">
                <tr>
                  <th className="p-3">ธุรกิจ</th><th className="p-3">แผนโปรโมท</th><th className="p-3">เริ่ม</th>
                  <th className="p-3">สถานะ</th><th className="p-3">ระยะเวลาคงเหลือ</th><th className="p-3">QC</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} onClick={() => setSel(p.id)} className={`border-b border-ink-600/60 cursor-pointer hover:bg-ink-700/50 ${sel === p.id ? "bg-ink-700" : ""}`}>
                    <td className="p-3"><p className="font-semibold">{p.business_name}{purchases.some((x) => x.partner_id === p.id && x.status === "pending") && <span className="ml-2 text-[11px] text-gold-300">● สลิปรอตรวจ</span>}</p><p className="text-xs text-ink-300">{p.type}{venueKind(p.type) ? "" : " (ไม่แสดงหน้าสปา/โรงแรม)"} · {p.province}</p></td>
                    <td className="p-3 whitespace-nowrap">{PARTNER_PACKAGES[p.package]?.label ?? p.package}</td>
                    <td className="p-3 whitespace-nowrap">{fmt(p.starts_at)}</td>
                    <td className="p-3"><Pill tone={TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill></td>
                    <td className="p-3"><Remaining p={p} /></td>
                    <td className="p-3"><Pill tone={p.qc === "passed" ? "green" : p.qc === "failed" ? "red" : "muted"}>{QC_LABEL[p.qc]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        {cur && (
          <Detail key={cur.id} p={cur} purchases={purchases.filter((x) => x.partner_id === cur.id)} onClose={() => setSel(null)}
            onSaved={(r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)))}
            onPurchase={(x) => setPurchases((ps) => ps.map((y) => (y.id === x.id ? x : y)))} />
        )}
      </div>
    </>
  );
}

/** ค่าในฟอร์มจากแถวล่าสุด — ใช้ทั้งตอนเปิด และหลังอนุมัติสลิป/บันทึก (กันค่าเก่าทับวันเริ่ม/วันจบ/ยอดที่ระบบเพิ่งตั้ง) */
const formOf = (p: PartnerRow) => ({
  business_name: p.business_name, type: p.type, status: p.status, qc: p.qc, package: p.package, starts_at: p.starts_at?.slice(0, 10) ?? "",
  amount: String(p.amount || ""), notes: p.notes ?? "", account_status: (p.account_status ?? "pending") as AccountStatus,
  clip_status: (p.clip_status ?? "") as ClipStatus | "", clip_note: p.clip_note ?? "", platform_pct: p.platform_pct == null ? "" : String(p.platform_pct),
});
type Form = ReturnType<typeof formOf>;

function Detail({ p, purchases, onClose, onSaved, onPurchase }: { p: PartnerRow; purchases: Purchase[]; onClose: () => void; onSaved: (r: PartnerRow) => void; onPurchase: (x: Purchase) => void }) {
  const [f, setF] = useState<Form>(() => formOf(p));
  const [base, setBase] = useState<Form>(() => formOf(p));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<{ x: Purchase; action: "approve" | "reject" } | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const sync = (r: PartnerRow) => { onSaved(r); setF(formOf(r)); setBase(formOf(r)); };

  const decide = async (x: Purchase, action: "approve" | "reject") => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/partners/purchases/${x.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: Purchase; partner?: PartnerRow; error?: string };
      if (!out.ok || !out.row) return setMsg(`ไม่สำเร็จ ${out.error ?? ""}`);
      onPurchase(out.row);
      // รีเฟรชฟอร์มจากแถวใหม่ (วันเริ่ม/จบ/ยอด) — กดบันทึกต่อจะไม่ส่งค่าเก่าไปทับ
      if (out.partner) sync(out.partner);
      setMsg(action === "approve" ? (out.partner?.account_status === "active" ? "อนุมัติแล้ว ต่ออายุ + เปิดแสดงแล้ว" : "อนุมัติแล้ว ต่ออายุแล้ว · ร้านจะเปิดแสดงหลังผ่าน QC") : "ปฏิเสธสลิปแล้ว");
    } finally {
      setBusy(false);
      setAsk(null);
    }
  };

  const save = async () => {
    // ส่งเฉพาะช่องที่แก้จริง — ไม่ส่งแผน/วันเริ่ม/ยอดที่ไม่ได้แตะ
    const diff: Record<string, unknown> = {};
    for (const k of Object.keys(f) as (keyof Form)[]) if (f[k] !== base[k]) diff[k] = f[k];
    if ("starts_at" in diff || "package" in diff) { diff.starts_at = f.starts_at || null; if (f.package !== base.package) diff.package = f.package; }
    if ("amount" in diff) diff.amount = Number(f.amount || 0);
    if ("platform_pct" in diff) diff.platform_pct = f.platform_pct === "" ? null : Number(f.platform_pct);
    if ("clip_status" in diff) diff.clip_status = f.clip_status || null;
    if (!Object.keys(diff).length) return setMsg("ไม่มีอะไรเปลี่ยน");
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/partners/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(diff) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: PartnerRow; error?: string };
      if (out.ok && out.row) { sync(out.row); setMsg("บันทึกแล้ว"); }
      else setMsg(res.status === 401 ? "เซสชันหมดอายุ · เข้าสู่ระบบใหม่" : `บันทึกไม่สำเร็จ ${out.error ?? ""}`);
    } finally {
      setBusy(false);
    }
  };

  const resetLink = async () => {
    setBusy(true); setCopied(false);
    const res = await fetch(`/api/admin/partners/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_link" }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; link?: string; error?: string } | undefined;
    setBusy(false);
    if (out?.ok && out.link) setLink(out.link); else setMsg(`สร้างลิงก์ไม่สำเร็จ ${out?.error ?? ""}`);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } };

  const lab = "block text-xs text-ink-300 mb-1";
  const dirty = (Object.keys(f) as (keyof Form)[]).some((k) => f[k] !== base[k]);
  return (
    <Card className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-lg truncate">{p.business_name}</p>
          <p className="text-xs text-ink-300">{p.type} · {p.province}{venueKind(p.type) ? ` · แสดงในหน้า${venueKind(p.type)}` : ""}</p>
        </div>
        <button onClick={onClose} aria-label="ปิด" className="w-10 h-10 rounded-full border border-ink-600">×</button>
      </div>
      <dl className="mt-3 text-sm grid grid-cols-[88px_1fr] gap-y-1">
        <dt className="text-ink-300">ผู้ติดต่อ</dt><dd>{p.contact_name}</dd>
        <dt className="text-ink-300">โทร</dt><dd><a href={`tel:${p.tel}`} className="text-gold-300">{p.tel}</a></dd>
        <dt className="text-ink-300">อีเมล</dt><dd className="truncate"><a href={`mailto:${p.email}`} className="text-gold-300">{p.email}</a></dd>
        <dt className="text-ink-300">LINE</dt><dd>{p.line_id || "—"}</dd>
        <dt className="text-ink-300">ลิงก์</dt><dd className="break-all">{p.links || "—"}</dd>
        <dt className="text-ink-300">สมัครเมื่อ</dt><dd>{new Date(p.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</dd>
      </dl>
      {p.message && <p className="mt-3 text-sm rounded-xl bg-ink-700 p-3 whitespace-pre-wrap">{p.message}</p>}

      <div className="mt-4 rounded-xl bg-ink-700/60 p-3 text-sm">
        <div className="flex justify-between items-center gap-2"><span className="font-semibold">บัญชีพอร์ทัล</span><span className="text-xs text-ink-300">{p.has_login ? "ตั้งรหัสผ่านแล้ว" : "ยังไม่ตั้งรหัสผ่าน"}</span></div>
        <button type="button" disabled={busy} onClick={resetLink} className="chip h-10 w-full justify-center mt-2">ส่งลิงก์ตั้งรหัสผ่านใหม่</button>
        {link && (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="text-xs text-ink-300">ลิงก์ใช้ได้ 7 วัน ครั้งเดียว — ส่งให้พาร์ทเนอร์ทาง LINE/อีเมล</span>
            <span className="select-all break-all text-xs text-gold-300 rounded-lg bg-ink-900 p-2">{link}</span>
            <button type="button" onClick={copy} className="chip chip-red h-10 justify-center">{copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}</button>
          </div>
        )}
      </div>

      <QcBox p={p} onSaved={sync} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={lab}>ชื่อธุรกิจ</label>
          <input className="input-dark w-full" value={f.business_name} onChange={(e) => set("business_name", e.target.value)} maxLength={120} />
        </div>
        <div className="col-span-2">
          <label className={lab}>ประเภทธุรกิจ (สปาทุกแบบแสดงในหน้าสปา)</label>
          <select className="input-dark w-full" value={f.type} onChange={(e) => set("type", e.target.value)}>
            {!LISTING_TYPES.includes(f.type) && <option value={f.type}>{f.type} (เดิม)</option>}
            {LISTING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>สถานะ</label>
          <select className="input-dark w-full" value={f.status} onChange={(e) => set("status", e.target.value as PartnerStatus)}>
            {PARTNER_STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>QC</label>
          <select className="input-dark w-full" value={f.qc} onChange={(e) => set("qc", e.target.value as PartnerQc)}>
            {QC_STATES.map((x) => <option key={x} value={x}>{QC_LABEL[x]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>แผนโปรโมท</label>
          <select className="input-dark w-full" value={f.package} onChange={(e) => set("package", e.target.value as PartnerPackageKey)}>
            {PACKAGE_KEYS.map((k) => <option key={k} value={k}>{PARTNER_PACKAGES[k].label}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>วันเริ่ม</label>
          <input type="date" className="input-dark w-full" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={lab}>ยอดที่ชำระแล้ว (บาท) {PARTNER_PACKAGES[f.package].price != null && <span>· ราคาแผนโปรโมท ฿{baht(PARTNER_PACKAGES[f.package].price!)}</span>}</label>
          <input type="number" min={0} inputMode="numeric" className="input-dark w-full" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
        </div>
        <p className="col-span-2 text-xs text-ink-300">สิ้นสุด: {fmt(p.ends_at)} (คำนวณอัตโนมัติจากวันเริ่ม + แผนโปรโมท เมื่อแก้วันเริ่ม/แผน)</p>
        <div>
          <label className={lab}>บัญชีพอร์ทัล</label>
          <select className="input-dark w-full" value={f.account_status} onChange={(e) => set("account_status", e.target.value as AccountStatus)}>
            {ACCOUNT_STATUSES.map((x) => <option key={x} value={x}>{ACCOUNT_LABEL[x]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>% หักแพลตฟอร์ม (ค่าห้อง)</label>
          <input type="number" min={0} max={100} step="0.5" placeholder="ยังไม่ตั้ง" className="input-dark w-full" value={f.platform_pct} onChange={(e) => set("platform_pct", e.target.value)} />
        </div>
        <div>
          <label className={lab}>คลิปโปรโมท</label>
          <select className="input-dark w-full" value={f.clip_status} onChange={(e) => set("clip_status", e.target.value as ClipStatus | "")}>
            <option value="">ยังไม่เริ่ม</option>
            {CLIP_STATUSES.map((x) => <option key={x} value={x}>{CLIP_LABEL[x]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>หมายเหตุคลิป</label>
          <input className="input-dark w-full" value={f.clip_note} onChange={(e) => set("clip_note", e.target.value)} placeholder="เช่น ถ่ายที่ร้าน 20 ก.ย." />
        </div>
        <div className="col-span-2">
          <label className={lab}>โน้ต</label>
          <textarea rows={3} className="input-dark w-full" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={busy || !dirty} className="mt-4 w-full btn-crimson h-11 rounded-xl font-semibold disabled:opacity-60">{busy ? "กำลังบันทึก…" : dirty ? "บันทึก" : "ไม่มีการแก้ไข"}</button>
      {msg && <p role="status" className="mt-2 text-xs text-ink-300">{msg}</p>}

      <div className="mt-5 border-t border-ink-600 pt-4">
        <p className="font-semibold text-sm">การชำระค่าแผนโปรโมท</p>
        {purchases.length === 0 ? <p className="text-xs text-ink-300 mt-2">ยังไม่มีรายการ</p> : (
          <ul className="mt-2 space-y-2">
            {purchases.map((x) => (
              <li key={x.id} className="rounded-xl bg-ink-700/60 p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{x.invoice_no}</span>
                  <Pill tone={x.status === "paid" ? "green" : x.status === "rejected" ? "red" : "gold"}>{PURCHASE_LABEL[x.status]}</Pill>
                </div>
                <p className="text-xs text-ink-300 mt-1">{PARTNER_PACKAGES[x.package]?.label} · ฿{baht(x.amount)} · {new Date(x.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
                {x.starts_at && <p className="text-xs text-ink-300">ช่วง {fmt(x.starts_at)} – {fmt(x.ends_at)}</p>}
                {x.slip_url && <a href={fileUrl(x.slip_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-300 underline">ดูสลิป</a>}
                {x.status === "pending" && (ask?.x.id === x.id ? (
                  <div role="alertdialog" aria-label="ยืนยันรายการ" className="mt-2 rounded-xl border border-gold-500/40 p-2.5">
                    <p className="text-xs">{ask.action === "approve" ? `อนุมัติสลิป ${x.invoice_no} ฿${baht(x.amount)} และต่ออายุแผนโปรโมท? (ร้านเปิดแสดงเมื่อผ่าน QC แล้วเท่านั้น)` : `ปฏิเสธสลิป ${x.invoice_no}? พาร์ทเนอร์ต้องส่งสลิปใหม่`}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button disabled={busy} onClick={() => setAsk(null)} className="chip h-10 justify-center">ยกเลิก</button>
                      <button disabled={busy} onClick={() => decide(x, ask.action)} className="chip chip-red h-10 justify-center">{busy ? "กำลังทำ…" : ask.action === "approve" ? "ยืนยันอนุมัติ" : "ยืนยันปฏิเสธ"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button disabled={busy} onClick={() => setAsk({ x, action: "reject" })} className="chip h-10 justify-center">ปฏิเสธ</button>
                    <button disabled={busy} onClick={() => setAsk({ x, action: "approve" })} className="chip chip-red h-10 justify-center">อนุมัติ + ต่ออายุ</button>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/** นัด QC สถานที่ที่พาร์ทเนอร์จองจาก /partner/qc + เอกสาร + ปุ่มผ่าน/ไม่ผ่าน (migration 0005_qc) */
function QcBox({ p, onSaved }: { p: PartnerRow; onSaved: (r: PartnerRow) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState<QcStatus | null>(null);
  const mark = async (qc_status: QcStatus) => {
    setAsk(null);
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/partners/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qc_status }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: PartnerRow; error?: string };
      if (out.ok && out.row) { onSaved(out.row); setMsg(qc_status === "passed" ? "บันทึก: ผ่าน QC" : "บันทึก: ไม่ผ่าน QC"); }
      else setMsg(`บันทึกไม่สำเร็จ ${out.error ?? ""}`);
    } finally {
      setBusy(false);
    }
  };
  const st = p.qc_status;
  return (
    <div className="mt-4 rounded-xl bg-ink-700/60 p-3 text-sm">
      <div className="flex justify-between gap-2 items-center">
        <span className="font-semibold">นัด QC สถานที่</span>
        <Pill tone={st === "passed" ? "green" : st === "failed" ? "red" : st === "booked" ? "gold" : "muted"}>{st === "passed" ? "ผ่าน" : st === "failed" ? "ไม่ผ่าน" : st === "booked" ? "นัดแล้ว" : "ยังไม่นัด"}</Pill>
      </div>
      <p className="text-xs text-ink-300 mt-1">{p.qc_slot ? `วัน-เวลา ${qcSlotLabel(p.qc_slot)} (${new Date(p.qc_slot).toLocaleDateString("th-TH", { weekday: "short", year: "2-digit", month: "short", day: "numeric", timeZone: "Asia/Bangkok" })})` : "พาร์ทเนอร์ยังไม่เลือกวันนัด"}</p>
      <ul className="mt-2 space-y-1 text-xs">
        {QC_DOC_DEFS.map((d) => {
          const list = p.qc_docs?.[d.key] ?? [];
          return (
            <li key={d.key} className="flex flex-wrap gap-x-2">
              <span className="text-ink-300">{d.label}:</span>
              {list.length ? list.map((path, i) => <a key={path} href={fileUrl(path)} target="_blank" rel="noopener noreferrer" className="text-gold-300 underline">ไฟล์ {i + 1}</a>) : <span className="text-ink-300">—</span>}
            </li>
          );
        })}
      </ul>
      {ask ? (
        <div role="alertdialog" aria-label="ยืนยันผล QC" className="mt-2 rounded-xl border border-gold-500/40 p-2.5">
          <p className="text-xs">{ask === "passed" ? "ยืนยันผ่าน QC? ถ้าชำระแผนโปรโมทแล้ว ร้านจะเปิดแสดงต่อลูกค้าทันที" : "ยืนยันไม่ผ่าน QC? ร้านจะไม่แสดงต่อลูกค้า"}</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button disabled={busy} onClick={() => setAsk(null)} className="chip h-10 justify-center">ยกเลิก</button>
            <button disabled={busy} onClick={() => mark(ask)} className="chip chip-red h-10 justify-center">ยืนยัน</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button disabled={busy} onClick={() => setAsk("failed")} className="chip h-10 justify-center">ไม่ผ่าน QC</button>
          <button disabled={busy} onClick={() => setAsk("passed")} className="chip chip-red h-10 justify-center">ผ่าน QC</button>
        </div>
      )}
      {msg && <p className="mt-1 text-xs text-ink-300">{msg}</p>}
    </div>
  );
}
