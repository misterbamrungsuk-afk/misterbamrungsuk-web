"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { PACKAGES } from "@/lib/join/config";
import type { Applicant, ApplicantStatus, CriminalCheck } from "@/lib/join/store";

const CRIMINAL_LABEL: Record<CriminalCheck, string> = { pending: "รอตรวจ", passed: "ผ่าน", failed: "ไม่ผ่าน" };
const criminalConsent = (r: Applicant) => r.consent_criminal ?? r.consent_version.includes("criminal");

const LABEL: Record<ApplicantStatus, string> = { pending_slip: "รอตรวจสลิป", verified: "ยืนยันแล้ว", rejected: "ปฏิเสธ", refunded: "คืนเงินแล้ว" };
const TONE: Record<ApplicantStatus, string> = {
  pending_slip: "border-gold-500 text-gold-300",
  verified: "border-emerald-500/70 text-emerald-300",
  rejected: "border-crimson-500 text-crimson-300",
  refunded: "border-ink-500 text-ink-300",
};
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const DOCS = [["photo", "รูปถ่าย"], ["id_card", "บัตรประชาชน"], ["bankbook", "สมุดบัญชี"], ["other_doc", "เอกสารอื่นๆ"], ["slip", "สลิป"]] as const;
const name = (r: Applicant) => `${r.title}${r.first_name} ${r.last_name}`;
const thTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

export function ApplicantList({ initial }: { initial: Applicant[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<ApplicantStatus | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const act = async (id: string, body: { status?: ApplicantStatus; sync?: boolean }) => {
    const res = await fetch(`/api/admin/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (body.sync) {
      setMsg(data.ok ? "sync ชีตสำเร็จ" : "sync ชีตไม่สำเร็จ ตรวจการตั้งค่า Google Sheet");
      if (data.ok) setRows((r) => r.map((x) => (x.id === id ? { ...x, sheet_synced: true } : x)));
    } else if (data.row) {
      setRows((r) => r.map((x) => (x.id === id ? data.row : x)));
      setMsg(`บันทึกสถานะ: ${LABEL[data.row.status as ApplicantStatus]}`);
    } else setMsg("บันทึกไม่สำเร็จ");
    router.refresh(); // อัปเดตตัวเลขสรุปด้านบน (render ฝั่งเซิร์ฟเวอร์)
    setTimeout(() => setMsg(""), 2500);
  };
  const shown = rows.filter((r) => !filter || r.status === filter);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["", "pending_slip", "verified", "rejected", "refunded"] as const).map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)} className={`chip h-9 px-3.5 text-sm ${filter === s ? "chip-red" : ""}`}>{s ? LABEL[s] : "ทั้งหมด"}</button>
        ))}
        <a href="/api/admin/applicants/export" className="btn-ghost h-9 px-4 text-sm inline-flex items-center sm:ml-auto">ส่งออก CSV</a>
        <a href="/api/admin/backup" className="btn-ghost h-9 px-4 text-sm inline-flex items-center">ดาวน์โหลดสำรองข้อมูล</a>
      </div>
      {msg && <p role="status" className="mt-3 text-sm text-gold-300">{msg}</p>}

      <div className="mt-4 flex flex-col gap-2.5">
        {shown.length === 0 && <p className="text-center text-ink-300 py-16">ยังไม่มีผู้สมัคร</p>}
        {shown.map((r) => (
          <article key={r.id} className="glass rounded-2xl">
            <button onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="w-full p-4 flex items-center gap-3 text-left min-h-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.docs.photo ? file(r.docs.photo) : ""} alt="" className="w-11 h-11 rounded-full object-cover bg-ink-800 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{r.mb_code} · {r.nickname} ({name(r)})</span>
                <span className="block text-xs text-ink-300 truncate">แพ็กเกจ {r.package} · ฿{r.amount.toLocaleString("th-TH")} · {thTime(r.created_at)}</span>
              </span>
              <span className="shrink-0 hidden sm:inline-flex h-6 px-2.5 rounded-full border border-ink-600 text-[11px] text-ink-300 items-center">ประวัติ: {CRIMINAL_LABEL[r.criminal_check ?? "pending"]}</span>
              <span className={`shrink-0 h-6 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center ${TONE[r.status]}`}>{LABEL[r.status]}</span>
            </button>
            {open === r.id && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-ink-600 pt-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm min-w-0">
                  {[
                    ["ชื่อ-สกุล", name(r)], ["วันเกิด", r.birthdate], ["สูง/หนัก", `${r.height} ซม. / ${r.weight} กก.`],
                    ["สัญชาติ/เชื้อชาติ", `${r.nationality} / ${r.ethnicity}`], ["ศาสนา", r.religion], ["การศึกษา", r.education], ["สถานภาพ", r.marital],
                    ["เริ่มงานได้", r.start_date], ["โทร", r.tel], ["LINE", r.line_id], ["อีเมล", r.email || "-"], ["ที่อยู่", r.address],
                    ["บัญชีรับเงิน", `${r.bank} ${r.bank_account} (${r.bank_account_name})`],
                    ["ประสบการณ์", r.experience], ["จุดเด่น", r.skills.join(", ") || "-"], ["แนะนำตัว", r.intro || "-"],
                    ["ชำระผ่าน", r.payment_method === "qr" ? "QR" : "โอนบัญชี"], ["แพ็กเกจ", PACKAGES[r.package].name],
                    ["สัญญา", r.contract_accepted_at ? `ยอมรับ ${thTime(r.contract_accepted_at)}` : "ยังไม่ยอมรับ"],
                    ["ความยินยอม PDPA", `${r.consent_version} · ${thTime(r.consented_at)}`], ["รับข่าวสาร", r.consent_marketing ? "ยินยอม" : "ไม่ยินยอม"],
                    ["ยินยอมตรวจประวัติอาชญากรรม", criminalConsent(r) ? "ยินยอม" : "ไม่มีบันทึก (สมัครก่อนเพิ่มเงื่อนไข)"],
                    ["ตรวจประวัติอาชญากรรม", CRIMINAL_LABEL[r.criminal_check ?? "pending"]],
                    ["Google Sheet", r.sheet_synced ? "sync แล้ว" : "ยังไม่ sync"],
                  ].map(([k, v]) => (
                    <Fragment key={k}><dt className="text-ink-300">{k}</dt><dd className="break-words min-w-0">{v}</dd></Fragment>
                  ))}
                </dl>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:col-span-2">
                  {DOCS.filter(([k]) => r.docs[k]).map(([k, l]) => [l, r.docs[k]!] as const).map(([l, p]) => (
                    <a key={l} href={file(p)} target="_blank" rel="noopener noreferrer" className="block text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file(p)} alt={l} className="w-full aspect-[3/4] rounded-xl object-cover bg-ink-800" />
                      <span className="text-xs text-ink-300">{l}</span>
                    </a>
                  ))}
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  {r.status !== "verified" && <button onClick={() => act(r.id, { status: "verified" })} className="btn-crimson h-10 px-5 text-sm font-semibold">ยืนยันสลิป</button>}
                  {r.status === "pending_slip" && <button onClick={() => act(r.id, { status: "rejected" })} className="btn-ghost h-10 px-4 text-sm">ปฏิเสธ</button>}
                  {r.status === "verified" && <button onClick={() => act(r.id, { status: "refunded" })} className="btn-ghost h-10 px-4 text-sm">บันทึกคืนเงิน</button>}
                  {!r.sheet_synced && <button onClick={() => act(r.id, { sync: true })} className="btn-ghost h-10 px-4 text-sm">sync ชีต</button>}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
