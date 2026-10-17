"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PACKAGES, QUOTA, feeBreakdown, lineAddUrl, type PackageKey } from "@/lib/join/config";
import type { Applicant as ApplicantBase, ApplicantStatus, CriminalCheck, Extra } from "@/lib/join/store";

/** แถวที่หน้า page ส่งมา = คอลัมน์ + docs.extra (extraOf) */
type Applicant = ApplicantBase & Extra;
import { KYC_LABEL, KycPanel } from "../kyc/kyc-panel";
import { FlashMsg, useConfirm, useFlash } from "../confirm";
import { csvCell } from "@/lib/csv";
import { canAccess, type AdminRole } from "@/lib/admin-auth";

// ตามบอร์ด AdminApplicants.dc.html (1280px) — ยอดรวมนับเฉพาะผู้สมัครที่ชำระแล้ว (verified)
const GOLD = "#f0c75a";
const LINE_BD = "rgba(240,200,90,.38)";
const CRIMINAL: Record<CriminalCheck, [string, string]> = { pending: ["รอตรวจ", "#cdbfb3"], passed: ["ผ่าน", "#4ade80"], failed: ["ไม่ผ่าน", "#fca5a5"] };
const LABEL: Record<ApplicantStatus, string> = { pending_slip: "รอตรวจสลิป", verified: "ชำระแล้ว", rejected: "ปฏิเสธ", refunded: "คืนเงินแล้ว" };
const SLIP_LABEL: Record<string, [string, string]> = { ok: ["✓ ยอดตรง", "#4ade80"], check: ["ยอดตรง · ต้องเทียบบัญชีเอง", "#eed58a"], acct: ["โอนเข้าบัญชีอื่น", "#fca5a5"], amt: ["ยอดไม่ตรง", "#fca5a5"], dup: ["สลิปซ้ำ", "#fca5a5"], fake: ["ไม่พบรายการ", "#fca5a5"], error: ["ตรวจไม่สำเร็จ", "#eed58a"] };
const DOCS = [["photo", "รูปหน้าตรง"], ["other_doc", "รูปเต็มตัว"], ["slip", "สลิป"], ["id_card", "บัตรประชาชน"], ["id_copy", "สำเนาบัตรเซ็นรับรอง"], ["selfie", "เซลฟีถือบัตร"], ["bankbook", "สมุดบัญชี"], ["cert_doc", "ใบรับรองนวด"]] as const;
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const fmt = (n: number) => "฿" + n.toLocaleString("en-US");
const fullName = (r: Applicant) => `${r.title}${r.first_name} ${r.last_name}`;
const thTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const ageOf = (b: string | null) => { if (!b) return null; const d = new Date(b); if (isNaN(+d)) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

type Pkg = "all" | PackageKey;
type Filter = ApplicantStatus | "all" | "todo" | "fix";
/** รอแอดมิน = สลิปยังไม่ตรวจ หรือเอกสารส่งมารอตรวจ */
const isTodo = (r: Applicant) => r.status === "pending_slip" || r.kyc_status === "submitted";
const match = (r: Applicant, f: Filter) => f === "all" ? true : f === "todo" ? isTodo(r) : f === "fix" ? r.kyc_status === "rejected" : r.status === f;
const FILTERS: [Filter, string][] = [["todo", "รอตรวจ"], ["fix", "ตีกลับ · รอแก้"], ["verified", "ชำระแล้ว"], ["pending_slip", "รอตรวจสลิป"], ["rejected", "ปฏิเสธ"], ["refunded", "คืนเงินแล้ว"], ["all", "ทั้งหมด"]];
const PKG_TABS: [Pkg, string, string][] = [["all", "ทั้งหมด", "ผู้สมัครทุกสาย"], ["A", "สาย A", PACKAGES.A.name], ["B", "สาย B", PACKAGES.B.name]];
const PN: Record<Pkg, string> = { all: "ทุกสาย", A: "สาย A", B: "สาย B" };
const G = (k: PackageKey) => feeBreakdown(k)[0].amount;
const T = (k: PackageKey) => feeBreakdown(k)[1].amount;
const GRID = "grid grid-cols-[110px_minmax(0,1.4fr)_100px_100px_90px_120px_100px]";

/** ค้นหาจาก ชื่อ ชื่อเล่น รหัส MB เบอร์ อีเมล LINE */
const hit = (r: Applicant, t: string) => !t || [r.first_name, r.last_name, `${r.first_name} ${r.last_name}`, r.nickname, r.mb_code, r.tel, r.tel?.replace(/\D/g, ""), r.email, r.line_id].some((x) => !!x && x.toLowerCase().includes(t));

export function ApplicantList({ initial, cohorts, initialPkg, note, role }: { initial: Applicant[]; cohorts: { key: string; name: string }[]; initialPkg: Pkg; note: string; role: AdminRole }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [pkg, setPkg] = useState<Pkg>(initialPkg);
  const [filter, setFilter] = useState<Filter>(() => initial.some(isTodo) ? "todo" : "verified");
  const [showDocs, setShowDocs] = useState(false);
  const { msg, flash, fromRes } = useFlash();
  const [confirmUi, ask] = useConfirm();
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  // ตัดสิน KYC ได้เฉพาะบทบาทที่เข้า /admin/kyc ได้ (API ก็ปฏิเสธ) — ไม่แสดงปุ่มที่กดแล้วโดนปฏิเสธ
  const canKyc = canAccess(role, "/admin/kyc");
  const cohortName = (k?: string | null) => cohorts.find((c) => c.key === k)?.name ?? "—";

  const paid = rows.filter((r) => r.status === "verified");
  const nOf = (k: Pkg, list = paid) => list.filter((r) => k === "all" || r.package === k).length;
  const nA = nOf("A"), nB = nOf("B");
  const sumOf = (k: Pkg, f: (p: PackageKey) => number) => (k !== "B" ? nA * f("A") : 0) + (k !== "A" ? nB * f("B") : 0);
  const fx = (k: Pkg, f: (p: PackageKey) => number) => k === "A" ? `A ${nA}×${fmt(f("A"))}` : k === "B" ? `B ${nB}×${fmt(f("B"))}` : `A ${nA}×${fmt(f("A"))} + B ${nB}×${fmt(f("B"))}`;
  const notLine = paid.filter((r) => !r.line_joined).length;

  const t = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => (pkg === "all" || r.package === pkg) && match(r, filter) && hit(r, t)), [rows, pkg, filter, t]);
  const [open, setOpen] = useState<string | null>(shown[0]?.id ?? null);
  // pin = คนที่เพิ่งกดทำรายการ — ถ้าย้ายออกจากแท็บปัจจุบัน แผงยังค้างที่คนเดิม (ไม่สลับไปคนอื่นเงียบ ๆ แล้วกดผิดคน)
  const [pin, setPin] = useState<string | null>(null);
  const inShown = shown.find((r) => r.id === open);
  const sel = (inShown ?? (pin && pin === open ? rows.find((r) => r.id === pin) : undefined) ?? shown[0]) ?? null;
  const movedTo = sel && !inShown && sel.id === pin ? FILTERS.find(([k]) => k !== "all" && match(sel, k))?.[1] ?? "ทั้งหมด" : null;
  const pick = (id: string | null) => { setOpen(id); setPin(null); setShowDocs(false); setRejecting(false); setReason(""); };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setPin(id); setOpen(id);
    const res = await fetch(`/api/admin/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as { ok?: boolean; row?: Applicant; error?: string };
    if (data.row) setRows((r) => r.map((x) => (x.id === id ? data.row! : x)));
    return { ...data, res };
  };
  /** แจ้งผล: 401 = เซสชันหมดอายุ · ไม่สำเร็จใช้ข้อความจาก API */
  const say = (d: { ok?: boolean; error?: string; res: Response | null }, okText: string, failText = "บันทึกไม่สำเร็จ") => fromRes(d.res, d.ok ? okText : d.error ?? failText, !!d.ok);
  const act = async (id: string, body: { status?: ApplicantStatus; sync?: boolean; reason?: string }) => {
    const d = await patch(id, body);
    if (body.sync) { say(d, "sync ชีตสำเร็จ", "sync ชีตไม่สำเร็จ ตรวจการตั้งค่า Google Sheet"); if (d.ok) setRows((r) => r.map((x) => (x.id === id ? { ...x, sheet_synced: true } : x))); }
    else say({ ...d, ok: !!d.row }, d.row ? `บันทึกสถานะ: ${LABEL[d.row.status]}` : "");
    if (d.row) { setRejecting(false); setReason(""); }
    router.refresh();
  };
  const verifySlip = async (r: Applicant) => { if (await ask({ title: "ยืนยันสลิปชำระเงิน?", body: `${fullName(r)} (${r.mb_code}) · ${fmt(r.amount)}\nเช็กว่าเงินเข้าบัญชีร้านจริงก่อนยืนยัน`, ok: "ยืนยันรับเงิน" })) act(r.id, { status: "verified" }); };
  const rejectSlip = async (r: Applicant) => { const why = reason.trim(); if (!why) return; if (await ask({ title: "ปฏิเสธสลิปนี้?", body: `${fullName(r)} (${r.mb_code})\nเหตุผล: ${why}\nผู้สมัครจะได้รับแจ้งเหตุผลนี้`, ok: "ปฏิเสธสลิป", danger: true })) act(r.id, { status: "rejected", reason: why }); };
  const refund = async (r: Applicant) => { if (await ask({ title: "บันทึกว่าคืนเงินแล้ว?", body: `${fullName(r)} (${r.mb_code}) · ${fmt(r.amount)}\nสถานะจะเปลี่ยนเป็น "คืนเงินแล้ว" — โอนคืนจริงก่อนกด`, ok: "บันทึกคืนเงิน", danger: true })) act(r.id, { status: "refunded" }); };
  const revokeLinks = async (r: Applicant) => {
    if (!(await ask({ title: "ยกเลิกลิงก์เข้าโปรไฟล์ทั้งหมด?", body: `ลิงก์และคุกกี้เข้าโปรไฟล์ทุกอันที่เคยออกให้ ${fullName(r)} (${r.mb_code}) จะใช้ไม่ได้ทันที\nผู้สมัครต้องใช้ลิงก์ใหม่จากทีมงาน`, ok: "ยกเลิกลิงก์ทั้งหมด", danger: true }))) return;
    setPin(r.id);
    const res = await fetch(`/api/admin/applicants/${r.id}/link`, { method: "DELETE" }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { ok?: boolean } | null;
    fromRes(res, d?.ok ? "ยกเลิกลิงก์เข้าโปรไฟล์ทั้งหมดแล้ว" : "ยกเลิกลิงก์ไม่สำเร็จ", !!d?.ok);
  };
  const setListed = async (id: string, listed: boolean) => { const d = await patch(id, { listed }); say(d, listed ? "แสดงบนหน้าแรกแล้ว" : "ซ่อนจากหน้าแรกแล้ว"); };
  const setTier = async (id: string, tier: "top" | "silver") => { const d = await patch(id, { tier }); say(d, `ตั้งระดับ ${tier === "top" ? "TOP" : "Silver"} แล้ว`); };
  const assign = async (id: string, cohort: string | null) => { const d = await patch(id, { cohort }); say(d, `จัดเข้า${cohort ? cohortName(cohort) : " (ไม่ระบุกลุ่ม)"}`); };
  const setLine = async (id: string, v: boolean) => { const d = await patch(id, { line_joined: v }); say(d, v ? "บันทึก: เข้ากลุ่ม LINE แล้ว" : "บันทึก: ยังไม่เข้ากลุ่ม"); router.refresh(); };
  const copyLine = async (r: Applicant) => {
    const text = `สวัสดีค่ะคุณ${r.nickname} (${r.mb_code}) ลิงก์เข้ากลุ่ม LINE Mister Bamrungsuk: ${lineAddUrl()}`;
    try { await navigator.clipboard.writeText(text); flash("คัดลอกข้อความลิงก์กลุ่ม LINE แล้ว", { ok: true }); } catch { flash(text, { keep: true }); }
  };
  const exportCsv = () => {
    const head = ["รหัส MB", "ชื่อ", "ชื่อเล่น", "สายงาน", "ยอดชำระ", "สถานะ", "กลุ่ม", "กลุ่ม LINE", "ตรวจประวัติ", "KYC", "โทร", "LINE ID", "อีเมล", "สมัครเมื่อ"];
    const esc = (v: unknown) => csvCell(v); // กันสูตร Excel (= + - @ นำหน้า) แบบเดียวกับไฟล์ส่งออกฝั่งเซิร์ฟเวอร์
    const lines = shown.map((r) => [r.mb_code, fullName(r), r.nickname, r.package, r.amount, LABEL[r.status], cohortName(r.cohort), r.line_joined ? "เข้าแล้ว" : "ยังไม่เข้า", CRIMINAL[r.criminal_check ?? "pending"][0], r.kyc_status ?? "none", r.tel, r.line_id, r.email, thTime(r.created_at)].map(esc).join(","));
    const blob = new Blob(["﻿" + [head.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `applicants-${pkg}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 w-full flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-3 justify-between items-end">
          <div>
            <div className="text-[11px] tracking-[2.5px] text-[#f0c75a] font-semibold">APPLICANTS</div>
            <h1 className="mt-0.5 font-lux font-bold text-2xl">ผู้สมัคร · ตรวจข้อมูลและเอกสาร</h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPin(null); }} placeholder="ค้นหาชื่อ · รหัส MB · เบอร์ · อีเมล" aria-label="ค้นหาผู้สมัคร" className="h-10 w-64 max-w-full rounded-full border border-[rgba(240,200,90,.38)] bg-[#130e0e] px-4 text-[13px] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />
            <button onClick={exportCsv} className="h-10 px-4 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc] hover:text-[#f6efe4]">ส่งออกไฟล์ Excel / CSV</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="สถานะ">
          {FILTERS.map(([k, l]) => {
            const on = filter === k;
            const n = rows.filter((r) => (pkg === "all" || r.package === pkg) && match(r, k) && hit(r, t)).length;
            const hot = (k === "todo" || k === "fix") && n > 0;
            return <button key={k} role="tab" aria-selected={on} onClick={() => { setFilter(k); setPin(null); }} className="h-9 px-3.5 rounded-full border text-[12.5px] font-semibold flex items-center gap-1.5"
              style={{ borderColor: on ? GOLD : LINE_BD, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>{l}<span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] grid place-items-center" style={{ background: on ? "rgba(26,18,6,.15)" : hot ? (k === "todo" ? "#c8102e" : "rgba(239,68,68,.25)") : "rgba(240,200,90,.14)", color: on ? "#1a1206" : hot ? "#fff" : "#cdbfb3" }}>{n}</span></button>;
          })}
        </div>
        {note && <p className="rounded-xl border border-[rgba(240,200,90,.3)] px-3 py-2 text-xs text-[#cdbfb3]">{note}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PKG_TABS.map(([k, code, name]) => {
            const on = pkg === k;
            return (
              <button key={k} onClick={() => { setPkg(k); setPin(null); }} aria-pressed={on} className="px-4 py-3.5 rounded-2xl border-[1.5px] text-left flex flex-col gap-1"
                style={{ borderColor: on ? GOLD : LINE_BD, background: on ? "rgba(240,200,90,.14)" : "#241717", boxShadow: on ? "0 0 0 3px rgba(240,200,90,.15)" : "none" }}>
                <span className="flex justify-between items-center w-full"><span className="text-[11px] tracking-[1.5px] text-[#f0c75a] font-semibold">{code}</span><span className="text-xs text-[#cdbfb3]">{nOf(k)} คน</span></span>
                <span className="font-lux font-semibold text-[15px]">{name}</span>
                <span className="font-lux font-bold text-2xl text-[#ffd76a]">{fmt(sumOf(k, G) + sumOf(k, T))}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl border border-[rgba(240,200,90,.55)] overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(240,200,90,.1), #241717 60%)" }}>
          <div className="px-4 py-3"><div className="text-[11.5px] text-[#cdbfb3]">ค่าการันตี Branding · {PN[pkg]}</div><div className="font-lux font-bold text-xl">{fmt(sumOf(pkg, G))}</div><div className="text-[11.5px] text-[#9a8a85]">{fx(pkg, G)} · คืนเมื่อครบ 1 ปี</div></div>
          <div className="px-4 py-3 border-l border-[rgba(240,200,90,.25)]"><div className="text-[11.5px] text-[#cdbfb3]">ค่าอบรม · {PN[pkg]}</div><div className="font-lux font-bold text-xl">{fmt(sumOf(pkg, T))}</div><div className="text-[11.5px] text-[#9a8a85]">{fx(pkg, T)}</div></div>
          <div className="px-4 py-3 border-l border-[rgba(240,200,90,.25)] bg-[rgba(176,24,44,.12)]"><div className="text-[11.5px] text-[#cdbfb3]">ยอดรวม · {PN[pkg]}</div><div className="font-lux font-bold text-xl text-[#ffd76a]">{fmt(sumOf(pkg, G) + sumOf(pkg, T))}</div><div className="text-[11.5px] text-[#9a8a85]">{nOf(pkg)} คน</div></div>
          <div className="px-4 py-3 border-l border-[rgba(240,200,90,.25)]"><div className="text-[11.5px] text-[#cdbfb3]">ยังไม่เข้ากลุ่ม LINE</div><div className="font-lux font-bold text-xl text-[#eed58a]">{notLine} คน</div><div className="text-[11.5px] text-[#9a8a85]">โควตา {QUOTA} คน</div></div>
        </div>
        <FlashMsg msg={msg} />

        <div className="rounded-2xl border border-[rgba(240,200,90,.38)] overflow-x-auto text-[13px]">
          <div className="min-w-[740px]">
            <div className={`${GRID} px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs`}><span>รหัส MB</span><span>ชื่อ</span><span>สายงาน</span><span>สลิป · เอกสาร</span><span>กลุ่ม</span><span>กลุ่ม LINE</span><span>ตรวจประวัติ</span></div>
            {shown.map((r) => {
              const c = CRIMINAL[r.criminal_check ?? "pending"];
              return (
                <button key={r.id} onClick={() => pick(r.id)} className={`w-full ${GRID} px-3.5 py-[11px] border-t border-[rgba(240,200,90,.38)] text-left items-center`}
                  style={{ background: sel?.id === r.id ? "rgba(240,200,90,.16)" : "transparent" }}>
                  <span className="text-[#ffd76a]">{r.mb_code}</span>
                  <span className="truncate pr-2">{r.first_name} {r.last_name}</span>
                  <span className="text-[#d3c7bc] pr-1">{r.package} · {fmt(G(r.package))} + {fmt(T(r.package))}</span>
                  <span className="flex flex-col leading-tight text-[11.5px]"><span style={{ color: r.status === "verified" ? "#4ade80" : r.status === "pending_slip" ? "#eed58a" : "#fca5a5" }}>{LABEL[r.status]}</span><span style={{ color: KYC_LABEL[r.kyc_status ?? "none"][1] }}>{KYC_LABEL[r.kyc_status ?? "none"][0]}</span></span>
                  <span className="text-[#d3c7bc]">{cohortName(r.cohort)}</span>
                  <span style={{ color: r.line_joined ? "#4ade80" : "#eed58a" }}>{r.line_joined ? "✓ เข้ากลุ่มแล้ว" : "ยังไม่เข้า"}</span>
                  <span style={{ color: c[1] }}>{c[0]}</span>
                </button>
              );
            })}
            {!shown.length && <p className="border-t border-[rgba(240,200,90,.38)] px-4 py-12 text-center text-[#9a8a85]">ยังไม่มีผู้สมัครในหมวดนี้</p>}
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-[300px] shrink-0 p-[18px] rounded-[18px] border border-[rgba(245,210,110,.85)] bg-[#241717] flex flex-col gap-2.5 text-[13px] lg:sticky lg:top-[22px] lg:min-h-[calc(100dvh-44px)] max-h-[calc(100dvh-44px)] overflow-y-auto">
        {sel ? (
          <>
            {movedTo && (
              <p role="status" className="m-0 rounded-xl border border-[rgba(240,200,90,.55)] bg-[rgba(240,200,90,.1)] px-3 py-2 text-[12.5px] text-[#ffd76a] flex justify-between gap-2 items-center">
                <span>ย้ายไปแท็บ “{movedTo}” แล้ว · แผงนี้ยังเป็นคนเดิม</span>
                <button type="button" onClick={() => pick(shown[0]?.id ?? null)} className="shrink-0 underline text-[#d3c7bc]">คนถัดไป</button>
              </p>
            )}
            <div className="flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sel.photos?.[0] ? file(sel.photos[0]) : sel.docs.photo ? file(sel.docs.photo) : ""} alt="" className="w-14 h-14 rounded-[14px] object-cover bg-[#130e0e]" />
              <div className="min-w-0"><div className="font-lux font-semibold text-[17px] truncate">{sel.first_name} {sel.last_name}</div><div className="text-[#ffd76a] text-xs">{sel.mb_code} · {sel.package} · {fmt(G(sel.package))} + {fmt(T(sel.package))}</div></div>
            </div>
            <Progress r={sel} />
            {sel.invite && <p className="text-[12.5px] text-[#e8c472] m-0">✦ สมัครผ่านลิงก์เชิญ ({sel.invite}) · ไม่เก็บค่าการันตี · ยอดที่ต้องได้รับ = ค่าอบรม</p>}
            <div className="flex justify-between items-center gap-2"><span className="text-[#cdbfb3]">ระดับ (หลังอบรม)</span>
              <span className="flex gap-1">{(["silver", "top"] as const).map((t) => { const on = (sel.tier ?? "silver") === t; return <button key={t} onClick={() => setTier(sel.id, t)} aria-pressed={on} className="h-8 px-3 rounded-full border text-[12px] font-semibold" style={{ borderColor: on ? GOLD : LINE_BD, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>{t === "top" ? "TOP" : "Silver"}</button>; })}</span>
            </div>
            <div className="flex justify-between items-center gap-2"><span className="text-[#cdbfb3]">แสดงบนหน้าแรก (เปิดรับงาน)</span>
              <button type="button" role="switch" aria-checked={!!sel.listed} onClick={() => setListed(sel.id, !sel.listed)} className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: sel.listed ? GOLD : "rgba(243,234,217,0.18)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: sel.listed ? 21 : 3 }} /></button>
            </div>
            <Row k="อายุ · ชื่อเล่น" v={`${ageOf(sel.birthdate) ?? "-"} ปี · ${sel.nickname || "-"}`} />
            <Row k="พักอาศัยแถว" v={sel.address || "-"} />
            <Row k="พื้นที่สะดวก" v={(sel.areas ?? []).join(" · ") || "-"} />
            {sel.no_area && <Row k="ไม่สะดวก" v={sel.no_area} />}
            <Row k="เวลาว่าง" v={sel.availability ? `${(sel.availability.week_days ?? []).join(" ") || `${sel.availability.days ?? "-"} วัน`} · ${sel.availability.slots.join(" + ") || "-"} · ${sel.availability.hours_band ?? `${sel.availability.hours ?? "-"} ชม.`}` : "-"} />
            {sel.experience && <Row k="ประสบการณ์" v={sel.experience} />}
            {sel.intro && <Row k="หมายเหตุ" v={sel.intro} />}
            {sel.card && (sel.card.activities.length + sel.card.places.length + sel.card.skills.length > 0) && <>
              <Row k="กิจกรรมที่รับ" v={sel.card.activities.join(" · ") || "-"} />
              <Row k="สถานที่รับนัด" v={[...sel.card.places, ...sel.card.partner_spas].join(" · ") || "-"} />
              <Row k="สกิลพิเศษ" v={sel.card.skills.map((s) => SKILL_TH[s] ?? s).join(" · ") || "-"} />
            </>}
            <Row k="ยอดชำระ" v={`${fmt(sel.amount)} · ${LABEL[sel.status]}`} />
            <div className="h-px bg-[rgba(240,200,90,.38)]" />
            <div className="text-[#cdbfb3] text-xs">จัดกลุ่มอบรม</div>
            <div className="grid grid-cols-3 gap-1.5">
              {cohorts.map((c) => {
                const on = sel.cohort === c.key;
                return <button key={c.key} onClick={() => assign(sel.id, on ? null : c.key)} className="h-[38px] rounded-[10px] border text-[12.5px] font-semibold truncate px-1"
                  style={{ borderColor: on ? GOLD : LINE_BD, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>{c.name}</button>;
              })}
            </div>
            <button onClick={() => setLine(sel.id, !sel.line_joined)} role="switch" aria-checked={!!sel.line_joined} className="flex justify-between items-center h-11 px-3 rounded-xl border border-[rgba(240,200,90,.38)] bg-[#130e0e]">
              เข้ากลุ่ม LINE แล้ว
              <span className="w-[42px] h-6 rounded-full relative" style={{ background: sel.line_joined ? "#06c755" : LINE_BD }}><span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: sel.line_joined ? 21 : 3 }} /></span>
            </button>
            <div className="flex flex-wrap gap-1.5">
              {sel.status !== "verified" && <button onClick={() => verifySlip(sel)} className="btn-red-lux h-9 px-3.5 rounded-full text-[12.5px]">ยืนยันสลิป</button>}
              {sel.status === "pending_slip" && <button onClick={() => setRejecting((v) => !v)} aria-expanded={rejecting} className="h-9 px-3.5 rounded-full border border-[rgba(201,40,61,.6)] text-[#fecaca] text-[12.5px]">ปฏิเสธ</button>}
              {sel.status === "verified" && <button onClick={() => refund(sel)} className="h-9 px-3.5 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc] text-[12.5px]">บันทึกคืนเงิน</button>}
              {!sel.sheet_synced && <button onClick={() => act(sel.id, { sync: true })} className="h-9 px-3.5 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc] text-[12.5px]">sync ชีต</button>}
            </div>
            {rejecting && sel.status === "pending_slip" && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-[rgba(201,40,61,.55)] bg-[rgba(176,24,44,.1)] p-2.5">
                <label className="text-[12px] text-[#cdbfb3]" htmlFor="slip-reason">เหตุผลที่ปฏิเสธสลิป (ผู้สมัครเห็น)</label>
                <div className="flex flex-wrap gap-1">{["ยอดไม่ตรง", "สลิปไม่ชัด", "ไม่พบรายการโอน", "โอนเข้าบัญชีอื่น"].map((p) => <button key={p} type="button" onClick={() => setReason(p)} className="h-7 px-2.5 rounded-full border text-[11.5px]" style={{ borderColor: reason === p ? GOLD : "rgba(240,200,90,.3)", color: reason === p ? GOLD : "#cdbfb3" }}>{p}</button>)}</div>
                <input id="slip-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="เช่น ยอดโอนขาด ฿500" className="h-9 rounded-lg border border-[rgba(240,200,90,.38)] bg-[#130e0e] px-2.5 text-[12.5px] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />
                <button type="button" disabled={!reason.trim()} onClick={() => rejectSlip(sel)} className="h-9 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.3)] text-[#fecaca] text-[12.5px] font-semibold disabled:opacity-40">ปฏิเสธสลิป · แจ้งผู้สมัคร</button>
              </div>
            )}
            <button onClick={() => copyLine(sel)} className="mt-auto h-[46px] rounded-full bg-[#06c755] text-white font-semibold">คัดลอกลิงก์กลุ่ม LINE</button>
            <button onClick={() => setShowDocs((v) => !v)} aria-expanded={showDocs} className="h-11 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc]">{showDocs ? "ซ่อนสลิปและเอกสาร" : "ดูสลิปและเอกสาร"}</button>

            {showDocs && (
              <>
                <div className="h-px bg-[rgba(240,200,90,.38)]" />
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
                  <dt className="text-[#cdbfb3]">สายงาน</dt><dd>{sel.package} · {PACKAGES[sel.package].name}</dd>
                  {feeBreakdown(sel.package, !!sel.invite).map((x) => <Fragment key={x.name}><dt className="text-[#cdbfb3]">{x.name}</dt><dd>{fmt(x.amount)}</dd></Fragment>)}
                  <dt className="text-[#cdbfb3]">ชำระโดย</dt><dd>{sel.payment_method === "qr" ? "QR" : "โอนบัญชี"}</dd>
                  <dt className="text-[#cdbfb3]">Slip2Go</dt>
                  <dd>{sel.slip_check ? <span style={{ color: SLIP_LABEL[sel.slip_check.verdict][1] }}>{SLIP_LABEL[sel.slip_check.verdict][0]} · {sel.slip_check.amount != null ? fmt(sel.slip_check.amount) : "-"}</span> : <span className="text-[#9a8a85]">ไม่ได้ตรวจ</span>}</dd>
                  <dt className="text-[#cdbfb3]">โทร</dt><dd>{sel.tel}</dd>
                  <dt className="text-[#cdbfb3]">LINE</dt><dd className="break-all">{sel.line_id || "-"}</dd>
                  <dt className="text-[#cdbfb3]">สมัครเมื่อ</dt><dd>{thTime(sel.created_at)}</dd>
                </dl>
                {sel.bank_consents && <p className="text-[11.5px] text-[#cdbfb3]">ยินยอมข้อกำหนด · PDPA · แสดงโปรไฟล์ เมื่อ {thTime(sel.bank_consents.at)}</p>}
                {sel.delete_requested_at && <p className="text-[12.5px] rounded-lg px-3 py-2 text-[#ff8a9a] bg-[rgba(255,138,154,0.1)]">⚠ ผู้สมัครขอลบบัญชีและข้อมูล (PDPA) เมื่อ {thTime(sel.delete_requested_at)} · ติดต่อยืนยันภายใน 30 วัน</p>}
                {sel.post && <p className="text-[12.5px] text-[#cdbfb3]">ประกาศ “วันนี้ว่าง” {sel.post.open ? "(เปิด)" : "(ปิดแล้ว)"}: {sel.post.text} · {sel.post.time} · {sel.post.zone}</p>}
                {(sel.photos?.length ?? 0) > 0 && <>
                  <div className="text-[#cdbfb3] text-xs">รูปโปรไฟล์ {sel.photos!.length}/9 (รูปแรก = รูปหลัก)</div>
                  <div className="grid grid-cols-3 gap-1.5">{sel.photos!.map((p, i) => <a key={p} href={file(p)} target="_blank" rel="noopener noreferrer" className="block text-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={file(p)} alt={`รูปโปรไฟล์ ${i + 1}`} className="w-full aspect-[3/4] rounded-lg object-cover bg-[#130e0e]" /></a>)}</div>
                </>}
                <div className="grid grid-cols-3 gap-1.5">
                  {DOCS.filter(([k]) => sel.docs[k]).map(([k, l]) => (
                    <a key={k} href={file(sel.docs[k]!)} target="_blank" rel="noopener noreferrer" className="block text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file(sel.docs[k]!)} alt={l} className="w-full aspect-[3/4] rounded-lg object-cover bg-[#130e0e]" />
                      <span className="text-[11.5px] text-[#cdbfb3]">{l}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
            {(
              <>
                <div className="h-px bg-[rgba(240,200,90,.38)]" />
                <KycPanel key={sel.id} row={sel} canDecide={canKyc}onSaved={(row) => { setPin(row.id); setOpen(row.id); setRows((rs) => rs.map((x) => (x.id === row.id ? row : x))); }} />
                <button type="button" onClick={() => revokeLinks(sel)} className="h-10 rounded-full border border-[rgba(201,40,61,.6)] text-[#fecaca] text-[12.5px]">ยกเลิกลิงก์เข้าโปรไฟล์ทั้งหมด</button>
              </>
            )}
          </>
        ) : <p className="py-10 text-center text-[#9a8a85]">เลือกผู้สมัครจากตารางเพื่อดูรายละเอียด</p>}
      </aside>
      {confirmUi}
    </div>
  );
}

const SKILL_TH: Record<string, string> = { massage: "นวดผ่อนคลาย", photo: "ถ่ายรูปเก่ง", eng: "พูดอังกฤษได้", drive: "ขับรถพาเที่ยว", fit: "เต้น / ฟิตเนสโค้ช", cook: "ทำอาหาร", music: "เล่นดนตรี / ร้องเพลง", guide: "ไกด์ท้องถิ่น" };

/** ความคืบหน้าใบสมัคร (ตรงกับหน้า "โปรไฟล์ของฉัน" ของผู้สมัคร) */
function Progress({ r }: { r: Applicant }) {
  const done = new Set(r.form_done ?? []);
  const kyc = r.kyc_status ?? "none";
  const steps: [string, boolean][] = [["ชำระ", r.status === "verified"], ["ข้อมูล", done.has(1)], ["วันเวลา", done.has(2)], ["เอกสาร", kyc === "approved"], ["สัญญา", !!r.contract_accepted_at]];
  const nFix = kyc === "rejected" ? Object.keys(r.kyc_reason ?? {}).length : 0;
  return (
    <div className="flex flex-wrap gap-1">
      {steps.map(([t, ok]) => <span key={t} className="text-[11.5px] px-2 py-0.5 rounded-full border" style={{ borderColor: ok ? "rgba(74,222,128,.5)" : LINE_BD, color: ok ? "#4ade80" : "#9a8a85" }}>{ok ? "✓ " : ""}{t}</span>)}
      {nFix > 0 && <span className="text-[11.5px] px-2 py-0.5 rounded-full border border-[rgba(239,68,68,.6)] text-[#fca5a5]">! รอแก้ {nFix}</span>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-[#cdbfb3] shrink-0">{k}</span><span className="text-right">{v}</span></div>;
}
