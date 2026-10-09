"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Applicant, ApplicantStatus } from "@/lib/join/store";
import type { SlipVerdict } from "@/lib/slip2go";

// ตามบอร์ด AdminSlips.dc.html (1280px)
const GOLD = "#f0c75a";
type Tab = "all" | "ok" | "bad" | "none";
const TABS: [Tab, string, string][] = [
  ["all", "สลิปทั้งหมด", "#ffd76a"],
  ["ok", "ตรงยอด · รอยืนยัน", "#4ade80"],
  ["bad", "มีปัญหา (ยอด/บัญชี/ซ้ำ/ปลอม)", "#fca5a5"],
  ["none", "ไม่ได้ตรวจ / ขัดข้อง", "#cdbfb3"],
];
// [label, bg, fg]
const VERDICT: Record<SlipVerdict | "none", [string, string, string]> = {
  ok: ["✓ ตรงยอด · ของจริง", "rgba(74,222,128,.15)", "#bbf7d0"],
  amt: ["ยอดไม่ตรง", "rgba(251,146,60,.18)", "#fed7aa"],
  acct: ["โอนเข้าบัญชีอื่น", "rgba(239,68,68,.2)", "#fecaca"],
  dup: ["สลิปซ้ำ", "rgba(239,68,68,.2)", "#fecaca"],
  fake: ["ไม่พบรายการ / ปลอม", "rgba(239,68,68,.2)", "#fecaca"],
  error: ["ตรวจไม่สำเร็จ", "#21191a", "#eed58a"],
  none: ["ไม่ได้ตรวจ", "#21191a", "#cdbfb3"],
};
const WARN: Partial<Record<SlipVerdict | "none", string>> = {
  acct: "บัญชีผู้รับในสลิปไม่ใช่บัญชีของร้าน · อย่ายืนยันจนกว่าจะตรวจกับบัญชีธนาคารจริง",
  dup: "เลขอ้างอิงนี้เคยถูกใช้แล้ว · อาจเป็นสลิปซ้ำ ห้ามยืนยัน",
  fake: "Slip2Go ไม่พบรายการโอนนี้ในระบบธนาคาร · ห้ามยืนยัน",
  error: "ระบบตรวจขัดข้องตอนส่งใบสมัคร · เช็กยอดเข้าบัญชีด้วยตัวเองก่อนยืนยัน",
  none: "ใบสมัครนี้ส่งก่อนเปิดตรวจอัตโนมัติ · เช็กยอดเข้าบัญชีด้วยตัวเอง",
};

const verdictOf = (r: Applicant): SlipVerdict | "none" => r.slip_check?.verdict ?? "none";
const tabOf = (r: Applicant): Tab => { const v = verdictOf(r); return v === "ok" ? "ok" : v === "none" || v === "error" ? "none" : "bad"; };
const statusOf = (r: Applicant): [string, string] =>
  r.status === "verified" ? ["✓ ยืนยันแล้ว", "#4ade80"] : r.status === "rejected" ? ["ปฏิเสธแล้ว", "#fca5a5"] : r.status === "refunded" ? ["คืนเงินแล้ว", "#cdbfb3"]
    : verdictOf(r) === "ok" ? ["รอแอดมินกดยืนยัน", "#eed58a"] : ["ต้องตรวจเอง", "#fed7aa"];
const fmt = (n: number | null | undefined) => (n == null ? "—" : "฿" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }));
const thTime = (iso: string | null | undefined, timeOnly = false) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", ...(timeOnly ? { hour: "2-digit", minute: "2-digit" } : { dateStyle: "medium", timeStyle: "short" }) }) : "—");
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const GRID = "grid grid-cols-[110px_minmax(0,1.3fr)_90px_100px_130px_120px]";
const Pill = ({ v }: { v: SlipVerdict | "none" }) => <span className="inline-block px-[9px] py-[3px] rounded-full text-[11.5px]" style={{ background: VERDICT[v][1], color: VERDICT[v][2] }}>{VERDICT[v][0]}</span>;

