"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Appeal } from "@/lib/appeals";
import { FlashMsg, useConfirm, useFlash } from "../confirm";

const LINE = "rgba(240,200,90,.25)";
const REASON: Record<string, string> = { no_show: "ไม่มาตามนัด" };
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-");
const ST: Record<Appeal["status"], [string, string]> = { pending: ["รอตรวจ", "#f0c75a"], accepted: ["รับอุทธรณ์ · ยกเลิกใบเตือน", "#4ade80"], rejected: ["ไม่รับ", "#fca5a5"] };

export function AppealsClient({ list }: { list: Appeal[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [confirmUi, ask] = useConfirm();
  const { msg, fromRes } = useFlash();
  const pending = list.filter((a) => a.status === "pending");
  const done = list.filter((a) => a.status !== "pending");
  const rows = tab === "pending" ? pending : done;

  const act = async (a: Appeal, accept: boolean) => {
    const why = (note[a.id] ?? "").trim();
    if (!(await ask(accept
      ? { title: "รับอุทธรณ์ · ยกเลิกใบเตือน?", body: `${a.mb} · ${REASON[a.strike_reason] ?? a.strike_reason}${a.strike_ref ? ` · การจอง ${a.strike_ref}` : ""}\nใบเตือนใบนี้จะไม่ถูกนับอีก · ย้อนกลับไม่ได้`, ok: "รับอุทธรณ์" }
      : { title: "ไม่รับอุทธรณ์?", body: `${a.mb} · เหตุผลที่แจ้ง Part-Time:\n${why}`, ok: "ไม่รับอุทธรณ์", danger: true }))) return;
    setBusy(a.id);
    const r = await fetch("/api/admin/appeals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, accept, note: why }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy("");
    fromRes(r, j?.ok ? (accept ? "รับอุทธรณ์แล้ว · ยกเลิกใบเตือน" : "ไม่รับอุทธรณ์แล้ว · แจ้ง Part-Time แล้ว") : j?.error || "ไม่สำเร็จ", !!j?.ok);
    if (j?.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      {confirmUi}
      <FlashMsg msg={msg} />
      <div className="flex gap-2">
        {([["pending", `รอตรวจ (${pending.length})`], ["done", `ตัดสินแล้ว (${done.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className="h-9 px-4 rounded-full border text-[13px]" style={{ borderColor: LINE, background: tab === k ? "#f0c75a" : "transparent", color: tab === k ? "#1a1206" : "#d3c7bc" }}>{l}</button>
        ))}
      </div>
      {!rows.length && <p className="m-0 text-[#9a8a85]">{tab === "pending" ? "ไม่มีคำอุทธรณ์รอตรวจ" : "ยังไม่มีคำอุทธรณ์ที่ตัดสินแล้ว"}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((a) => (
          <div key={a.id} className="rounded-2xl border p-3.5 flex flex-col gap-2 min-w-0" style={{ borderColor: LINE, background: "#1c1414" }}>
            <div className="flex justify-between items-baseline gap-2 flex-wrap">
              <b>{a.mb} · {REASON[a.strike_reason] ?? a.strike_reason}</b>
              <span className="text-[12px]" style={{ color: ST[a.status][1] }}>{ST[a.status][0]}</span>
            </div>
            <span className="text-[12px] text-[#9a8a85]">{a.strike_ref ? `การจอง ${a.strike_ref} · ` : ""}ใบเตือนวันที่ {dt(a.strike_at)} · ยื่นเมื่อ {dt(a.created_at)}</span>
            <p className="m-0 whitespace-pre-line break-words leading-relaxed text-[#f6efe4]">{a.reason}</p>
            {a.photo_path && (
              <a href={`/api/admin/appeals?photo=${a.id}`} target="_blank" rel="noreferrer" className="self-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/admin/appeals?photo=${a.id}`} alt="หลักฐานอุทธรณ์" className="w-28 h-36 object-cover rounded-lg bg-[#130e0e]" />
              </a>
            )}
            {a.status === "pending" ? (
              <>
                <input value={note[a.id] ?? ""} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} maxLength={300} placeholder="เหตุผล (ต้องใส่ถ้าไม่รับ · แจ้ง Part-Time)" className="h-9 rounded-lg border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />
                <div className="flex gap-2 flex-wrap">
                  <button type="button" disabled={!!busy} onClick={() => act(a, true)} className="h-9 px-3 rounded-lg font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">รับอุทธรณ์ · ยกเลิกใบเตือน</button>
                  <button type="button" disabled={!!busy || !(note[a.id] ?? "").trim()} onClick={() => act(a, false)} className="h-9 px-3 rounded-lg border text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่รับ</button>
                </div>
              </>
            ) : (
              <span className="text-[12px] text-[#9a8a85]">ตัดสินโดย {a.decided_by ?? "-"} · {dt(a.decided_at)}{a.decision_note ? ` · ${a.decision_note}` : ""}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
