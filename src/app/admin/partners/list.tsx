"use client";

import { useMemo, useState } from "react";
import { Card, Pill } from "../admin-nav";
import { PACKAGE_KEYS, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";
import { ACCOUNT_LABEL, ACCOUNT_STATUSES, CLIP_LABEL, CLIP_STATUSES, PURCHASE_LABEL, fileUrl, type AccountStatus, type ClipStatus, type Purchase } from "@/lib/partner/portal-types";
import { PARTNER_STATUSES, QC_LABEL, QC_STATES, STATUS_LABEL, daysLeft, QC_DOC_DEFS, qcSlotLabel, type PartnerQc, type PartnerStatus, type QcDocs, type QcStatus } from "@/lib/partner/status";

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
const fmt = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "—");

function Remaining({ p }: { p: PartnerRow }) {
  const left = daysLeft(p.ends_at);
  if (left == null || !p.starts_at || !p.ends_at) return <span className="text-ink-300 text-xs">—</span>;
  const total = Math.max(1, (Date.parse(p.ends_at) - Date.parse(p.starts_at)) / 86_400_000);
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

  const shown = tab === "all" ? rows : rows.filter((r) => r.status === tab);
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
                    <td className="p-3"><p className="font-semibold">{p.business_name}{purchases.some((x) => x.partner_id === p.id && x.status === "pending") && <span className="ml-2 text-[11px] text-gold-300">● สลิปรอตรวจ</span>}</p><p className="text-xs text-ink-300">{p.type} · {p.province}</p></td>
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

function Detail({ p, purchases, onClose, onSaved, onPurchase }: { p: PartnerRow; purchases: Purchase[]; onClose: () => void; onSaved: (r: PartnerRow) => void; onPurchase: (x: Purchase) => void }) {
  const [account, setAccount] = useState<AccountStatus>(p.account_status ?? "pending");
  const [clip, setClip] = useState<ClipStatus | "">(p.clip_status ?? "");
  const [clipNote, setClipNote] = useState(p.clip_note ?? "");
  const [pct, setPct] = useState(p.platform_pct == null ? "" : String(p.platform_pct));
  const decide = async (x: Purchase, action: "approve" | "reject") => {
    if (action === "approve" && !confirm(`อนุมัติสลิป ${x.invoice_no} ฿${baht(x.amount)} และต่ออายุแผนโปรโมท?`)) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/partners/purchases/${x.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: Purchase; partner?: PartnerRow; error?: string };
      if (!out.ok || !out.row) return setMsg(`ไม่สำเร็จ ${out.error ?? ""}`);
      onPurchase(out.row);
      if (out.partner) onSaved(out.partner);
      setMsg(action === "approve" ? "อนุมัติแล้ว ต่ออายุแผนโปรโมทให้แล้ว" : "ปฏิเสธสลิปแล้ว");
    } finally {
      setBusy(false);
    }
  };
  const [status, setStatus] = useState(p.status);
  const [qc, setQc] = useState(p.qc);
  const [pkg, setPkg] = useState(p.package);
  const [start, setStart] = useState(p.starts_at?.slice(0, 10) ?? "");
  const [amount, setAmount] = useState(String(p.amount || ""));
  const [notes, setNotes] = useState(p.notes ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/partners/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, qc, package: pkg, starts_at: start || null, amount: Number(amount || 0), notes, account_status: account, clip_status: clip || null, clip_note: clipNote, platform_pct: pct === "" ? null : Number(pct) }),
      });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: PartnerRow; error?: string };
      if (out.ok && out.row) { onSaved(out.row); setMsg("บันทึกแล้ว"); }
      else setMsg(`บันทึกไม่สำเร็จ ${out.error ?? ""}`);
    } finally {
      setBusy(false);
    }
  };

  const lab = "block text-xs text-ink-300 mb-1";
  return (
    <Card className="w-full lg:w-[360px] shrink-0 lg:sticky lg:top-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-lg truncate">{p.business_name}</p>
          <p className="text-xs text-ink-300">{p.type} · {p.province}</p>
        </div>
        <button onClick={onClose} aria-label="ปิด" className="w-8 h-8 rounded-full border border-ink-600">×</button>
      </div>
      <dl className="mt-3 text-sm grid grid-cols-[88px_1fr] gap-y-1">
        <dt className="text-ink-300">ผู้ติดต่อ</dt><dd>{p.contact_name}</dd>
        <dt className="text-ink-300">โทร</dt><dd><a href={`tel:${p.tel}`} className="text-gold-300">{p.tel}</a></dd>
        <dt className="text-ink-300">อีเมล</dt><dd className="truncate"><a href={`mailto:${p.email}`} className="text-gold-300">{p.email}</a></dd>
        <dt className="text-ink-300">LINE</dt><dd>{p.line_id || "—"}</dd>
        <dt className="text-ink-300">ลิงก์</dt><dd className="break-all">{p.links || "—"}</dd>
        <dt className="text-ink-300">สมัครเมื่อ</dt><dd>{new Date(p.created_at).toLocaleString("th-TH")}</dd>
      </dl>
      {p.message && <p className="mt-3 text-sm rounded-xl bg-ink-700 p-3 whitespace-pre-wrap">{p.message}</p>}

      <QcBox p={p} onSaved={(r) => { onSaved(r); setQc(r.qc); }} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className={lab}>สถานะ</label>
          <select className="input-dark w-full" value={status} onChange={(e) => setStatus(e.target.value as PartnerStatus)}>
            {PARTNER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>QC</label>
          <select className="input-dark w-full" value={qc} onChange={(e) => setQc(e.target.value as PartnerQc)}>
            {QC_STATES.map((s) => <option key={s} value={s}>{QC_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>แผนโปรโมท</label>
          <select className="input-dark w-full" value={pkg} onChange={(e) => setPkg(e.target.value as PartnerPackageKey)}>
            {PACKAGE_KEYS.map((k) => <option key={k} value={k}>{PARTNER_PACKAGES[k].label}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>วันเริ่ม</label>
          <input type="date" className="input-dark w-full" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={lab}>ยอดที่ชำระแล้ว (บาท) {PARTNER_PACKAGES[pkg].price != null && <span>· ราคาแผนโปรโมท ฿{baht(PARTNER_PACKAGES[pkg].price!)}</span>}</label>
          <input type="number" min={0} inputMode="numeric" className="input-dark w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <p className="col-span-2 text-xs text-ink-300">สิ้นสุด: {fmt(p.ends_at)} (คำนวณอัตโนมัติจากวันเริ่ม + แผนโปรโมทเมื่อบันทึก)</p>
        <div>
          <label className={lab}>บัญชีพอร์ทัล {p.has_login ? "" : "(ยังไม่ตั้งรหัส)"}</label>
          <select className="input-dark w-full" value={account} onChange={(e) => setAccount(e.target.value as AccountStatus)}>
            {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{ACCOUNT_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>% หักแพลตฟอร์ม</label>
          <input type="number" min={0} max={100} step="0.5" placeholder="[รอกำหนด]" className="input-dark w-full" value={pct} onChange={(e) => setPct(e.target.value)} />
        </div>
        <div>
          <label className={lab}>คลิปโปรโมท</label>
          <select className="input-dark w-full" value={clip} onChange={(e) => setClip(e.target.value as ClipStatus | "")}>
            <option value="">ยังไม่เริ่ม</option>
            {CLIP_STATUSES.map((s) => <option key={s} value={s}>{CLIP_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>หมายเหตุคลิป</label>
          <input className="input-dark w-full" value={clipNote} onChange={(e) => setClipNote(e.target.value)} placeholder="เช่น ถ่ายที่ร้าน 20 ก.ย." />
        </div>
        <div className="col-span-2">
          <label className={lab}>โน้ต</label>
          <textarea rows={3} className="input-dark w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={busy} className="mt-4 w-full btn-crimson h-11 rounded-xl font-semibold disabled:opacity-60">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
      {msg && <p className="mt-2 text-xs text-ink-300">{msg}</p>}

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
                <p className="text-xs text-ink-300 mt-1">{PARTNER_PACKAGES[x.package]?.label} · ฿{baht(x.amount)} · {new Date(x.created_at).toLocaleString("th-TH")}</p>
                {x.starts_at && <p className="text-xs text-ink-300">ช่วง {fmt(x.starts_at)} – {fmt(x.ends_at)}</p>}
                {x.slip_url && <a href={fileUrl(x.slip_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-300 underline">ดูสลิป</a>}
                {x.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button disabled={busy} onClick={() => decide(x, "reject")} className="chip h-9 justify-center">ปฏิเสธ</button>
                    <button disabled={busy} onClick={() => decide(x, "approve")} className="chip chip-red h-9 justify-center">อนุมัติ + ต่ออายุ</button>
                  </div>
                )}
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
  const mark = async (qc_status: QcStatus) => {
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
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button disabled={busy} onClick={() => mark("failed")} className="chip h-9 justify-center">ไม่ผ่าน QC</button>
        <button disabled={busy} onClick={() => mark("passed")} className="chip chip-red h-9 justify-center">ผ่าน QC</button>
      </div>
      {msg && <p className="mt-1 text-xs text-ink-300">{msg}</p>}
    </div>
  );
}
