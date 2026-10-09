"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PACKAGES } from "@/lib/join/config";
import type { Applicant, ApplicantStatus } from "@/lib/join/store";
import type { SlipVerdict } from "@/lib/slip2go";

type Tab = "all" | "ok" | "bad" | "none";
const TABS: [Tab, string, string][] = [
  ["all", "สลิปทั้งหมด", "text-ink-100"],
  ["ok", "ตรงยอด · รอยืนยัน", "text-emerald-300"],
  ["bad", "มีปัญหา", "text-crimson-300"],
  ["none", "ไม่ได้ตรวจ / ขัดข้อง", "text-gold-300"],
];
const VERDICT: Record<SlipVerdict | "none", [string, string]> = {
  ok: ["✓ ตรงยอด", "border-emerald-500/60 text-emerald-300"],
  acct: ["โอนเข้าบัญชีอื่น", "border-crimson-500 text-crimson-300"],
  amt: ["ยอดไม่ตรง", "border-crimson-500 text-crimson-300"],
  dup: ["สลิปซ้ำ", "border-crimson-500 text-crimson-300"],
  fake: ["ไม่พบรายการ", "border-crimson-500 text-crimson-300"],
  error: ["ตรวจไม่สำเร็จ", "border-gold-500 text-gold-300"],
  none: ["ไม่ได้ตรวจ", "border-ink-500 text-ink-300"],
};
const STATUS: Record<ApplicantStatus, [string, string]> = {
  pending_slip: ["รอแอดมิน", "text-gold-300"],
  verified: ["✓ ยืนยันแล้ว", "text-emerald-300"],
  rejected: ["ปฏิเสธแล้ว", "text-crimson-300"],
  refunded: ["คืนเงินแล้ว", "text-ink-300"],
};
const WARN: Partial<Record<SlipVerdict, string>> = {
  acct: "บัญชีผู้รับในสลิปไม่ใช่บัญชีของร้าน — อย่ายืนยันจนกว่าจะตรวจกับบัญชีธนาคารจริง",
  amt: "ยอดโอนไม่ตรงกับยอดที่ต้องชำระ — ติดต่อผู้สมัครให้โอนส่วนที่ขาด หรือปฏิเสธแล้วให้ส่งใหม่",
  dup: "สลิปนี้เคยถูกใช้แล้ว — ห้ามยืนยัน",
  fake: "Slip2Go ไม่พบรายการโอนนี้ในระบบธนาคาร — ห้ามยืนยันจนกว่าจะเช็กยอดเข้าบัญชีด้วยตัวเอง",
  error: "ระบบตรวจขัดข้องตอนส่งใบสมัคร — เช็กยอดเข้าบัญชีด้วยตัวเองก่อนยืนยัน",
};

const verdictOf = (r: Applicant): SlipVerdict | "none" => r.slip_check?.verdict ?? "none";
const tabOf = (r: Applicant): Tab => {
  const v = verdictOf(r);
  return v === "ok" ? "ok" : v === "none" || v === "error" ? "none" : "bad";
};
const baht = (n: number | null | undefined) => (n == null ? "-" : `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`);
const thTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "-");
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;

