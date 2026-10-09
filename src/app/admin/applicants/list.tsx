"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COHORTS, PACKAGES, feeBreakdown, lineAddUrl } from "@/lib/join/config";
import type { Applicant, ApplicantStatus, CriminalCheck } from "@/lib/join/store";

const CRIMINAL_LABEL: Record<CriminalCheck, string> = { pending: "รอตรวจ", passed: "ผ่าน", failed: "ไม่ผ่าน" };
const criminalConsent = (r: Applicant) => r.consent_criminal ?? r.consent_version.includes("criminal");

const LABEL: Record<ApplicantStatus, string> = { pending_slip: "รอตรวจสลิป", verified: "ชำระแล้ว", rejected: "ปฏิเสธ", refunded: "คืนเงินแล้ว" };
const TONE: Record<ApplicantStatus, string> = {
  pending_slip: "border-gold-500 text-gold-300",
  verified: "border-emerald-500/70 text-emerald-300",
  rejected: "border-crimson-500 text-crimson-300",
  refunded: "border-ink-500 text-ink-300",
};
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const SLIP_LABEL: Record<string, [string, string]> = { ok: ["✓ ยอดตรง", "text-emerald-400"], acct: ["โอนเข้าบัญชีอื่น", "text-red-400"], amt: ["ยอดไม่ตรง", "text-red-400"], dup: ["สลิปซ้ำ", "text-red-400"], fake: ["ไม่พบรายการ", "text-red-400"], error: ["ตรวจไม่สำเร็จ", "text-amber-300"] };

const DOCS = [["photo", "รูปถ่าย"], ["id_card", "บัตรประชาชน"], ["bankbook", "สมุดบัญชี"], ["other_doc", "เอกสารอื่นๆ"], ["cert_doc", "ใบรับรองนวด"], ["slip", "สลิป"]] as const;
const name = (r: Applicant) => `${r.title}${r.first_name} ${r.last_name}`;
const thTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const cohortOf = (k?: string | null) => COHORTS.find((c) => c.key === k);

type Filter = ApplicantStatus | "" | "no_line" | "no_cohort";
const FILTERS: [Filter, string][] = [["", "ทั้งหมด"], ["pending_slip", "รอตรวจสลิป"], ["verified", "ชำระแล้ว"], ["no_line", "ยังไม่เข้ากลุ่ม LINE"], ["no_cohort", "ยังไม่จัดรุ่น"], ["rejected", "ปฏิเสธ"], ["refunded", "คืนเงินแล้ว"]];

