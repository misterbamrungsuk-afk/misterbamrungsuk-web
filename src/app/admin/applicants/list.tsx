"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LINE_GROUP_LIST, PACKAGES, QUOTA, feeBreakdown, ptLineGroupKey, type PackageKey } from "@/lib/join/config";
import type { Applicant as ApplicantBase, ApplicantStatus, CriminalCheck, Extra } from "@/lib/join/store";

/** แถวที่หน้า page ส่งมา = คอลัมน์ + docs.extra (extraOf) */
type Applicant = ApplicantBase & Extra;
import { KYC_LABEL, KycPanel } from "../kyc/kyc-panel";
import { FlashMsg, useConfirm, useFlash } from "../confirm";
import { csvCell } from "@/lib/csv";
import { canAccess, type AdminRole } from "@/lib/admin-auth";

// ตามบอร์ด AdminApplicants.dc.html (1280px) — ยอดรวมนับเฉพาะผู้สมัครที่ชำระแล้ว (verified)
// ธีมสว่าง (canvas "Admin Light Theme" · 25 ต.ค. 2569): การ์ดผู้สมัคร 2 คอลัมน์ + แผงรายละเอียดขวา
const GOLD = "#c9a24a";
const LINE_BD = "#e7ddcf";
const INK = "#2a1d1a", MUTED = "#8a7b75";
/** ป้ายสถานะเล็กบนการ์ด: ok = เขียว · warn = ส้ม · bad = แดง · info = เทา */
const TONE = { ok: ["#2f7a46", "#e4f3e8"], warn: ["#c2610f", "#fdebd9"], bad: ["#b42335", "#fde8eb"], info: ["#6b5d58", "#f1ebe3"] } as const;
const Tag = ({ t, children }: { t: keyof typeof TONE; children: React.ReactNode }) => <span className="inline-flex items-center h-7 px-2.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap" style={{ color: TONE[t][0], background: TONE[t][1] }}>{children}</span>;
const KYC_DOCS = [["id_card", "บัตรประชาชน"], ["selfie", "รูปถ่ายคู่บัตร"], ["id_copy", "สำเนาบัตรเซ็นรับรอง"]] as const;
const nDocs = (r: { docs: Partial<Record<(typeof KYC_DOCS)[number][0], string>> }) => KYC_DOCS.filter(([k]) => r.docs[k]).length;
const thDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const thDateTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const AVA_BG: Record<string, string> = { secret: "#ece6fb", invite: "#f6ecd2", paid: "#e4f3e8", tom: "#fbe4ec" };
const CRIMINAL: Record<CriminalCheck, [string, string]> = { pending: ["รอตรวจ", "#8a7b75"], passed: ["ผ่าน", "#2f7a46"], failed: ["ไม่ผ่าน", "#b42335"] };
const LABEL: Record<ApplicantStatus, string> = { pending_slip: "รอตรวจสลิป", verified: "ชำระแล้ว", rejected: "ปฏิเสธ", refunded: "คืนเงินแล้ว" };
const SLIP_LABEL: Record<string, [string, string]> = { ok: ["✓ ยอดตรง", "#2f7a46"], check: ["ยอดตรง · ต้องเทียบบัญชีเอง", "#c2610f"], acct: ["โอนเข้าบัญชีอื่น", "#b42335"], amt: ["ยอดไม่ตรง", "#b42335"], dup: ["สลิปซ้ำ", "#b42335"], fake: ["ไม่พบรายการ", "#b42335"], error: ["ตรวจไม่สำเร็จ", "#c2610f"] };
const DOCS = [["photo", "รูปหน้าตรง"], ["other_doc", "รูปเต็มตัว"], ["slip", "สลิป"], ["id_card", "บัตรประชาชน"], ["id_copy", "สำเนาบัตรเซ็นรับรอง"], ["selfie", "เซลฟีถือบัตร"], ["bankbook", "สมุดบัญชี"], ["cert_doc", "ใบรับรองนวด"]] as const;
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const fmt = (n: number) => "฿" + n.toLocaleString("en-US");
const fullName = (r: Applicant) => `${r.title}${r.first_name} ${r.last_name}`;
const thTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const ageOf = (b: string | null) => { if (!b) return null; const d = new Date(b); if (isNaN(+d)) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

type Pkg = "all" | PackageKey;
type Filter = ApplicantStatus | "all" | "todo" | "fix" | "inactive" | "unlisted" | "nodoc" | "noline";
/** รอแอดมิน = สลิปยังไม่ตรวจ หรือเอกสารส่งมารอตรวจ */
const isTodo = (r: Applicant) => r.status === "pending_slip" || r.kyc_status === "submitted";
const match = (r: Applicant, f: Filter) => f === "all" ? true : f === "unlisted" ? !r.listed || !!r.inactive : f === "nodoc" ? r.kyc_status !== "approved" : f === "noline" ? !r.line_joined : f === "inactive" ? !!r.inactive : f === "todo" ? isTodo(r) : f === "fix" ? r.kyc_status === "rejected" : r.status === f;
const FILTERS: [Filter, string][] = [["todo", "รอตรวจ"], ["fix", "ตีกลับ · รอแก้"], ["verified", "ชำระแล้ว"], ["pending_slip", "รอตรวจสลิป"], ["rejected", "ปฏิเสธ"], ["refunded", "คืนเงินแล้ว"], ["inactive", "Non Active"], ["all", "ทั้งหมด"]];
/** ปุ่มกรองลัดบนมือถือ (บอส 11 พ.ย. 2569) */
const QUICK: [Filter, string][] = [["all", "ทั้งหมด"], ["todo", "รอตรวจ"], ["unlisted", "ยังไม่ขึ้นหน้าแรก"], ["nodoc", "ขาดเอกสาร"], ["noline", "ไม่เข้า LINE"], ["inactive", "Non Active"]];
const filterLabel = (f: Filter) => (FILTERS.find(([k]) => k === f) ?? QUICK.find(([k]) => k === f))?.[1];
const PKG_TABS: [Pkg, string, string][] = [["all", "ทั้งหมด", "ผู้สมัครทุกสาย"], ["A", "สาย A", PACKAGES.A.name], ["B", "สาย B", PACKAGES.B.name]];
/** สมัครมาแบบไหน (บอสขอ 24 ต.ค. 2569 · ดูง่าย ป้ายเดียวต่อคน) — จ่ายเงิน / คำเชิญ TOP / Secret / สมัครฟรี (ป้ายบอกหมวดจริง หนุ่มหล่อ/ทอมหล่อ) */
type Ch = "paid" | "invite" | "secret" | "tom";
const chOf = (r: Applicant): Ch => (r.tier === "secret" ? "secret" : r.invite ? "invite" : r.amount ? "paid" : "tom");
const CH: Record<Ch, { label: string; c: string; bg: string }> = {
  paid: { label: "จ่ายเงิน", c: "#2f7a46", bg: "#e4f3e8" },
  invite: { label: "✦ คำเชิญ TOP", c: "#8a6516", bg: "#f6ecd2" },
  secret: { label: "✦ Secret", c: "#5b3fb0", bg: "#ece6fb" },
  tom: { label: "สมัครฟรี", c: "#c0577e", bg: "#fbe4ec" },
};
const ChPill = ({ r }: { r: Applicant }) => { const k = chOf(r), t = k === "tom" ? { ...CH.tom, label: `${r.group === "tom" ? "ทอมหล่อ" : "หนุ่มหล่อ"} · ฟรี`, ...(r.group === "tom" ? {} : { c: "#3b5bb5", bg: "#e8eefc" }) } : CH[k]; return <span data-ch={k} className="inline-flex items-center h-7 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap" style={{ color: t.c, background: t.bg }}>{t.label}{k === "paid" ? ` ${fmt(r.amount)}` : ""}</span>; };
type Grp = "all" | "man" | "tom";
const GRP_TABS: [Grp, string][] = [["all", "ทั้งหมด"], ["man", "หนุ่มหล่อ"], ["tom", "ทอมหล่อ"]];
const inGrp = (g: Grp) => (r: Applicant) => g === "all" || (g === "tom") === (r.group === "tom");

/** กลุ่ม LINE ที่ผู้สมัครคนนี้ต้องเข้า (Secret / หนุ่มหล่อ / ทอมหล่อ) */
const lineGroupOf = (r: Applicant) => LINE_GROUP_LIST.find((g) => g.key === ptLineGroupKey(r))!;

/** ค้นหาจาก ชื่อ ชื่อเล่น รหัส MB เบอร์ อีเมล LINE */
const hit = (r: Applicant, t: string) => !t || [r.first_name, r.last_name, `${r.first_name} ${r.last_name}`, r.nickname, r.mb_code, r.tel, r.tel?.replace(/\D/g, ""), r.email, r.line_id].some((x) => !!x && x.toLowerCase().includes(t));

export function ApplicantList({ initial, cohorts, initialPkg, note, role, initialQ = "" }: { initial: Applicant[]; cohorts: { key: string; name: string }[]; initialPkg: Pkg; note: string; role: AdminRole; initialQ?: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [pkg, setPkg] = useState<Pkg>(initialPkg);
  // แยกหมวด หนุ่มหล่อ / ทอมหล่อ (บอสสั่ง 22 ต.ค. 2569) — ตัวเลข การ์ดยอด และรายการทั้งหมดนับตามหมวดที่เลือก
  const [grp, setGrp] = useState<Grp>("all");
  const [ch, setCh] = useState<Ch | "all">("all");
  // ?q= (เช่น กดจากหน้ายอดเงินเข้า) → เปิดที่ "ทั้งหมด" ให้เจอคนนั้นแน่นอน
  const [filter, setFilter] = useState<Filter>(() => initialQ ? "all" : initial.some(isTodo) ? "todo" : "all");
  const [showDocs, setShowDocs] = useState(false);
  const { msg, flash, fromRes } = useFlash();
  const [confirmUi, ask] = useConfirm();
  const [q, setQ] = useState(initialQ);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  // ตัดสิน KYC ได้เฉพาะบทบาทที่เข้า /admin/kyc ได้ (API ก็ปฏิเสธ) — ไม่แสดงปุ่มที่กดแล้วโดนปฏิเสธ
  const canKyc = canAccess(role, "/admin/kyc");
  const cohortName = (k?: string | null) => cohorts.find((c) => c.key === k)?.name ?? "—";

  const gRows = rows.filter(inGrp(grp)).filter((r) => ch === "all" || chOf(r) === ch);
  const paid = gRows.filter((r) => r.status === "verified");
  const nOf = (k: Pkg, list = paid) => list.filter((r) => k === "all" || r.package === k).length;
  const nA = nOf("A"), nB = nOf("B");
  // ยอดจริงที่ผู้สมัครจ่าย (amount) — ใบเก่าก่อนเปลี่ยนราคา/สายเชิญนับตามที่จ่ายจริง
  const inPkg = (k: Pkg) => (r: Applicant) => k === "all" || r.package === k;
  const sumAmt = (list: Applicant[]) => list.reduce((a, r) => a + (r.amount || 0), 0);
  const waiting = gRows.filter((r) => r.status === "pending_slip");
  const notLine = paid.filter((r) => !r.line_joined).length;

  const t = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => inGrp(grp)(r) && (ch === "all" || chOf(r) === ch) && (pkg === "all" || r.package === pkg) && match(r, filter) && hit(r, t)), [rows, grp, ch, pkg, filter, t]);
  const [open, setOpen] = useState<string | null>(shown[0]?.id ?? null);
  // pin = คนที่เพิ่งกดทำรายการ — ถ้าย้ายออกจากแท็บปัจจุบัน แผงยังค้างที่คนเดิม (ไม่สลับไปคนอื่นเงียบ ๆ แล้วกดผิดคน)
  const [pin, setPin] = useState<string | null>(null);
  const inShown = shown.find((r) => r.id === open);
  const sel = (inShown ?? (pin && pin === open ? rows.find((r) => r.id === pin) : undefined) ?? shown[0]) ?? null;
  const movedTo = sel && !inShown && sel.id === pin ? FILTERS.find(([k]) => k !== "all" && match(sel, k))?.[1] ?? "ทั้งหมด" : null;
  const pick = (id: string | null) => { setOpen(id); setPin(null); setShowDocs(false); setRejecting(false); setReason(""); };
  // มือถือ: แตะการ์ด = เปิดแผ่นแก้ไขจากด้านล่าง (จอใหญ่ยังเป็นแผงขวาเหมือนเดิม)
  const [sheet, setSheet] = useState(false);
  // จอมือถือ: ไม่ไฮไลต์การ์ดที่เลือก (ใช้แผ่นแก้ไขแทน)
  const [sheetish, setSheetish] = useState(false);
  useEffect(() => { const m = window.matchMedia("(max-width: 767px)"); const f = () => setSheetish(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const openCard = (id: string) => { pick(id); if (window.matchMedia("(max-width: 767px)").matches) setSheet(true); };
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(false); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [sheet]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setPin(id); setOpen(id);
    const res = await fetch(`/api/admin/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as { ok?: boolean; row?: Applicant; error?: string };
    if (data.row) setRows((r) => r.map((x) => (x.id === id ? data.row! : x)));
    return { ...data, res };
  };
  /** แจ้งผล: 401 = เซสชันหมดอายุ · ไม่สำเร็จใช้ข้อความจาก API */
  const say = (d: { ok?: boolean; error?: string; res: Response | null }, okText: string, failText = "บันทึกไม่สำเร็จ") => fromRes(d.res, d.ok ? okText : d.error ?? failText, !!d.ok);
  // ร่างการแก้ในแผง "จัดการ" (สายงาน · รูปบนเว็บ · ความแรงเบลอ · หมวด) — กด "บันทึก" ถึงจะส่ง
  type Dr = { package?: "A" | "B"; photo_privacy?: "show" | "face" | "whole"; blur_level?: 1 | 2 | 3; group?: "man" | "tom" };
  const [dr, setDr] = useState<Dr>({});
  const [drBusy, setDrBusy] = useState(false);
  const selId = sel?.id;
  useEffect(() => { setDr({}); }, [selId]);
  const privOf = (r: Applicant) => (r.disclose === "no" ? (r.blur_mode === "whole" ? "whole" : "face") : "show");
  const drDiff = (r: Applicant): Dr => {
    const o: Dr = {};
    if (dr.group && dr.group !== (r.group === "tom" ? "tom" : "man")) o.group = dr.group;
    if (dr.package && dr.package !== r.package) o.package = dr.package;
    if (dr.photo_privacy && dr.photo_privacy !== privOf(r)) o.photo_privacy = dr.photo_privacy;
    if (dr.blur_level && dr.blur_level !== (r.blur_level ?? 2)) o.blur_level = dr.blur_level;
    return o;
  };
  const drDirty = (r: Applicant) => Object.keys(drDiff(r)).length > 0;
  const saveDr = async (r: Applicant) => {
    const ch = drDiff(r);
    setDrBusy(true);
    let last: Awaited<ReturnType<typeof patch>> | null = null;
    for (const [k, v] of Object.entries(ch)) { last = await patch(r.id, { [k]: v }); if (!last.ok) break; }
    setDrBusy(false);
    if (last) say(last, "บันทึกการแก้ไขแล้ว");
    if (last?.ok) { setDr({}); router.refresh(); }
  };
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
  const setTier = async (id: string, tier: "top" | "silver" | "secret") => { const d = await patch(id, { tier }); say(d, `ตั้งระดับ ${tier === "secret" ? "Secret" : tier === "top" ? "TOP" : "Silver"} แล้ว`); };
  // Active / Non Active (ลาออก) — เหตุผล + วันที่ลาออก
  const [resign, setResign] = useState<{ id: string; reason: string; at: string } | null>(null);
  const setActive = async (id: string, active: boolean, reason = "", at = "") => { const d = await patch(id, active ? { active: true } : { active: false, resign_reason: reason, resigned_at: at }); say(d, active ? "ตั้งเป็น Active แล้ว" : "ตั้งเป็น Non Active แล้ว · ซ่อนจากหน้าแรก"); if (d.ok) setResign(null); };
  // ราคา Secret (3 ชม.) รายคน — ว่าง/0 = ใช้ราคา TOP
  const [spDraft, setSpDraft] = useState<Record<string, string>>({});
  const saveSecretPrice = async (id: string) => { const v = (spDraft[id] ?? "").replace(/\D/g, ""); const d = await patch(id, { tier: "secret", secret_price: v ? Number(v) : null }); say(d, v ? `ตั้งราคา Secret ฿${Number(v).toLocaleString("en-US")} / 3 ชม. แล้ว` : "ล้างราคา Secret แล้ว · ยังไม่แสดงบนหน้าแรกจนกว่าจะตั้งราคา"); };
  const assign = async (id: string, cohort: string | null) => { const d = await patch(id, { cohort }); say(d, `จัดเข้า${cohort ? cohortName(cohort) : " (ไม่ระบุกลุ่ม)"}`); };
  const setLine = async (id: string, v: boolean) => { const d = await patch(id, { line_joined: v }); say(d, v ? "บันทึก: เข้ากลุ่ม LINE แล้ว" : "บันทึก: ยังไม่เข้ากลุ่ม"); router.refresh(); };
  const copyLine = async (r: Applicant) => {
    const g = lineGroupOf(r);
    const text = `สวัสดีค่ะคุณ${r.nickname} (${r.mb_code}) ลิงก์เข้ากลุ่ม LINE ${g.label}: ${g.url}`;
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

  const feeTag = (r: Applicant) => !r.amount ? <Tag t="ok">✓ ไม่มีค่าสมัคร</Tag> : r.status === "verified" ? <Tag t="ok">✓ {fmt(r.amount)} · สลิป</Tag> : r.status === "pending_slip" ? <Tag t="warn">! รอตรวจสลิป</Tag> : r.status === "refunded" ? <Tag t="info">คืนเงินแล้ว</Tag> : <Tag t="bad">✕ สลิปไม่ผ่าน</Tag>;
  const docTag = (r: Applicant) => { const n = nDocs(r); return r.kyc_status === "approved" ? <Tag t="ok">✓ เอกสาร {n}/3</Tag> : r.kyc_status === "rejected" ? <Tag t="bad">! เอกสารตีกลับ</Tag> : <Tag t="warn">! เอกสาร {n}/3</Tag>; };
  const avatar = (r: Applicant) => r.photos?.[0] ? file(r.photos[0]) : r.docs.photo ? file(r.docs.photo) : "";
  const SubChip = ({ on, onClick, children, n, tone = "gold" }: { on: boolean; onClick: () => void; children: React.ReactNode; n?: number; tone?: "gold" | "red" }) => (
    <button role="tab" aria-selected={on} onClick={onClick} className="shrink-0 whitespace-nowrap h-8 px-3 rounded-full text-[12.5px] font-semibold flex items-center gap-1.5 border transition"
      style={on ? { background: INK, borderColor: INK, color: "#fff" } : { background: "#fff", borderColor: LINE_BD, color: "#5c4f48" }}>
      {children}{n != null && <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] grid place-items-center" style={{ background: on ? "rgba(255,255,255,.18)" : tone === "red" && n ? "#b42335" : "#f1ebe3", color: on ? "#fff" : tone === "red" && n ? "#fff" : MUTED }}>{n}</span>}
    </button>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start" style={{ color: INK }}>
      <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div className="hidden md:block">
            <h1 className="hidden md:block font-lux font-bold text-[34px] leading-tight m-0">ผู้สมัคร</h1>
            <p className="hidden md:block m-0 mt-1 text-[14px]" style={{ color: MUTED }}>แตะที่การ์ดเพื่อดูรายละเอียด</p>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPin(null); }} placeholder="ค้นหาชื่อ หรือรหัส MB" aria-label="ค้นหาผู้สมัคร" className="h-11 md:h-12 flex-1 min-w-0 md:flex-none md:w-72 max-w-full rounded-2xl bg-white px-4 text-[14px] outline-none border border-transparent focus:border-[#c9a24a] shadow-[0_2px_10px_rgba(90,60,20,.06)]" style={{ color: INK }} />
            <button onClick={exportCsv} aria-label="ส่งออกไฟล์ Excel / CSV" title="ส่งออกไฟล์ Excel / CSV" className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white grid place-items-center shadow-[0_2px_10px_rgba(90,60,20,.06)] hover:text-[#a8781f]" style={{ color: INK }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex md:inline-flex w-full md:w-auto gap-1 rounded-[14px] md:rounded-[18px] p-1 md:p-1.5" role="tablist" aria-label="หมวด" style={{ background: "#ece3d6" }}>
            {GRP_TABS.map(([k, l]) => {
              const on = grp === k;
              const n = rows.filter(inGrp(k)).length;
              return <button key={k} role="tab" aria-selected={on} data-admin-group={k} onClick={() => { setGrp(k); setPin(null); }} className="flex-1 md:flex-none justify-center h-9 md:h-11 px-2 md:px-5 rounded-[11px] md:rounded-[14px] text-[13.5px] md:text-[15px] font-bold flex items-center gap-1.5 transition"
                style={on ? { background: "#fff", color: INK, boxShadow: "0 2px 8px rgba(90,60,20,.1)" } : { color: "#8a6516" }}>{l} <span className="font-semibold" style={{ color: on ? INK : "#8a6516" }}>{n}</span></button>;
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1 text-[12.5px] md:text-[14px]" style={{ color: "#5c4f48" }}>
            <span>ค่าสมัครรวม <b className="text-[15px]" style={{ color: "#8a6516" }}>{fmt(sumAmt(paid.filter(inPkg(pkg))))}</b></span>
            <span>ยังไม่เข้ากลุ่ม LINE <b className="text-[15px]" style={{ color: "#c2610f" }}>{notLine} คน</b></span>
          </div>
        </div>

        <div data-quick-filter className="md:hidden flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist" aria-label="กรองลัด">
          {QUICK.map(([k, l]) => <span key={k} className="contents"><SubChip on={filter === k} tone={k === "all" ? "gold" : "red"} n={gRows.filter((r) => (pkg === "all" || r.package === pkg) && match(r, k) && hit(r, t)).length} onClick={() => { setFilter(k); setPin(null); }}>{l}</SubChip></span>)}
        </div>
        <details className="group rounded-2xl bg-white/70 border px-4 py-2.5" style={{ borderColor: LINE_BD }}>
          <summary className="cursor-pointer list-none flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#5c4f48" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
            ตัวกรอง · สถานะ {filterLabel(filter)}{ch !== "all" ? ` · ${CH[ch].label}` : ""}{pkg !== "all" ? ` · สาย ${pkg}` : ""}
            <span className="ml-auto text-[12px] font-normal" style={{ color: MUTED }}>รอตรวจ {gRows.filter((r) => isTodo(r)).length} · รอสลิป {fmt(sumAmt(waiting.filter(inPkg(pkg))))}</span>
          </summary>
          <div className="flex flex-col gap-2.5 pt-3 pb-1">
            <div className="flex flex-wrap gap-1.5 items-center" role="tablist" aria-label="สถานะ">
              <span className="text-[12px] w-16" style={{ color: MUTED }}>สถานะ</span>
              {FILTERS.map(([k, l]) => <SubChip key={k} on={filter === k} tone={k === "todo" || k === "fix" ? "red" : "gold"} n={gRows.filter((r) => (pkg === "all" || r.package === pkg) && match(r, k) && hit(r, t)).length} onClick={() => { setFilter(k); setPin(null); }}>{l}</SubChip>)}
            </div>
            <div data-ch-filter className="flex flex-wrap gap-1.5 items-center" role="tablist" aria-label="สมัครแบบ">
              <span className="text-[12px] w-16" style={{ color: MUTED }}>สมัครแบบ</span>
              {(["all", ...(Object.keys(CH) as Ch[])] as const).map((k) => <span key={k} data-ch-tab={k} className="contents"><SubChip on={ch === k} n={rows.filter(inGrp(grp)).filter((r) => k === "all" || chOf(r) === k).length} onClick={() => { setCh(k as Ch | "all"); setPin(null); }}>{k === "all" ? "ทั้งหมด" : CH[k as Ch].label}</SubChip></span>)}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center" role="tablist" aria-label="สายงาน">
              <span className="text-[12px] w-16" style={{ color: MUTED }}>สายงาน</span>
              {PKG_TABS.map(([k]) => <SubChip key={k} on={pkg === k} n={nOf(k, gRows)} onClick={() => { setPkg(k); setPin(null); }}>{k === "all" ? "ทุกสาย" : k === "A" ? "A · กินเที่ยว" : "B · พร้อมนวด"}</SubChip>)}
            </div>
            <p className="m-0 text-[12px]" style={{ color: MUTED }}>สาย A {nA} · B {nB} คน (ชำระแล้ว) · ค่าสมัคร A {fmt(PACKAGES.A.price)} · B {fmt(PACKAGES.B.price)} · โควตา {QUOTA} คน</p>
          </div>
        </details>
        {note && <p className="m-0 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: LINE_BD, color: "#6b5d58" }}>{note}</p>}
        <FlashMsg msg={msg} />

        <div className="grid md:grid-cols-2 gap-2 md:gap-4">
          {shown.map((r) => {
            const on = sel?.id === r.id;
            const off = !!r.inactive;
            const img = avatar(r);
            return (
              <button key={r.id} onClick={() => openCard(r.id)} data-applicant-card className="text-left rounded-[14px] md:rounded-[22px] bg-white p-2.5 md:p-4 flex flex-col gap-3.5 transition md:hover:-translate-y-0.5"
                style={{ border: on && !sheetish ? "2.5px solid #c9a24a" : "2.5px solid transparent", boxShadow: on && !sheetish ? "0 10px 28px rgba(168,120,31,.18)" : "0 4px 18px rgba(90,60,20,.06)", opacity: off ? 0.72 : 1 }}>
                {/* มือถือ: แถวเล็ก (รูป · ชื่อ · ป้ายสั้น) — จอเดียวเห็นหลายคน */}
                <span data-card-compact className="md:hidden flex gap-2.5 items-center">
                  <span className="relative shrink-0 w-11 h-11 rounded-[11px] overflow-hidden grid place-items-center" style={{ background: AVA_BG[chOf(r)] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" style={{ filter: off ? "grayscale(1)" : undefined }} /> : <span className="font-lux font-bold text-[17px]" style={{ color: CH[chOf(r)].c }}>{(r.nickname || r.first_name || "?").slice(0, 1)}</span>}
                    <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white" style={{ background: off ? "#cfc2b1" : "#2f7a46" }} />
                  </span>
                  <span className="min-w-0 flex-1 flex flex-col gap-1">
                    <span className="flex items-baseline gap-1.5 min-w-0">
                      <b className="text-[14.5px] leading-tight truncate" style={{ color: off ? MUTED : INK }}>{r.first_name}{r.nickname && <span className="font-semibold" style={{ color: "#8a6516" }}> ({r.nickname})</span>}</b>
                      <span className="shrink-0 text-[11px]" style={{ color: MUTED }}>{r.mb_code}</span>
                    </span>
                    <span className="flex flex-nowrap overflow-hidden gap-1 items-center">
                      <Mini c={CH[chOf(r)].c} bg={CH[chOf(r)].bg} k={chOf(r) === "tom" ? (r.group === "tom" ? "tom" : "man") : chOf(r)}>{chOf(r) === "secret" ? "Secret" : chOf(r) === "invite" ? "TOP" : r.group === "tom" ? "ทอม" : "หนุ่ม"}</Mini>
                      {off ? <Mini {...TONE_M.warn}>Non Active</Mini> : !r.listed && <Mini {...TONE_M.info}>ยังไม่ขึ้นหน้าแรก</Mini>}
                      {r.status === "pending_slip" && <Mini {...TONE_M.warn}>รอสลิป</Mini>}
                      <Mini {...(r.kyc_status === "approved" ? TONE_M.ok : r.kyc_status === "rejected" ? TONE_M.bad : TONE_M.warn)}>เอกสาร {nDocs(r)}/3</Mini>
                      <Mini {...(r.line_joined ? TONE_M.ok : TONE_M.warn)}>LINE</Mini>
                      <Mini {...TONE_M.info}>{r.photos?.length ?? 0} รูป</Mini>
                    </span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8a995" strokeWidth="2" aria-hidden="true" className="shrink-0"><path d="m9 6 6 6-6 6" /></svg>
                </span>
                <span className="hidden md:flex gap-3.5 items-start">
                  <span className="relative shrink-0 w-[68px] h-[68px] rounded-[18px] overflow-hidden grid place-items-center" style={{ background: AVA_BG[chOf(r)] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" style={{ filter: off ? "grayscale(1)" : undefined }} /> : <span className="font-lux font-bold text-[24px]" style={{ color: CH[chOf(r)].c }}>{(r.nickname || r.first_name || "?").slice(0, 1)}</span>}
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: off ? "#cfc2b1" : "#2f7a46" }} title={off ? "Non Active" : "Active"} />
                  </span>
                  <span className="min-w-0 flex-1 flex flex-col gap-1">
                    <span className="flex items-start justify-between gap-2">
                      <b className="text-[17px] leading-snug min-w-0 line-clamp-2" style={{ color: off ? MUTED : INK }}>{r.first_name} {r.last_name}{r.nickname && <span data-nick className="font-semibold" style={{ color: "#8a6516" }}> ({r.nickname})</span>}</b>
                      <span data-listed={r.listed ? "1" : "0"} className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11.5px] font-semibold whitespace-nowrap" style={r.listed && !off ? { background: "#e4f3e8", color: "#2f7a46" } : { background: "#f1ebe3", color: "#8a7b75" }}>{r.listed && !off ? "● เปิดรับงาน" : "ยังไม่ขึ้นหน้าแรก"}</span>
                    </span>
                    <span className="text-[13px]" style={{ color: MUTED }}>{r.mb_code} · สมัคร {thDate(r.created_at)}{off && <span data-nonactive className="ml-1 font-semibold" style={{ color: "#c2610f" }}>· Non Active</span>}</span>
                    <span className="flex flex-wrap gap-1.5 items-center mt-0.5"><ChPill r={r} />{r.group === "tom" && r.trans && <Tag t="info">Trans</Tag>}{r.sales_ref && <span data-sales-ref className="text-[12px]" style={{ color: MUTED }}>Recruit {r.sales_ref.code}</span>}{r.disclose === "no" && <span data-face-blur className="text-[12px]" style={{ color: MUTED }}>· เบลอหน้า</span>}</span>
                  </span>
                </span>
                <span className="hidden md:flex flex-wrap gap-1.5">
                  {feeTag(r)}{docTag(r)}
                  {r.line_joined ? <Tag t="ok">✓ LINE</Tag> : <Tag t="warn">! LINE</Tag>}
                  <Tag t="info">{r.photos?.length ?? 0} รูป</Tag>
                </span>
              </button>
            );
          })}
          {!shown.length && <p className="md:col-span-2 rounded-[22px] bg-white px-4 py-14 text-center" style={{ color: MUTED }}>ยังไม่มีผู้สมัครในหมวดนี้</p>}
        </div>
      </div>

      {sheet && <button type="button" aria-label="ปิด" onClick={() => setSheet(false)} className="md:hidden fixed inset-0 z-40 bg-black/45" />}
      <aside data-applicant-sheet={sheet ? "open" : "closed"} className={`${sheet ? "flex fixed inset-x-0 bottom-0 top-[7dvh] z-50 rounded-t-[22px] pb-[max(20px,env(safe-area-inset-bottom))] overscroll-contain" : "hidden"} md:flex md:static md:z-auto md:rounded-[26px] md:pb-5 w-full xl:w-[360px] shrink-0 bg-white p-5 flex-col gap-4 [&>*]:shrink-0 text-[13.5px] xl:sticky xl:top-7 md:max-h-[calc(100dvh-56px)] overflow-y-auto shadow-[0_8px_30px_rgba(90,60,20,.08)]`} style={{ color: INK }}>
        {sel ? (
          <>
            {/* มือถือ: หัวแผ่นแก้ไข (ลากจับ + ปิด) ติดบนเวลาเลื่อน */}
            <div className="md:hidden sticky -top-5 z-10 -mx-5 -mt-5 px-4 pt-2 pb-2 bg-white flex flex-col items-center gap-1.5 border-b" style={{ borderColor: "#f1ebe3" }}>
              <span className="w-10 h-1 rounded-full" style={{ background: "#d9cdb8" }} />
              <span className="w-full flex items-center gap-2">
                <b className="flex-1 min-w-0 truncate text-[14px]">{sel.first_name}{sel.nickname ? ` (${sel.nickname})` : ""} · {sel.mb_code}</b>
                <button type="button" data-sheet-edit onClick={() => document.getElementById("adm-manage")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-9 px-3 rounded-full text-[12.5px] font-semibold" style={{ background: INK, color: "#fff" }}>แก้ไข ↓</button>
                <button type="button" data-sheet-close onClick={() => setSheet(false)} aria-label="ปิด" className="w-9 h-9 rounded-full grid place-items-center text-[16px]" style={{ background: "#f1ebe3" }}>✕</button>
              </span>
            </div>
            <div className="md:hidden empty:hidden"><FlashMsg msg={msg} /></div>
            {movedTo && (
              <p role="status" className="m-0 rounded-xl px-3 py-2 text-[12.5px] flex justify-between gap-2 items-center" style={{ background: "#f6ecd2", color: "#8a6516" }}>
                <span>ย้ายไปแท็บ “{movedTo}” แล้ว · แผงนี้ยังเป็นคนเดิม</span>
                <button type="button" onClick={() => pick(shown[0]?.id ?? null)} className="shrink-0 underline">คนถัดไป</button>
              </p>
            )}
            <div className="flex flex-col gap-4 max-md:flex-row max-md:items-center max-md:gap-3">
            <div className={`w-full ${avatar(sel) ? "aspect-square" : "h-36"} max-md:!w-24 max-md:!h-24 max-md:shrink-0 rounded-[22px] max-md:rounded-[16px] overflow-hidden grid place-items-center`} style={{ background: AVA_BG[chOf(sel)] }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatar(sel) ? <img src={avatar(sel)} alt="" className="w-full h-full object-cover" style={{ filter: sel.inactive ? "grayscale(1)" : undefined }} /> : <span className="font-lux font-bold text-[64px]" style={{ color: CH[chOf(sel)].c }}>{(sel.nickname || sel.first_name || "?").slice(0, 1)}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <div data-drawer-ch><ChPill r={sel} /></div>
              <div className="font-lux font-bold text-[19px] md:text-[24px] leading-tight">{sel.first_name} {sel.last_name}{sel.nickname && <span className="text-[16px] md:text-[18px]" style={{ color: "#8a6516" }}> ({sel.nickname})</span>}</div>
              <div className="text-[12.5px] md:text-[13.5px]" style={{ color: MUTED }}>{sel.mb_code} · สาย {sel.package} · {sel.group === "tom" ? (sel.trans ? "ทอม (Trans)" : "ทอมหล่อ") : "หนุ่มหล่อ"}{sel.inv_no ? ` · ${sel.inv_no}` : ""}{sel.ri_no ? ` · ${sel.ri_no}` : ""}</div>
            </div>
            </div>

            {/* สถานะ Part-Time: Active / Non Active — สวิตช์ · ปิด = ฟอร์มเหตุผล + วันที่ลาออก */}
            {(() => {
              const off = !!sel.inactive;
              const tone = off ? { c: "#c2410c", soft: "#fff1ea", bd: "#fed7c3" } : { c: "#2f7a46", soft: "#e9f5ec", bd: "#cfe8d6" };
              const thd = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
              return (
                <div data-active-row className="rounded-[18px] border overflow-hidden" style={{ borderColor: tone.bd, background: tone.soft }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="text-[12px]" style={{ color: MUTED }}>สถานะ</div>
                      <div className="text-[17px] font-bold" style={{ color: tone.c }}>{off ? "Non Active · ลาออกแล้ว" : "Active · ทำงานอยู่"}</div>
                    </div>
                    <button type="button" role="switch" aria-checked={!off} aria-label="สถานะ Active" data-set-active={off ? "1" : "0"}
                      onClick={() => off ? setActive(sel.id, true) : setResign({ id: sel.id, reason: "", at: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10) })}
                      className="w-[52px] h-[30px] rounded-full relative shrink-0 transition" style={{ background: off ? "#d9cfc4" : "#2f7a46" }}>
                      <span className="absolute top-[3px] w-6 h-6 rounded-full bg-white shadow transition-all" style={{ left: off ? 3 : 25 }} />
                    </button>
                  </div>
                  {off && sel.inactive && (
                    <dl className="mx-3 mb-3 grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-xl bg-white px-3 py-2.5 text-[13px]">
                      <dt style={{ color: MUTED }}>วันที่ลาออก</dt><dd className="m-0 font-semibold">{thd(sel.inactive.at)}</dd>
                      <dt style={{ color: MUTED }}>เหตุผล</dt><dd className="m-0">{sel.inactive.reason}</dd>
                      <dt style={{ color: MUTED }}>บันทึกโดย</dt><dd className="m-0 break-all" style={{ color: "#6b5d58" }}>{sel.inactive.by}</dd>
                    </dl>
                  )}
                  {resign?.id === sel.id && !off && (
                    <div className="mx-3 mb-3 flex flex-col gap-2 rounded-xl bg-white px-3 py-3" style={{ border: "1px solid #fed7c3" }}>
                      <b className="text-[13.5px]" style={{ color: "#c2410c" }}>ตั้งเป็น Non Active</b>
                      <span className="text-[12px]" style={{ color: MUTED }}>เหตุผล</span>
                      <div className="flex flex-wrap gap-1.5">{["ลาออกเอง", "ย้ายงาน / ไม่สะดวกรับงาน", "ติดต่อไม่ได้", "ผิดกฎ / ทีมงานให้ออก", "พักงานชั่วคราว"].map((q) => <button key={q} type="button" onClick={() => setResign({ ...resign, reason: q })} className="h-8 px-3 rounded-full border text-[12px] font-medium" style={resign.reason === q ? { borderColor: "#c2410c", background: "#c2410c", color: "#fff" } : { borderColor: LINE_BD, color: "#4a3d38", background: "#fff" }}>{q}</button>)}</div>
                      <input data-resign-reason value={resign.reason} onChange={(e) => setResign({ ...resign, reason: e.target.value })} placeholder="หรือพิมพ์เหตุผลเอง" className="h-10 rounded-lg border bg-white px-3 text-[13px] outline-none focus:border-[#c2410c]" style={{ borderColor: LINE_BD }} />
                      <label className="flex items-center justify-between gap-2 text-[12.5px]" style={{ color: "#6b5d58" }}>วันที่ลาออก<input data-resign-at type="date" value={resign.at} onChange={(e) => setResign({ ...resign, at: e.target.value })} className="h-10 rounded-lg border bg-white px-2 text-[13px]" style={{ borderColor: LINE_BD }} /></label>
                      <span className="text-[11.5px]" style={{ color: MUTED }}>ซ่อนจากหน้าแรกทันที · รหัสเดิมคงไว้ ไม่นำกลับมาใช้</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setResign(null)} className="h-10 rounded-full border text-[13px]" style={{ borderColor: LINE_BD }}>ยกเลิก</button>
                        <button type="button" data-confirm-nonactive disabled={!resign.reason.trim() || !resign.at} onClick={() => setActive(sel.id, false, resign.reason, resign.at)} className="h-10 rounded-full text-[13px] font-semibold disabled:opacity-40" style={{ background: "#c2410c", color: "#fff" }}>ยืนยัน Non Active</button>
                      </div>
                    </div>
                  )}
                  {!!sel.active_log?.length && (
                    <details className="border-t px-4 py-2.5 bg-white/60" style={{ borderColor: tone.bd }}>
                      <summary className="cursor-pointer text-[12.5px]" style={{ color: "#6b5d58" }}>ประวัติสถานะ ({sel.active_log.length})</summary>
                      <ol className="m-0 mt-2 pl-0 list-none flex flex-col gap-2">
                        {sel.active_log.map((l, i) => (
                          <li key={i} className="flex gap-2.5 text-[12.5px]">
                            <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: l.active ? "#2f7a46" : "#c2410c" }} />
                            <span className="min-w-0"><b style={{ color: l.active ? "#2f7a46" : "#c2410c" }}>{l.active ? "Active" : "Non Active"}</b> · {thd(l.at)} · {l.reason}<span className="block text-[11.5px] break-all" style={{ color: MUTED }}>{l.by}</span></span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              );
            })()}

            <div className="rounded-[18px] px-4 py-1" style={{ background: "#f8f3ec" }}>
              <Info icon="clock" k="วันที่สมัคร" v={thDateTime(sel.created_at)} />
              <Info icon={!sel.amount || sel.status === "verified" ? "ok" : "warn"} k="ชำระเงิน" v={!sel.amount ? "ไม่มีค่าสมัคร" : `${fmt(sel.amount)} · ${LABEL[sel.status]}`} tone={!sel.amount || sel.status === "verified" ? "ok" : sel.status === "pending_slip" ? "warn" : "bad"} />
              <Info icon={sel.kyc_status === "approved" ? "ok" : "warn"} k="เอกสาร" v={`${sel.kyc_status === "approved" ? "ครบ" : nDocs(sel) < 3 ? "ขาด" : KYC_LABEL[sel.kyc_status ?? "none"][0]} · ${nDocs(sel)}/3`} tone={sel.kyc_status === "approved" ? "ok" : "warn"} />
              <Info icon={sel.line_joined ? "ok" : "warn"} k="กลุ่ม LINE" v={sel.line_joined ? "เข้าแล้ว" : "ยังไม่เข้า"} tone={sel.line_joined ? "ok" : "warn"} />
              <Progress r={sel} />
            </div>

            <div className="flex flex-col gap-2">
              <b className="text-[14px]">สลิปโอน</b>
              {sel.docs.slip ? (
                <a href={file(sel.docs.slip)} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center rounded-xl px-3 py-2.5" style={{ background: "#f8f3ec" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file(sel.docs.slip)} alt="สลิป" className="w-12 h-16 rounded-lg object-cover bg-white" />
                  <span className="text-[13px] leading-snug">{fmt(sel.amount)} · {sel.payment_method === "qr" ? "QR" : "โอนบัญชี"}<span className="block" style={{ color: sel.slip_check ? SLIP_LABEL[sel.slip_check.verdict][1] : MUTED }}>Slip2Go: {sel.slip_check ? `${SLIP_LABEL[sel.slip_check.verdict][0]}${sel.slip_check.amount != null ? ` · ${fmt(sel.slip_check.amount)}` : ""}` : "ไม่ได้ตรวจ"}</span></span>
                </a>
              ) : <p className="m-0 rounded-xl px-3 py-2.5 text-[13px]" style={{ background: "#f8f3ec", color: "#6b5d58" }}>ไม่มีสลิป · {sel.invite ? `สมัครผ่านลิงก์เชิญ${sel.tier === "secret" ? " Secret" : " TOP"}` : sel.group === "tom" ? "ทอมหล่อสมัครฟรี" : "ยังไม่ได้แนบ"} ไม่มีค่าสมัคร</p>}
              <div className="flex flex-wrap gap-1.5">
                {sel.status !== "verified" && <button onClick={() => verifySlip(sel)} className="h-9 px-3.5 rounded-full text-[12.5px] font-semibold text-white" style={{ background: "#2f7a46" }}>ยืนยันสลิป</button>}
                {sel.status === "pending_slip" && <button onClick={() => setRejecting((v) => !v)} aria-expanded={rejecting} className="h-9 px-3.5 rounded-full border text-[12.5px]" style={{ borderColor: "#f3c2c9", color: "#b42335" }}>ปฏิเสธ</button>}
                {sel.status === "verified" && !!sel.amount && <button onClick={() => refund(sel)} className="h-9 px-3.5 rounded-full border text-[12.5px]" style={{ borderColor: LINE_BD, color: "#5c4f48" }}>บันทึกคืนเงิน</button>}
                {!sel.sheet_synced && <button onClick={() => act(sel.id, { sync: true })} className="h-9 px-3.5 rounded-full border text-[12.5px]" style={{ borderColor: LINE_BD, color: "#5c4f48" }}>sync ชีต</button>}
              </div>
              {rejecting && sel.status === "pending_slip" && (
                <div className="flex flex-col gap-1.5 rounded-xl p-2.5" style={{ background: "#fdf0f2", border: "1px solid #f3c2c9" }}>
                  <label className="text-[12px]" style={{ color: "#6b5d58" }} htmlFor="slip-reason">เหตุผลที่ปฏิเสธสลิป (ผู้สมัครเห็น)</label>
                  <div className="flex flex-wrap gap-1">{["ยอดไม่ตรง", "สลิปไม่ชัด", "ไม่พบรายการโอน", "โอนเข้าบัญชีอื่น"].map((p) => <button key={p} type="button" onClick={() => setReason(p)} className="h-7 px-2.5 rounded-full border text-[11.5px] bg-white" style={{ borderColor: reason === p ? "#b42335" : LINE_BD, color: reason === p ? "#b42335" : "#6b5d58" }}>{p}</button>)}</div>
                  <input id="slip-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="เช่น ยอดโอนขาด ฿500" className="h-9 rounded-lg border bg-white px-2.5 text-[12.5px] outline-none" style={{ borderColor: LINE_BD }} />
                  <button type="button" disabled={!reason.trim()} onClick={() => rejectSlip(sel)} className="h-9 rounded-full text-white text-[12.5px] font-semibold disabled:opacity-40" style={{ background: "#b42335" }}>ปฏิเสธสลิป · แจ้งผู้สมัคร</button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <b className="text-[14px]">เอกสาร <span className="font-normal" style={{ color: MUTED }}>{nDocs(sel)}/3</span></b>
              {[...KYC_DOCS.map(([k, l]) => [l, !!sel.docs[k]] as const), ["สัญญาร่วมงาน", !!sel.contract_accepted_at] as const].map(([l, ok]) => (
                <div key={l} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold shrink-0" style={{ color: ok ? "#2f7a46" : "#c2610f", background: ok ? "#e4f3e8" : "#fdebd9" }}>{ok ? "✓" : "!"}</span>
                  <span className="flex-1">{l}</span>
                  <span className="text-[12.5px] font-semibold" style={{ color: ok ? "#2f7a46" : "#c2610f" }}>{ok ? (l === "สัญญาร่วมงาน" ? "ยอมรับแล้ว" : "ส่งแล้ว") : "ยังไม่ส่ง"}</span>
                </div>
              ))}
            </div>

            {(sel.photos?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-2">
                <b className="text-[14px]">รูปที่ส่งมา <span className="font-normal" style={{ color: MUTED }}>{sel.photos!.length} รูป</span></b>
                <div className="grid grid-cols-3 gap-2">{sel.photos!.map((p, i) => <a key={p} href={file(p)} target="_blank" rel="noopener noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={file(p)} alt={`รูปโปรไฟล์ ${i + 1}`} className="w-full aspect-[3/4] rounded-xl object-cover" style={{ background: "#f8f3ec" }} /></a>)}</div>
              </div>
            )}

            <div className="h-px" style={{ background: LINE_BD }} />
            <b id="adm-manage" className="text-[14px] -mb-1 scroll-mt-16">จัดการ</b>
            {sel.invite && <p className="m-0 text-[12.5px]" style={{ color: "#8a6516" }}>✦ สมัครผ่านลิงก์เชิญ ({sel.invite}) · ไม่มีค่าสมัคร · ระดับ {sel.tier === "secret" ? "Secret" : "TOP"}</p>}
            {/* แก้แล้วกด "บันทึก" ทีเดียว (บอส 11 พ.ย. 2569) — ก่อนบันทึกยังไม่เปลี่ยนจริง */}
            <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>สายงาน</span>
              <span className="flex gap-1">{(["A", "B"] as const).map((k) => { const on = (dr.package ?? sel.package) === k; return <button key={k} data-set-package={k} onClick={() => setDr((d) => ({ ...d, package: k }))} aria-pressed={on} title={PACKAGES[k].name} className="h-8 px-3 rounded-full border text-[12px] font-semibold" style={on ? { borderColor: INK, background: INK, color: "#fff" } : { borderColor: LINE_BD, color: "#5c4f48" }}>{k === "A" ? "A · กินเที่ยว" : "B · พร้อมนวด"}</button>; })}</span>
            </div>
            <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>รูปบนเว็บ</span>
              <span className="flex gap-1">{(["show", "face", "whole"] as const).map((k) => { const on = (dr.photo_privacy ?? privOf(sel)) === k; return <button key={k} data-set-photo-privacy={k} onClick={() => setDr((d) => ({ ...d, photo_privacy: k }))} aria-pressed={on} className="h-8 px-3 rounded-full border text-[12px] font-semibold" style={on ? { borderColor: INK, background: INK, color: "#fff" } : { borderColor: LINE_BD, color: "#5c4f48" }}>{k === "show" ? "เปิดหน้า" : k === "face" ? "เบลอหน้า" : "เบลอทั้งรูป"}</button>; })}</span>
            </div>
            {(dr.photo_privacy ?? privOf(sel)) !== "show" && <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>ความแรงเบลอ</span>
              <span className="flex gap-1">{([1, 2, 3] as const).map((l) => { const on = (dr.blur_level ?? sel.blur_level ?? 2) === l; return <button key={l} data-set-blur-level={l} onClick={() => setDr((d) => ({ ...d, blur_level: l }))} aria-pressed={on} className="h-8 px-3 rounded-full border text-[12px] font-semibold" style={on ? { borderColor: INK, background: INK, color: "#fff" } : { borderColor: LINE_BD, color: "#5c4f48" }}>{l === 1 ? "อ่อน" : l === 2 ? "กลาง" : "เข้ม"}</button>; })}</span>
            </div>}
            <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>หมวด</span>
              <span className="flex gap-1">{(["man", "tom"] as const).map((g) => { const on = (dr.group ?? (sel.group === "tom" ? "tom" : "man")) === g; return <button key={g} data-set-group={g} onClick={() => setDr((d) => ({ ...d, group: g }))} aria-pressed={on} className="h-8 px-3 rounded-full border text-[12px] font-semibold" style={on ? { borderColor: g === "tom" ? "#c0577e" : INK, background: g === "tom" ? "#c0577e" : INK, color: "#fff" } : { borderColor: LINE_BD, color: "#5c4f48" }}>{g === "tom" ? "ทอมหล่อ" : "หนุ่มหล่อ"}</button>; })}</span>
            </div>
            {drDirty(sel) && <div data-manage-save className="flex gap-2 max-md:sticky max-md:-bottom-5 max-md:z-10 max-md:-mx-5 max-md:px-5 max-md:py-3 max-md:bg-white max-md:border-t max-md:border-[#f1ebe3]">
              <button type="button" disabled={drBusy} onClick={() => saveDr(sel)} className="flex-1 h-10 rounded-full text-[13.5px] font-bold disabled:opacity-50" style={{ background: INK, color: "#fff" }}>{drBusy ? "กำลังบันทึก…" : "บันทึก"}</button>
              <button type="button" disabled={drBusy} onClick={() => setDr({})} className="h-10 px-4 rounded-full border text-[13px] font-semibold" style={{ borderColor: LINE_BD, color: "#5c4f48" }}>ยกเลิก</button>
            </div>}
            <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>ระดับ</span>
              <span className="flex gap-1">{(["silver", "top", "secret"] as const).map((t) => { const on = (sel.tier ?? "silver") === t; const sc = t === "secret"; return <button key={t} data-set-tier={t} onClick={() => setTier(sel.id, t)} aria-pressed={on} className="h-8 px-3 rounded-full border text-[12px] font-semibold" style={sc ? { borderColor: "#cbbdf2", background: on ? "#1c1530" : "#fff", color: on ? "#e9e1ff" : "#5b3fb0", boxShadow: on ? "0 0 10px rgba(124,92,214,.45)" : "none" } : on ? { borderColor: GOLD, background: GOLD, color: "#1a1206" } : { borderColor: LINE_BD, color: "#5c4f48" }}>{sc ? "Secret" : t === "top" ? "TOP" : "Silver"}</button>; })}</span>
            </div>
            {sel.tier === "secret" && <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>ราคา Secret · 3 ชม.{!sel.secret_price && <span className="block text-[11.5px]" style={{ color: "#b42335" }}>ยังไม่ตั้ง · ยังไม่ขึ้นหน้าแรก</span>}</span>
              <span className="flex gap-1.5 items-center">
                <input data-secret-price inputMode="numeric" aria-label="ราคา Secret ต่อ 3 ชม." placeholder={sel.secret_price ? String(sel.secret_price) : "ยังไม่ตั้ง"} value={spDraft[sel.id] ?? (sel.secret_price ? String(sel.secret_price) : "")} onChange={(e) => setSpDraft((m) => ({ ...m, [sel.id]: e.target.value.replace(/\D/g, "") }))} className="h-8 w-28 rounded-lg border bg-white px-2 text-right text-[13px] outline-none tabular-nums" style={{ borderColor: "#cbbdf2" }} />
                <button type="button" onClick={() => saveSecretPrice(sel.id)} className="h-8 px-3 rounded-full text-[12px] font-semibold" style={{ background: "#1c1530", color: "#e9e1ff" }}>บันทึก</button>
              </span>
            </div>}
            <div className="flex justify-between items-center gap-2"><span style={{ color: "#6b5d58" }}>แสดงบนหน้าแรก (เปิดรับงาน)</span>
              <button type="button" role="switch" aria-label="แสดงบนหน้าแรก" aria-checked={!!sel.listed} onClick={() => setListed(sel.id, !sel.listed)} className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: sel.listed ? GOLD : "#d9cfc4" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: sel.listed ? 21 : 3 }} /></button>
            </div>
            {sel.kyc_status !== "approved" && <p data-kyc-pay-note className="m-0 -mt-2 text-[12px]" style={{ color: "#c2610f" }}>เอกสารยังไม่ผ่าน · เปิดรับงานได้ แต่ Part-Time เบิก/ถอนเงินไม่ได้จนกว่าเอกสารผ่าน</p>}
            <button onClick={() => setLine(sel.id, !sel.line_joined)} role="switch" aria-checked={!!sel.line_joined} className="flex justify-between items-center h-11 px-3 rounded-xl border bg-white" style={{ borderColor: LINE_BD }}>
              เข้ากลุ่ม LINE แล้ว
              <span className="w-[42px] h-6 rounded-full relative" style={{ background: sel.line_joined ? "#06c755" : "#d9cfc4" }}><span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: sel.line_joined ? 21 : 3 }} /></span>
            </button>
            <div className="text-xs" style={{ color: "#6b5d58" }}>จัดกลุ่มอบรม</div>
            <div className="grid grid-cols-3 gap-1.5">
              {cohorts.map((c) => {
                const on = sel.cohort === c.key;
                return <button key={c.key} onClick={() => assign(sel.id, on ? null : c.key)} className="h-[38px] rounded-[10px] border text-[12.5px] font-semibold truncate px-1" style={on ? { borderColor: GOLD, background: GOLD, color: "#1a1206" } : { borderColor: LINE_BD, color: "#5c4f48", background: "#fff" }}>{c.name}</button>;
              })}
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
            <Row k="ตรวจประวัติ" v={CRIMINAL[sel.criminal_check ?? "pending"][0]} />
            <a data-view-profile href={`/api/admin/applicants/${sel.id}/preview`} target="_blank" rel="noopener noreferrer" title="เปิดหน้าเดียวกับที่ผู้สมัครเห็น · ระวังอย่ากดแก้ข้อมูลแทนผู้สมัคร" className="h-[46px] rounded-full font-semibold grid place-items-center" style={{ background: INK, color: "#fff" }}>ดูหน้าโปรไฟล์ของผู้สมัคร ↗</a>
            <div data-applicant-line-group={lineGroupOf(sel).key} className="flex flex-col gap-1.5">
              <span className="text-xs" style={{ color: "#6b5d58" }}>กลุ่ม LINE ของคนนี้ · <b style={{ color: INK }}>{lineGroupOf(sel).label}</b></span>
              <div className="grid grid-cols-2 gap-2">
                <a href={lineGroupOf(sel).url} target="_blank" rel="noopener noreferrer" className="h-[46px] rounded-full border font-semibold grid place-items-center text-[13.5px]" style={{ borderColor: "#06c755", color: "#048a3a" }}>เปิดกลุ่ม</a>
                <button onClick={() => copyLine(sel)} className="h-[46px] rounded-full bg-[#06c755] text-white font-semibold text-[13.5px]">คัดลอกลิงก์ส่งให้</button>
              </div>
            </div>
            <button onClick={() => setShowDocs((v) => !v)} aria-expanded={showDocs} className="h-11 rounded-full border bg-white" style={{ borderColor: LINE_BD, color: "#5c4f48" }}>{showDocs ? "ซ่อนสลิปและเอกสาร" : "ดูสลิปและเอกสาร"}</button>

            {showDocs && (
              <>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px] m-0">
                  <dt style={{ color: MUTED }}>สายงาน</dt><dd className="m-0">{sel.package} · {PACKAGES[sel.package].name}</dd>
                  {feeBreakdown(sel.package, sel.amount).map((x) => <Fragment key={x.name}><dt style={{ color: MUTED }}>{x.name}</dt><dd className="m-0">{fmt(x.amount)}</dd></Fragment>)}
                  <dt style={{ color: MUTED }}>โทร</dt><dd className="m-0">{sel.tel}</dd>
                  <dt style={{ color: MUTED }}>LINE</dt><dd className="m-0 break-all">{sel.line_id || "-"}</dd>
                  <dt style={{ color: MUTED }}>อีเมล</dt><dd className="m-0 break-all">{sel.email || "-"}</dd>
                </dl>
                {sel.bank_consents && <p className="m-0 text-[11.5px]" style={{ color: MUTED }}>ยินยอมข้อกำหนด · PDPA · แสดงโปรไฟล์ เมื่อ {thTime(sel.bank_consents.at)}</p>}
                {sel.delete_requested_at && <p className="m-0 text-[12.5px] rounded-lg px-3 py-2" style={{ color: "#b42335", background: "#fdf0f2" }}>⚠ ผู้สมัครขอลบบัญชีและข้อมูล (PDPA) เมื่อ {thTime(sel.delete_requested_at)} · ติดต่อยืนยันภายใน 30 วัน</p>}
                {sel.post && <p className="m-0 text-[12.5px]" style={{ color: "#6b5d58" }}>ประกาศ “วันนี้ว่าง” {sel.post.open ? "(เปิด)" : "(ปิดแล้ว)"}: {sel.post.text} · {sel.post.time} · {sel.post.zone}</p>}
                <div className="grid grid-cols-3 gap-1.5">
                  {DOCS.filter(([k]) => sel.docs[k]).map(([k, l]) => (
                    <a key={k} href={file(sel.docs[k]!)} target="_blank" rel="noopener noreferrer" className="block text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file(sel.docs[k]!)} alt={l} className="w-full aspect-[3/4] rounded-lg object-cover" style={{ background: "#f8f3ec" }} />
                      <span className="text-[11.5px]" style={{ color: MUTED }}>{l}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
            <div className="h-px" style={{ background: LINE_BD }} />
            <KycPanel key={sel.id} row={sel} canDecide={canKyc} onSaved={(row) => { setPin(row.id); setOpen(row.id); setRows((rs) => rs.map((x) => (x.id === row.id ? row : x))); }} />
            <button type="button" onClick={() => revokeLinks(sel)} className="h-10 rounded-full border text-[12.5px]" style={{ borderColor: "#f3c2c9", color: "#b42335" }}>ยกเลิกลิงก์เข้าโปรไฟล์ทั้งหมด</button>
          </>
        ) : <p className="py-10 text-center" style={{ color: MUTED }}>เลือกผู้สมัครเพื่อดูรายละเอียด</p>}
      </aside>
      {confirmUi}
    </div>
  );
}

const TONE_M = { ok: { c: TONE.ok[0], bg: TONE.ok[1] }, warn: { c: TONE.warn[0], bg: TONE.warn[1] }, bad: { c: TONE.bad[0], bg: TONE.bad[1] }, info: { c: TONE.info[0], bg: TONE.info[1] } };
/** ป้ายเล็กบนการ์ดมือถือ */
function Mini({ c, bg, k, children }: { c: string; bg: string; k?: string; children: React.ReactNode }) {
  const man = k === "man";
  return <span data-mini={k} className="inline-flex items-center h-[20px] px-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ color: man ? "#3b5bb5" : c, background: man ? "#e8eefc" : bg }}>{children}</span>;
}

const INFO_ICON: Record<string, [string, string, string]> = { clock: ["◷", "#8a7b75", "#efe8df"], ok: ["✓", "#2f7a46", "#e4f3e8"], warn: ["!", "#c2610f", "#fdebd9"] };
function Info({ icon, k, v, tone }: { icon: string; k: string; v: string; tone?: "ok" | "warn" | "bad" }) {
  const [g, c, bg] = INFO_ICON[icon];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: "#ece3d6" }}>
      <span className="w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold shrink-0" style={{ color: c, background: bg }}>{g}</span>
      <span className="flex-1" style={{ color: "#6b5d58" }}>{k}</span>
      <b className="text-[13.5px] text-right" style={{ color: tone ? TONE[tone === "bad" ? "bad" : tone][0] : INK }}>{v}</b>
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
    <div className="flex flex-wrap gap-1 py-2.5">
      {steps.map(([t, ok]) => <span key={t} className="text-[11.5px] px-2 py-0.5 rounded-full" style={{ background: ok ? "#e4f3e8" : "#fff", color: ok ? "#2f7a46" : "#8a7b75", border: ok ? "1px solid transparent" : "1px solid #e7ddcf" }}>{ok ? "✓ " : ""}{t}</span>)}
      {nFix > 0 && <span className="text-[11.5px] px-2 py-0.5 rounded-full" style={{ background: "#fde8eb", color: "#b42335" }}>! รอแก้ {nFix}</span>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="shrink-0" style={{ color: "#8a7b75" }}>{k}</span><span className="text-right">{v}</span></div>;
}
