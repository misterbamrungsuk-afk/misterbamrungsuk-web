"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Applicant, KycStatus } from "@/lib/join/store";
import { KYC_LABEL, KycPanel } from "./kyc-panel";

const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const GOLD = "#f0c75a";
const TABS: [KycStatus, string, string][] = [["submitted", "รอตรวจเอกสาร", "#eed58a"], ["rejected", "ไม่ผ่าน · รอส่งใหม่", "#fca5a5"], ["approved", "อนุมัติแล้ว", "#4ade80"]];
const thTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—");

export function KycQueue({ initial }: { initial: Applicant[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<KycStatus>("submitted");
  const shown = useMemo(() => rows.filter((r) => r.kyc_status === tab), [rows, tab]);
  const [open, setOpen] = useState<string | null>(initial.find((r) => r.kyc_status === "submitted")?.id ?? null);
  const sel = rows.find((r) => r.id === open) ?? null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-3.5 w-full">
        <div>
          <div className="text-[11px] tracking-[2.5px] text-[#f0c75a] font-semibold">KYC QUEUE · IDENTITY</div>
          <h1 className="mt-0.5 font-lux font-bold text-2xl">คิวตรวจเอกสารยืนยันตัวตน</h1>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {TABS.map(([k, label, fg]) => (
            <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} style={{ borderColor: tab === k ? GOLD : "rgba(240,200,90,.3)", background: tab === k ? "rgba(240,200,90,.12)" : "#241717" }}
              className="rounded-2xl border-[1.5px] px-3.5 py-3 text-left flex flex-col gap-1">
              <span className="text-xs text-[#cdbfb3]">{label}</span>
              <span className="font-lux font-bold text-2xl" style={{ color: fg }}>{rows.filter((r) => r.kyc_status === k).length}</span>
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-[rgba(240,200,90,.38)] overflow-x-auto text-[13px]">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[110px_minmax(0,1.4fr)_90px_130px_140px] px-3.5 py-2.5 bg-[#130e0e] text-[#7d6d6a] text-xs"><span>รหัส MB</span><span>ชื่อ</span><span>สายงาน</span><span>ส่งเอกสารเมื่อ</span><span>สถานะ KYC</span></div>
            {shown.map((r) => (
              <button key={r.id} onClick={() => setOpen(r.id)} className="w-full grid grid-cols-[110px_minmax(0,1.4fr)_90px_130px_140px] px-3.5 py-[11px] border-t border-[rgba(240,200,90,.38)] text-left items-center"
                style={{ background: open === r.id ? "rgba(240,200,90,.16)" : "transparent" }}>
                <span className="text-[#ffd76a]">{r.mb_code}</span>
                <span className="truncate">{r.first_name} {r.last_name} ({r.nickname})</span>
                <span className="text-[#d3c7bc]">สาย {r.package}</span>
                <span className="text-[#d3c7bc]">{thTime(r.kyc_submitted_at)}</span>
                <span style={{ color: KYC_LABEL[r.kyc_status ?? "none"][1] }}>{KYC_LABEL[r.kyc_status ?? "none"][0]}</span>
              </button>
            ))}
            {!shown.length && <p className="border-t border-[rgba(240,200,90,.38)] px-4 py-12 text-center text-[#7d6d6a]">ไม่มีรายการในหมวดนี้</p>}
          </div>
        </div>
      </div>
      <aside className="w-full lg:w-[320px] shrink-0 p-[18px] rounded-[18px] border border-[rgba(245,210,110,.85)] bg-[#241717] flex flex-col gap-2.5 text-[13px] lg:sticky lg:top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {sel ? (
          <>
            <div className="flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sel.docs.photo ? file(sel.docs.photo) : ""} alt="" className="w-14 h-14 rounded-[14px] object-cover bg-[#130e0e]" />
              <div className="min-w-0"><div className="font-lux font-semibold text-[17px] truncate">{sel.first_name} {sel.last_name}</div><div className="text-[#ffd76a] text-xs">{sel.mb_code} · สาย {sel.package}</div></div>
            </div>
            <div className="h-px bg-[rgba(240,200,90,.38)]" />
            <KycPanel key={sel.id} row={sel} onSaved={(row) => { setRows((rs) => rs.map((x) => (x.id === row.id ? row : x))); router.refresh(); }} />
          </>
        ) : <p className="py-10 text-center text-[#7d6d6a]">เลือกผู้สมัครจากตารางเพื่อตรวจเอกสาร</p>}
      </aside>
    </div>
  );
}
