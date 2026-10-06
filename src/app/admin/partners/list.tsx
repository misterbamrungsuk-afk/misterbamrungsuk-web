"use client";

import { useMemo, useState } from "react";
import { Card, Pill } from "../admin-nav";
import { PACKAGE_KEYS, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";
import { PARTNER_STATUSES, QC_LABEL, QC_STATES, STATUS_LABEL, daysLeft, type PartnerQc, type PartnerStatus } from "@/lib/partner/status";

// ชนิดฝั่ง client (ตรงกับ Partner ใน store.ts — store เป็น server-only)
export type PartnerRow = {
  id: string; business_name: string; type: string; province: string; contact_name: string; tel: string; email: string;
  line_id: string; links: string; package: PartnerPackageKey; message: string; status: PartnerStatus; qc: PartnerQc;
  starts_at: string | null; ends_at: string | null; amount: number; notes: string | null; created_at: string;
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

export function PartnerList({ initial }: { initial: PartnerRow[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<PartnerStatus | "all">("all");
  const [sel, setSel] = useState<string | null>(null);

  const kpi = useMemo(() => {
    const soon = rows.filter((r) => r.status === "active" && (daysLeft(r.ends_at) ?? 999) <= 30).length;
    return [
      ["พาร์ทเนอร์ทั้งหมด", String(rows.length)],
      ["กำลังโปรโมท", String(rows.filter((r) => r.status === "active").length)],
      ["รอทำสัญญา / QC", String(rows.filter((r) => r.status === "qc" || r.status === "contacted").length)],
      ["ใกล้หมดอายุ ≤30 วัน", String(soon)],
      ["รายได้รวม", `฿${baht(rows.reduce((s, r) => s + (r.amount || 0), 0))}`],
    ];
  }, [rows]);

  const shown = tab === "all" ? rows : rows.filter((r) => r.status === tab);
  const cur = rows.find((r) => r.id === sel) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
                  <th className="p-3">ธุรกิจ</th><th className="p-3">แพ็กเกจ</th><th className="p-3">เริ่ม</th>
                  <th className="p-3">สถานะ</th><th className="p-3">ระยะเวลาคงเหลือ</th><th className="p-3">QC</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} onClick={() => setSel(p.id)} className={`border-b border-ink-600/60 cursor-pointer hover:bg-ink-700/50 ${sel === p.id ? "bg-ink-700" : ""}`}>
                    <td className="p-3"><p className="font-semibold">{p.business_name}</p><p className="text-xs text-ink-300">{p.type} · {p.province}</p></td>
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
        {cur && <Detail key={cur.id} p={cur} onClose={() => setSel(null)} onSaved={(r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)))} />}
      </div>
    </>
  );
}

function Detail({ p, onClose, onSaved }: { p: PartnerRow; onClose: () => void; onSaved: (r: PartnerRow) => void }) {
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
        body: JSON.stringify({ status, qc, package: pkg, starts_at: start || null, amount: Number(amount || 0), notes }),
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
          <label className={lab}>แพ็กเกจ</label>
          <select className="input-dark w-full" value={pkg} onChange={(e) => setPkg(e.target.value as PartnerPackageKey)}>
            {PACKAGE_KEYS.map((k) => <option key={k} value={k}>{PARTNER_PACKAGES[k].label}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>วันเริ่ม</label>
          <input type="date" className="input-dark w-full" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={lab}>ยอดที่ชำระแล้ว (บาท) {PARTNER_PACKAGES[pkg].price != null && <span>· ราคาแพ็กเกจ ฿{baht(PARTNER_PACKAGES[pkg].price!)}</span>}</label>
          <input type="number" min={0} inputMode="numeric" className="input-dark w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <p className="col-span-2 text-xs text-ink-300">สิ้นสุด: {fmt(p.ends_at)} (คำนวณอัตโนมัติจากวันเริ่ม + แพ็กเกจเมื่อบันทึก)</p>
        <div className="col-span-2">
          <label className={lab}>โน้ต</label>
          <textarea rows={3} className="input-dark w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={busy} className="mt-4 w-full btn-crimson h-11 rounded-xl font-semibold disabled:opacity-60">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
      {msg && <p className="mt-2 text-xs text-ink-300">{msg}</p>}
    </Card>
  );
}