export function SlipQueue({ initial }: { initial: Applicant[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(initial.find((r) => r.status === "pending_slip")?.id ?? initial[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const shown = useMemo(() => rows.filter((r) => tab === "all" || tabOf(r) === tab), [rows, tab]);
  const count = (t: Tab) => rows.filter((r) => t === "all" || tabOf(r) === t).length;
  const sel = rows.find((r) => r.id === open) ?? null;

  const setStatus = async (id: string, status: ApplicantStatus) => {
    setBusy(true);
    const res = await fetch(`/api/admin/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = (await res.json().catch(() => ({}))) as { row?: Applicant };
    setBusy(false);
    if (data.row) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: data.row!.status } : x)));
      setMsg(status === "verified" ? "ยืนยันรับเงินแล้ว" : "ปฏิเสธสลิปแล้ว — แจ้งผู้สมัครให้ส่งสลิปใหม่");
      router.refresh();
    } else setMsg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS.map(([k, label, tone]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={`rounded-2xl border border-ink-600 bg-ink-800 p-4 text-left transition ${tab === k ? "border-gold-400 shadow-[0_0_0_3px_rgba(240,200,90,.15)]" : ""}`}>
            <p className="text-xs text-ink-300">{label}</p>
            <p className={`font-display text-2xl font-semibold mt-1 ${tone}`}>{count(k)}</p>
          </button>
        ))}
      </div>

      {msg && <p role="status" className="mt-3 rounded-xl border border-gold-500/50 px-4 py-2 text-sm text-gold-200">{msg}</p>}

      <div className="mt-4 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="rounded-2xl border border-ink-600 bg-ink-800 p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs text-ink-300 bg-ink-900">
              <tr>{["รหัส MB", "ผู้สมัคร · เวลาส่ง", "แพ็กเกจ", "ยอดที่ต้องชำระ", "Slip2Go", "สถานะ"].map((h) => <th key={h} className="text-left font-normal px-4 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const v = VERDICT[verdictOf(r)];
                return (
                  <tr key={r.id} onClick={() => setOpen(r.id)} className={`border-t border-ink-600 cursor-pointer ${open === r.id ? "bg-gold-500/10" : "hover:bg-ink-800"}`}>
                    <td className="px-4 py-3 text-gold-300 font-display">{r.mb_code}</td>
                    <td className="px-4 py-3"><p>{r.first_name} {r.last_name}</p><p className="text-xs text-ink-300">{thTime(r.created_at)}</p></td>
                    <td className="px-4 py-3 text-ink-200">{r.package}</td>
                    <td className="px-4 py-3 tabular-nums">{baht(r.amount)}</td>
                    <td className="px-4 py-3"><span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${v[1]}`}>{v[0]}</span></td>
                    <td className={`px-4 py-3 text-xs ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</td>
                  </tr>
                );
              })}
              {!shown.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-300">ยังไม่มีสลิปในหมวดนี้</td></tr>}
            </tbody>
          </table>
        </div>

        {sel ? (
          <aside className="rounded-2xl border border-ink-600 bg-ink-800 p-4 flex flex-col gap-3 lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold truncate">{sel.first_name} {sel.last_name} ({sel.nickname})</p><p className="text-xs text-gold-300">{sel.mb_code} · แพ็กเกจ {sel.package} · {PACKAGES[sel.package].name}</p></div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${VERDICT[verdictOf(sel)][1]}`}>{VERDICT[verdictOf(sel)][0]}</span>
            </div>
            <a href={file(sel.docs.slip!)} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file(sel.docs.slip!)} alt={`สลิปของ ${sel.mb_code}`} className="w-full max-h-80 object-contain rounded-xl bg-ink-800" />
            </a>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-300">ยอดโอน</dt><dd className={`tabular-nums font-semibold ${verdictOf(sel) === "amt" ? "text-crimson-300" : ""}`}>{baht(sel.slip_check?.amount)}</dd>
              <dt className="text-ink-300">ยอดที่ต้องชำระ</dt><dd className="tabular-nums text-gold-300">{baht(sel.amount)}</dd>
              <dt className="text-ink-300">ผู้โอน</dt><dd className="break-words min-w-0">{sel.slip_check?.sender ?? "-"}</dd>
              <dt className="text-ink-300">บัญชีผู้รับ</dt><dd className={`break-words min-w-0 ${verdictOf(sel) === "acct" ? "text-crimson-300" : ""}`}>{sel.slip_check?.receiver ?? "-"}</dd>
              <dt className="text-ink-300">เวลาโอน</dt><dd>{thTime(sel.slip_check?.date_time)}</dd>
              <dt className="text-ink-300">Trans Ref</dt><dd className="break-all min-w-0 text-xs">{sel.slip_check?.trans_ref ?? "-"}</dd>
              <dt className="text-ink-300">โทร</dt><dd>{sel.tel}</dd>
            </dl>
            {sel.slip_check && WARN[sel.slip_check.verdict] && (
              <p role="alert" className="rounded-xl border border-crimson-500/70 bg-crimson-500/10 px-3 py-2 text-xs leading-relaxed">
                {WARN[sel.slip_check.verdict]}{sel.slip_check.message ? ` (${sel.slip_check.message})` : ""}
              </p>
            )}
            {!sel.slip_check && <p className="rounded-xl border border-ink-500 px-3 py-2 text-xs text-ink-300">ใบสมัครนี้ส่งก่อนเปิดตรวจอัตโนมัติ — เช็กยอดเข้าบัญชีด้วยตัวเอง</p>}
            {sel.status === "pending_slip" ? (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button disabled={busy} onClick={() => setStatus(sel.id, "rejected")} className="btn-ghost h-11 text-sm">ปฏิเสธ · แจ้งส่งใหม่</button>
                <button disabled={busy} onClick={() => setStatus(sel.id, "verified")} className="btn-crimson h-11 text-sm font-semibold">ยืนยันรับเงิน</button>
              </div>
            ) : (
              <p className={`text-sm text-center ${STATUS[sel.status][1]}`}>{STATUS[sel.status][0]}</p>
            )}
          </aside>
        ) : (
          <aside className="rounded-2xl border border-ink-600 bg-ink-800 p-6 text-center text-sm text-ink-300">เลือกสลิปในตารางเพื่อดูรายละเอียด</aside>
        )}
      </div>
    </>
  );
}
