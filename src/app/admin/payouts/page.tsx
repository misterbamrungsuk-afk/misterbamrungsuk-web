"use client";

import { useState } from "react";
import { Toast, baht } from "@/components/ui";
import { PAYOUTS } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const GP = 0.2;

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState(PAYOUTS.map((p) => ({ ...p, paid: false, picked: !p.hold })));
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const net = (g: number) => Math.round(g * (1 - GP));
  const picked = rows.filter((r) => r.picked && !r.paid && !r.hold);
  const total = picked.reduce((s, r) => s + net(r.gross), 0);

  const payOne = (id: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, paid: true, picked: false } : r)));
    flash("ยืนยันโอนแล้ว · บันทึกใน Audit log");
  };
  const payPicked = () => {
    setRows(rows.map((r) => (r.picked && !r.hold ? { ...r, paid: true, picked: false } : r)));
    flash(`โอนแล้ว ${picked.length} ราย รวม ${baht(total)}`);
  };
  const exportCsv = () => {
    const csv = ["name,account,jobs,gross,gp,net", ...rows.filter((r) => !r.paid && !r.hold).map((r) => `${r.name},${r.account},${r.jobs},${r.gross},${r.gross * GP},${net(r.gross)}`)].join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + csv)}`;
    a.download = "mord-payouts.csv";
    a.click();
  };

  return (
    <>
      <PageHead title="รับเงิน / โอนให้หมอ" sub="ยอดหลังหัก GP 20% · รายที่ติดข้อพิพาทถูกพักไว้"
        right={<button onClick={exportCsv} className="h-11 px-4 rounded-xl bg-gold-500 text-[#3a1208] font-semibold">ส่งออกไฟล์โอน (CSV)</button>} />
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <Card key={r.id} className="!p-3 flex flex-wrap items-center gap-3">
            <input type="checkbox" aria-label={`เลือก ${r.name}`} checked={r.picked} disabled={r.paid || r.hold}
              onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, picked: e.target.checked } : x)))} className="w-5 h-5 accent-[#e0a400]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
            <div className="flex-1 min-w-[140px]"><p className="font-medium">{r.name}</p><p className="text-xs text-ink-300">{r.account} · {r.jobs} งาน</p></div>
            <div className="text-right text-sm min-w-[120px]">
              <p className="text-ink-300">{baht(r.gross)} − GP {baht(r.gross * GP)}</p>
              <p className="font-display font-semibold text-lg text-gold-300">{baht(net(r.gross))}</p>
            </div>
            <div className="w-full sm:w-auto flex justify-end">
              {r.hold ? <Pill tone="red">พักไว้ · ข้อพิพาท</Pill>
                : r.paid ? <Pill tone="green">โอนแล้ว</Pill>
                : <button onClick={() => payOne(r.id)} className="h-10 px-4 rounded-xl bg-crimson-500 text-white font-semibold text-sm">ยืนยันโอน</button>}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gold-500 bg-gold-500/5 px-4 py-3">
        <span className="text-sm">เลือก {picked.length} ราย · รวมโอน <b className="font-display font-semibold text-xl text-gold-300">{baht(total)}</b></span>
        <button onClick={payPicked} disabled={!picked.length} className="ml-auto btn-crimson h-11 px-5 rounded-xl font-semibold">ยืนยันโอนที่เลือก</button>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