export function SlipQueue({ initial, live }: { initial: Applicant[]; live: boolean }) {
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
      setMsg(status === "verified" ? "ยืนยันรับเงินแล้ว" : "ปฏิเสธสลิปแล้ว · แจ้งผู้สมัครให้ส่งสลิปใหม่");
      router.refresh();
    } else setMsg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    setTimeout(() => setMsg(""), 2500);
  };

  const v = sel ? verdictOf(sel) : "none";
  const warn = sel ? (v === "amt" ? `ยอดโอน ${fmt(sel.slip_check?.amount)} ไม่ตรงกับยอดที่ต้องชำระ ${fmt(sel.amount)} · แจ้งผู้สมัครโอนส่วนที่ขาด` : WARN[v]) : undefined;
  const checks: [string, string, string][] = sel ? [
    ["ยอดโอน", fmt(sel.slip_check?.amount), v === "ok" ? "#bbf7d0" : v === "amt" ? "#fed7aa" : "#f6efe4"],
    ["ยอดที่ต้องชำระ", fmt(sel.amount), "#f6efe4"],
    ["ชื่อผู้โอน", sel.slip_check?.sender ?? "—", "#f6efe4"],
    ["บัญชีผู้รับ", sel.slip_check?.receiver ?? "—", v === "acct" ? "#fecaca" : "#f6efe4"],
    ["เวลาโอน", thTime(sel.slip_check?.date_time), "#f6efe4"],
    ["เลขอ้างอิง (Trans Ref)", sel.slip_check?.trans_ref ?? "—", v === "dup" ? "#fecaca" : "#f6efe4"],
    ["โทร", sel.tel, "#f6efe4"],
  ] : [];

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 w-full flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-3 justify-between items-end">
          <div>
            <div className="text-[11px] tracking-[2.5px] text-[#f0c75a] font-semibold">SLIP VERIFICATION · SLIP2GO</div>
            <h1 className="mt-0.5 font-lux font-bold text-2xl">ตรวจสลิปการชำระเงิน</h1>
          </div>
          {live ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[rgba(74,222,128,.5)] bg-[rgba(74,222,128,.08)] text-[12.5px] text-[#bbf7d0]"><span className="w-2 h-2 rounded-full bg-[#4ade80]" />เชื่อมต่อ Slip2Go แล้ว · ตรวจอัตโนมัติ</span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[rgba(240,200,90,.38)] text-[12.5px] text-[#cdbfb3]"><span className="w-2 h-2 rounded-full bg-[#7d6d6a]" />ยังไม่ได้ตั้ง SLIP2GO_API_SECRET</span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TABS.map(([k, label, fg]) => (
            <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className="px-3.5 py-3 rounded-2xl border-[1.5px] text-left flex flex-col gap-1"
              style={{ borderColor: tab === k ? GOLD : "rgba(240,200,90,.3)", background: tab === k ? "rgba(240,200,90,.12)" : "#241717" }}>
              <span className="text-xs text-[#cdbfb3]">{label}</span>
              <span className="font-lux font-bold text-2xl" style={{ color: fg }}>{count(k)}</span>
            </button>
          ))}
        </div>
        {msg && <p role="status" className="text-sm text-[#eed58a]">{msg}</p>}
        <div className="rounded-2xl border border-[rgba(240,200,90,.38)] overflow-x-auto text-[13px]">
          <div className="min-w-[660px]">
            <div className={`${GRID} px-3.5 py-2.5 bg-[#130e0e] text-[#7d6d6a] text-xs`}><span>รหัส MB</span><span>ผู้ส่งสลิป</span><span>แพ็กเกจ</span><span>ยอดที่ต้องจ่าย</span><span>ผล Slip2Go</span><span>สถานะแอดมิน</span></div>
            {shown.map((r) => {
              const st = statusOf(r);
              return (
                <button key={r.id} onClick={() => setOpen(r.id)} className={`w-full ${GRID} px-3.5 py-[11px] border-t border-[rgba(240,200,90,.25)] text-left items-center`}
                  style={{ background: open === r.id ? "rgba(240,200,90,.14)" : "transparent" }}>
                  <span className="text-[#ffd76a]">{r.mb_code}</span>
                  <span className="min-w-0 pr-2"><span className="block leading-snug">{r.first_name} {r.last_name}{r.nickname ? ` (${r.nickname})` : ""}</span><span className="block text-[11px] text-[#7d6d6a]">ส่ง {thTime(r.created_at, true)}</span></span>
                  <span className="text-[#d3c7bc]">แพ็กเกจ {r.package}</span>
                  <span className="tabular-nums">{fmt(r.amount)}</span>
                  <span><Pill v={verdictOf(r)} /></span>
                  <span style={{ color: st[1] }}>{st[0]}</span>
                </button>
              );
            })}
            {!shown.length && <p className="border-t border-[rgba(240,200,90,.25)] px-4 py-12 text-center text-[#7d6d6a]">ยังไม่มีสลิปในหมวดนี้</p>}
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-[340px] shrink-0 p-4 rounded-[18px] border border-[rgba(245,210,110,.85)] bg-[#241717] flex flex-col gap-2.5 text-[13px] lg:sticky lg:top-[22px] lg:min-h-[calc(100dvh-44px)] max-h-[calc(100dvh-44px)] overflow-y-auto">
        {sel ? (
          <>
            <div className="flex justify-between items-center gap-2">
              <div className="min-w-0"><div className="font-lux font-semibold text-[17px] truncate">{sel.first_name} {sel.last_name}</div><div className="text-[#ffd76a] text-xs">{sel.mb_code} · แพ็กเกจ {sel.package}</div></div>
              <Pill v={v} />
            </div>
            <a href={file(sel.docs.slip!)} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-dashed border-[rgba(240,200,90,.4)] bg-[#130e0e] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file(sel.docs.slip!)} alt={`สลิปของ ${sel.mb_code}`} className="w-full h-[170px] object-contain" />
            </a>
            <div className="text-[11px] tracking-[1.5px] text-[#f0c75a] font-semibold">ผลตรวจจาก SLIP2GO</div>
            {checks.map(([k, val, fg]) => <div key={k} className="flex justify-between gap-2.5 text-[12.5px]"><span className="text-[#cdbfb3] shrink-0">{k}</span><span className="text-right break-all" style={{ color: fg }}>{val}</span></div>)}
            {warn && <div role="alert" className="px-3 py-2.5 rounded-xl border border-[rgba(239,68,68,.5)] bg-[rgba(239,68,68,.1)] text-[#fecaca] text-[12.5px] leading-[1.55]">{warn}{sel.slip_check?.message && v !== "ok" ? ` (${sel.slip_check.message})` : ""}</div>}
            {sel.status === "pending_slip" ? (
              <div className="mt-auto grid grid-cols-2 gap-2">
                <button disabled={busy} onClick={() => setStatus(sel.id, "rejected")} className="h-11 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] text-[#fecaca] font-semibold disabled:opacity-50">ปฏิเสธ · แจ้งส่งใหม่</button>
                <button disabled={busy} onClick={() => setStatus(sel.id, "verified")} className="btn-red-lux h-11 rounded-full !border-[1.5px] !border-[#ffd76a] disabled:opacity-50">ยืนยันรับเงิน</button>
              </div>
            ) : <p className="mt-auto text-center" style={{ color: statusOf(sel)[1] }}>{statusOf(sel)[0]}</p>}
            <div className="text-[11px] text-[#7d6d6a] text-center">ยืนยันแล้วผู้สมัครไปขั้นยืนยันตัวตน (KYC) ต่อได้</div>
          </>
        ) : <p className="py-10 text-center text-[#7d6d6a]">เลือกสลิปในตารางเพื่อดูรายละเอียด</p>}
      </aside>
    </div>
  );
}