export function ApplicantList({ initial }: { initial: Applicant[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("");
  const [cohortSel, setCohortSel] = useState<string>("");
  const [open, setOpen] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (data.row) setRows((r) => r.map((x) => (x.id === id ? data.row : x)));
    return data as { ok?: boolean; row?: Applicant };
  };

  const act = async (id: string, body: { status?: ApplicantStatus; sync?: boolean }) => {
    const data = await patch(id, body);
    if (body.sync) {
      flash(data.ok ? "sync ชีตสำเร็จ" : "sync ชีตไม่สำเร็จ ตรวจการตั้งค่า Google Sheet");
      if (data.ok) setRows((r) => r.map((x) => (x.id === id ? { ...x, sheet_synced: true } : x)));
    } else flash(data.row ? `บันทึกสถานะ: ${LABEL[data.row.status]}` : "บันทึกไม่สำเร็จ");
    router.refresh();
  };

  const assign = async (ids: string[], cohort: string | null) => {
    const res = await Promise.all(ids.map((id) => patch(id, { cohort })));
    flash(res.every((d) => d.ok) ? `จัด ${ids.length} คน เข้า${cohort ? cohortOf(cohort)?.name : " (ไม่ระบุรุ่น)"}` : "บันทึกบางรายการไม่สำเร็จ");
    setChecked([]);
  };
  const setLine = async (id: string, v: boolean) => {
    const d = await patch(id, { line_joined: v });
    flash(d.ok ? (v ? "บันทึก: เข้ากลุ่ม LINE แล้ว" : "บันทึก: ยังไม่เข้ากลุ่ม") : "บันทึกไม่สำเร็จ");
    router.refresh();
  };
  const sendLineLink = async (r: Applicant) => {
    const text = `สวัสดีค่ะคุณ${r.nickname} (${r.mb_code}) ลิงก์เข้ากลุ่ม LINE Mister Bamrungsuk: ${lineAddUrl()}`;
    try { await navigator.clipboard.writeText(text); flash("คัดลอกข้อความลิงก์กลุ่ม LINE แล้ว — วางส่งให้ผู้สมัครได้เลย"); } catch { flash(text); }
  };

  const shown = useMemo(() => rows.filter((r) => {
    if (cohortSel && r.cohort !== cohortSel) return false;
    if (filter === "no_line") return r.status === "verified" && !r.line_joined;
    if (filter === "no_cohort") return r.status === "verified" && !r.cohort;
    return !filter || r.status === filter;
  }), [rows, filter, cohortSel]);
  const sel = rows.find((r) => r.id === open) ?? null;
  const allOn = shown.length > 0 && shown.every((r) => checked.includes(r.id));

  return (
    <section className="mt-6">
      {/* ── รุ่นอบรม ── */}
      <div className="rounded-2xl border border-ink-600 bg-ink-800 p-4">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-400">TRAINING COHORT</p>
          <p className="font-semibold">รุ่นอบรม</p>
          {cohortSel && <button onClick={() => setCohortSel("")} className="ml-auto text-xs text-ink-300 underline">ดูทุกรุ่น</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {COHORTS.map((c) => {
            const n = rows.filter((r) => r.cohort === c.key && r.status !== "rejected" && r.status !== "refunded").length;
            const pct = Math.min(100, Math.round((n / c.capacity) * 100));
            const on = cohortSel === c.key;
            return (
              <button key={c.key} onClick={() => setCohortSel(on ? "" : c.key)} aria-pressed={on}
                className={`text-left rounded-xl border p-3 transition ${on ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-900/50 hover:border-gold-500/50"}`}>
                <div className="flex justify-between items-baseline"><span className="font-semibold">{c.name}</span><span className="text-sm text-gold-300 font-display">{n}/{c.capacity}</span></div>
                <p className="text-xs text-ink-300 mt-0.5">{c.date}</p>
                <div className="h-1.5 rounded-full bg-ink-700 mt-2 overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? "bg-crimson-500" : "bg-gradient-to-r from-gold-400 to-gold-500"}`} style={{ width: `${pct}%` }} /></div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-5">
        {FILTERS.map(([s, l]) => (
          <button key={s || "all"} onClick={() => setFilter(s)} className={`chip h-9 px-3.5 text-sm ${filter === s ? "chip-red" : ""}`}>{l}</button>
        ))}
        <a href="/api/admin/applicants/export" className="btn-ghost h-9 px-4 text-sm inline-flex items-center sm:ml-auto">ส่งออก Excel / CSV</a>
        <a href="/api/admin/backup" className="btn-ghost h-9 px-4 text-sm inline-flex items-center">สำรองข้อมูล</a>
      </div>
      {checked.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/5 px-3 py-2 text-sm">
          <span>เลือก {checked.length} คน · จัดเข้า</span>
          {COHORTS.map((c) => <button key={c.key} onClick={() => assign(checked, c.key)} className="btn-ghost h-8 px-3 text-xs">{c.name}</button>)}
          <button onClick={() => setChecked([])} className="ml-auto text-xs text-ink-300 underline">ยกเลิก</button>
        </div>
      )}
      {msg && <p role="status" className="mt-3 text-sm text-gold-300">{msg}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px] items-start">
        {/* ── ตาราง ── */}
        <div className="rounded-2xl border border-ink-600 bg-ink-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-xs text-ink-300 border-b border-ink-600">
              <tr>
                <th className="p-3 w-8"><input type="checkbox" aria-label="เลือกทั้งหมด" className="accent-[#d4af37]" checked={allOn} onChange={(e) => setChecked(e.target.checked ? shown.map((r) => r.id) : [])} /></th>
                <th className="p-3 text-left">รหัส MB</th><th className="p-3 text-left">ชื่อ</th><th className="p-3 text-left">แพ็กเกจ</th>
                <th className="p-3 text-left">รุ่นอบรม</th><th className="p-3 text-left">กลุ่ม LINE</th><th className="p-3 text-left">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="text-center text-ink-300 py-16">ยังไม่มีผู้สมัคร</td></tr>}
              {shown.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r.id)} className={`border-b border-ink-700 last:border-0 cursor-pointer ${open === r.id ? "bg-gold-500/10" : "hover:bg-ink-700/40"}`}>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`เลือก ${r.mb_code}`} className="accent-[#d4af37]" checked={checked.includes(r.id)} onChange={(e) => setChecked((c) => (e.target.checked ? [...c, r.id] : c.filter((x) => x !== r.id)))} /></td>
                  <td className="p-3 font-display text-gold-300 whitespace-nowrap">{r.mb_code}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-2.5 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.docs.photo ? file(r.docs.photo) : ""} alt="" className="w-8 h-8 rounded-full object-cover bg-ink-700 shrink-0" />
                      <span className="min-w-0"><span className="block truncate">{r.nickname}</span><span className="block text-xs text-ink-400 truncate">{name(r)}</span></span>
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{r.package} · ฿{r.amount.toLocaleString("th-TH")}</td>
                  <td className="p-3 whitespace-nowrap text-ink-200">{cohortOf(r.cohort) ? `${cohortOf(r.cohort)!.name} · ${cohortOf(r.cohort)!.date}` : <span className="text-ink-400">—</span>}</td>
                  <td className="p-3 whitespace-nowrap">{r.line_joined ? <span className="text-emerald-300">✓ เข้ากลุ่มแล้ว</span> : <span className="text-crimson-300">ยังไม่เข้า</span>}</td>
                  <td className="p-3"><span className={`h-6 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center whitespace-nowrap ${TONE[r.status]}`}>{LABEL[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── แผงรายละเอียด ── */}
        {sel ? (
          <aside className="rounded-2xl border border-ink-600 bg-ink-800 p-4 lg:sticky lg:top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sel.docs.photo ? file(sel.docs.photo) : ""} alt="" className="w-14 h-14 rounded-full object-cover bg-ink-700 border border-gold-500/40" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-gold-300">{sel.mb_code}</p>
                <p className="font-semibold truncate">{sel.nickname} · {name(sel)}</p>
              </div>
              <button onClick={() => setOpen(null)} aria-label="ปิด" className="w-8 h-8 rounded-full border border-ink-600 text-ink-300">×</button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => sendLineLink(sel)} className="h-9 px-3.5 rounded-full bg-[#06c755] text-white text-sm font-semibold">ส่งลิงก์กลุ่ม LINE</button>
              <button onClick={() => setLine(sel.id, !sel.line_joined)} className="btn-ghost h-9 px-3.5 text-sm">{sel.line_joined ? "ทำเครื่องหมาย: ยังไม่เข้า" : "✓ เข้ากลุ่มแล้ว"}</button>
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm">
              <span className="text-ink-300 shrink-0">รุ่นอบรม</span>
              <select className="input-dark h-10 flex-1" value={sel.cohort ?? ""} onChange={(e) => assign([sel.id], e.target.value || null)}>
                <option value="">— ยังไม่จัดรุ่น —</option>
                {COHORTS.map((c) => <option key={c.key} value={c.key}>{c.name} · {c.date}</option>)}
              </select>
            </label>

            <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-400 mt-5">ข้อมูลการชำระเงิน</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mt-2">
              <dt className="text-ink-300">แพ็กเกจ</dt><dd>{sel.package} · {PACKAGES[sel.package].name}</dd>
              {feeBreakdown(sel.package).map((x) => <Fragment key={x.name}><dt className="text-ink-300">{x.name}</dt><dd>฿{x.amount.toLocaleString("th-TH")}</dd></Fragment>)}
              <dt className="text-ink-300">ยอดชำระ</dt><dd className="text-gold-300 font-semibold">฿{sel.amount.toLocaleString("th-TH")} ({sel.payment_method === "qr" ? "QR" : "โอนบัญชี"})</dd>
              <dt className="text-ink-300">Slip2Go</dt>
              <dd>{sel.slip_check ? (
                <span className="flex flex-col">
                  <span className={`font-semibold ${SLIP_LABEL[sel.slip_check.verdict][1]}`}>{SLIP_LABEL[sel.slip_check.verdict][0]}</span>
                  <span className="text-xs text-ink-300">ยอดโอน {sel.slip_check.amount != null ? "฿" + sel.slip_check.amount.toLocaleString("th-TH") : "-"} · {sel.slip_check.sender ?? "-"} → {sel.slip_check.receiver ?? "-"}</span>
                  <span className="text-xs text-ink-300 break-all">Ref {sel.slip_check.trans_ref ?? "-"}{sel.slip_check.verdict !== "ok" && sel.slip_check.message ? " · " + sel.slip_check.message : ""}</span>
                </span>
              ) : <span className="text-ink-300">ไม่ได้ตรวจ (ตรวจด้วยตา)</span>}</dd>
              <dt className="text-ink-300">สถานะ</dt><dd>{LABEL[sel.status]}</dd>
              <dt className="text-ink-300">สมัครเมื่อ</dt><dd>{thTime(sel.created_at)}</dd>
            </dl>

            <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-400 mt-5">ข้อมูลส่วนตัว</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mt-2">
              {[
                ["วันเกิด", sel.birthdate], ["สูง/หนัก", `${sel.height} ซม. / ${sel.weight} กก.`],
                ["โทร", sel.tel], ["LINE", sel.line_id || "-"], ["อีเมล", sel.email || "-"], ["รหัสไปรษณีย์", sel.zipcode],
                ["ประสบการณ์", sel.experience], ["จุดเด่น", sel.skills.join(", ") || "-"],
                ["กิจกรรม", sel.activities?.join(", ") || "-"],
                ["ความสามารถพิเศษ", sel.talents?.join(", ") || "-"],
                ["ใบรับรองนวด", sel.massage_cert == null ? "-" : sel.massage_cert ? "มี" : "ไม่มี"],
                ["เวลาที่สะดวก", sel.availability ? `${sel.availability.slots.join(" / ")} · ${sel.availability.days ?? "-"} วัน/สัปดาห์ · ${sel.availability.hours ?? "-"} ชม./วัน` : "-"],
                ["รับทราบชั่วโมงงาน", sel.ack_hours ? "✓" : "-"], ["ยอมรับไม่ปฏิเสธลูกค้า", sel.ack_no_refuse ? "✓" : "-"],
                ["แนะนำตัว", sel.intro || "-"],
                ["สัญญา", sel.contract_accepted_at ? `ยอมรับ ${thTime(sel.contract_accepted_at)}` : "ยังไม่ยอมรับ"],
                ["PDPA", `${sel.consent_version} · ${thTime(sel.consented_at)}`], ["รับข่าวสาร", sel.consent_marketing ? "ยินยอม" : "ไม่ยินยอม"],
                ["ยินยอมตรวจประวัติ", criminalConsent(sel) ? "ยินยอม" : "ไม่มีบันทึก"],
                ["ผลตรวจประวัติ", CRIMINAL_LABEL[sel.criminal_check ?? "pending"]],
                ["Google Sheet", sel.sheet_synced ? "sync แล้ว" : "ยังไม่ sync"],
              ].map(([k, v]) => <Fragment key={k}><dt className="text-ink-300">{k}</dt><dd className="break-words min-w-0">{v}</dd></Fragment>)}
            </dl>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {DOCS.filter(([k]) => sel.docs[k]).map(([k, l]) => [l, sel.docs[k]!] as const).map(([l, p]) => (
                <a key={l} href={file(p)} target="_blank" rel="noopener noreferrer" className="block text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file(p)} alt={l} className="w-full aspect-[3/4] rounded-xl object-cover bg-ink-700" />
                  <span className="text-xs text-ink-300">{l}</span>
                </a>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {sel.status !== "verified" && <button onClick={() => act(sel.id, { status: "verified" })} className="btn-crimson h-10 px-5 text-sm font-semibold">ยืนยันสลิป</button>}
              {sel.status === "pending_slip" && <button onClick={() => act(sel.id, { status: "rejected" })} className="btn-ghost h-10 px-4 text-sm">ปฏิเสธ</button>}
              {sel.status === "verified" && <button onClick={() => act(sel.id, { status: "refunded" })} className="btn-ghost h-10 px-4 text-sm">บันทึกคืนเงิน</button>}
              {!sel.sheet_synced && <button onClick={() => act(sel.id, { sync: true })} className="btn-ghost h-10 px-4 text-sm">sync ชีต</button>}
            </div>
          </aside>
        ) : (
          <aside className="hidden lg:block rounded-2xl border border-dashed border-ink-600 p-8 text-center text-sm text-ink-400">เลือกผู้สมัครจากตารางเพื่อดูรายละเอียด</aside>
        )}
      </div>
    </section>
  );
}
