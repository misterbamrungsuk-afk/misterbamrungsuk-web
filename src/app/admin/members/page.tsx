"use client";

import { useMemo, useState } from "react";
import { Toast } from "@/components/ui";
import { MEMBERS } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const LIMIT = 3; // ครบ 3 strike ระงับอัตโนมัติ

function Strikes({ n }: { n: number }) {
  return <span className="inline-flex gap-1" aria-label={`strike ${n}/${LIMIT}`}>{[0, 1, 2].map((i) => <i key={i} className={`w-4 h-1.5 rounded-full ${i < n ? "bg-crimson-500" : "bg-ink-600"}`} />)}</span>;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState(MEMBERS);
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState(MEMBERS[0].id);
  const [toast, setToast] = useState("");
  const list = useMemo(() => members.filter((m) => !q || m.name.includes(q)), [members, q]);
  const sel = members.find((m) => m.id === selId);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const update = (patch: (m: (typeof members)[number]) => Partial<(typeof members)[number]>, msg: string) => {
    setMembers(members.map((m) => (m.id === selId ? { ...m, ...patch(m) } : m)));
    flash(msg);
  };

  return (
    <>
      <PageHead title="สมาชิก" sub="ครบ 3 strike ระงับอัตโนมัติ" right={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ" aria-label="ค้นหาสมาชิก" className="input-dark h-11 w-60 max-w-full" />} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-3">
        <Card className="!p-2 flex flex-col gap-1">
          {list.map((m) => (
            <button key={m.id} onClick={() => setSelId(m.id)} className={`flex items-center gap-3 p-3 rounded-xl text-left ${m.id === selId ? "bg-ink-700 ring-1 ring-gold-500" : "hover:bg-ink-700/50"}`}>
              {m.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={m.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                : <span className="w-10 h-10 rounded-full border border-ink-600 grid place-items-center text-sm shrink-0">{m.name.slice(-2, -1)}</span>}
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{m.name} {m.kyc && <span className="text-gold-600 text-xs">✓</span>}</span>
                <span className="block text-xs text-ink-300">{m.role === "therapist" ? "หมอนวด" : "ลูกค้า"} · {m.jobs} งาน · ★ {m.rating}</span>
              </span>
              <span className="flex flex-col items-end gap-1 shrink-0"><Strikes n={m.strikes} />{m.suspended ? <Pill tone="red">ระงับ</Pill> : m.strikes === 2 ? <Pill tone="gold">เฝ้าระวัง</Pill> : <Pill>ปกติ</Pill>}</span>
            </button>
          ))}
        </Card>
        {sel && (
          <Card className="flex flex-col gap-3 h-fit">
            <div className="flex items-center gap-3">
              {sel.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={sel.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                : <span className="w-14 h-14 rounded-full border border-ink-600 grid place-items-center">{sel.name.slice(-2, -1)}</span>}
              <div><b className="font-display font-semibold text-lg">{sel.name}</b><p className="text-xs text-ink-300">{sel.role === "therapist" ? "หมอนวด" : "ลูกค้า"}</p></div>
            </div>
            <div className={`rounded-xl p-3 border ${sel.strikes >= 2 ? "border-crimson-500 bg-crimson-500/5" : "border-ink-600"}`}>
              <div className="flex justify-between text-sm"><span>Strike {sel.strikes} / {LIMIT}</span><Strikes n={sel.strikes} /></div>
              {sel.strikes === 2 && <p className="text-xs text-crimson-200 mt-1">อีก 1 ครั้ง = ระงับอัตโนมัติ</p>}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => update((m) => { const s = Math.min(LIMIT, m.strikes + 1); return { strikes: s, suspended: s >= LIMIT || m.suspended }; }, sel.strikes + 1 >= LIMIT ? "ครบ 3 strike · ระงับอัตโนมัติแล้ว" : "ให้ strike แล้ว")} disabled={sel.strikes >= LIMIT} className="h-11 rounded-xl border border-crimson-500 text-crimson-200 disabled:opacity-40">ให้ strike</button>
              <button onClick={() => update((m) => ({ strikes: Math.max(0, m.strikes - 1) }), "ล้าง strike ล่าสุดแล้ว")} disabled={sel.strikes === 0} className="h-11 rounded-xl border border-ink-600 disabled:opacity-40">ล้าง strike ล่าสุด</button>
              <button onClick={() => update((m) => ({ suspended: !m.suspended }), sel.suspended ? "ปลดระงับบัญชีแล้ว" : "ระงับบัญชีแล้ว")} className={`h-11 rounded-xl font-semibold ${sel.suspended ? "bg-crimson-500 text-white" : "bg-crimson-500 text-white"}`}>{sel.suspended ? "ปลดระงับ" : "ระงับบัญชีทันที"}</button>
            </div>
          </Card>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
