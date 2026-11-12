"use client";
/* eslint-disable @next/next/no-img-element */

// โปรไฟล์ของฉัน — ถอดตามบอร์ด ProviderEditProfile
// ปุ่มงาน / ตาราง / รีวิว / ถอนเงิน / ตั้งค่า → หน้าย่อยใต้ /join/profile/[mb]/ (สถานะว่างตามจริงจนกว่าจะเริ่มรับงาน)
import { type PtTier } from "@/lib/join/config";
import { BoostPanel } from "./boost-panel";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PtNav } from "./_ptnav";
import { useRouter } from "next/navigation";
import type { ProfileCard } from "@/lib/join/store";
import { CERT_MSG, GATE_MSG, GATE_SHORT, KYC_PAY_MSG, MASSAGE_SKILL, isMassage } from "@/lib/join/pt-ui";
import type { Tier } from "@/lib/join/earnings-shared";
import { EstimateCard, PromoCard, SaveLinkCard } from "./hub-cards";

/** สีประจำส่วน (บอส 12 พ.ย. 2569: เดิมสีเดียวกันหมด ลายตา) — [พื้นหัว, ขอบ, สีไอคอน] */
const TINT = {
  wine: ["linear-gradient(180deg, rgba(160,40,60,.24), rgba(160,40,60,0) 120px)", "rgba(214,120,138,.28)", "#f0a3b1"],
  indigo: ["linear-gradient(180deg, rgba(90,120,200,.22), rgba(90,120,200,0) 120px)", "rgba(125,160,225,.26)", "#a9c2f0"],
  jade: ["linear-gradient(180deg, rgba(70,160,130,.20), rgba(70,160,130,0) 120px)", "rgba(110,190,160,.26)", "#9ad7bf"],
  plum: ["linear-gradient(180deg, rgba(150,100,200,.22), rgba(150,100,200,0) 120px)", "rgba(180,140,220,.28)", "#cdb0ec"],
  gold: ["linear-gradient(180deg, rgba(232,196,114,.20), rgba(232,196,114,0) 120px)", "rgba(232,196,114,.35)", "#e8c472"],
} as const;
function Sec({ tint, icon, title, right, children }: { tint: keyof typeof TINT; icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const [bg, bd, fg] = TINT[tint];
  return (
    <section className="rounded-[18px] min-w-0 flex flex-col gap-3" style={{ padding: 16, background: `${bg}, #1f1917`, border: `1px solid ${bd}` }}>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-[10px] grid place-items-center shrink-0" style={{ background: `${fg}26`, color: fg }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg></span>
        <span className="flex-1 min-w-0 font-semibold text-[15.5px]">{title}</span>{right}
      </div>
      {children}
    </section>
  );
}

export type HubData = {
  /** Bio + ส่วนสูง/น้ำหนัก (แสดงบนการ์ดหน้าแรก) */
  bio: string; height: number | null; weight: number | null;
  /** สมัครผ่านลิงก์เชิญ (ป้าย) */
  invite: boolean;
  /** หมวดทอมหล่อ (ป้าย) */
  tom: boolean;
  /** ปุ่มเข้ากลุ่ม LINE ตามหมวด — ขึ้นเมื่อชำระค่าสมัครแล้ว (null = ยังไม่ชำระ) */
  lineGroup: { key: string; url: string; label: string } | null;
  mb: string; t: string; nickname: string; fullName: string; statusLine: string; track: string; trackShort: string;
  main: string; mainPath: string; pos: string; photos: string[]; age: number | null; area: string; price: number; tier: PtTier; basic: boolean; verified: boolean;
  fixes: number;
  /** bond = เงินประกันงาน (สายคำเชิญพิเศษ) · null = ไม่ใช่สายเชิญ */
  wallet: { available: number; pending: number; month: number; bond: number | null };
  steps: { t: string; sub: string; ok: boolean; href: "" | "form" | "form2" | "kyc" | "rejected" }[];
  contractDone: boolean; card: ProfileCard;
  /** งานถัดไปที่ยืนยันแล้ว · งานรอตอบรับ · คะแนนรีวิวจริง · แจ้งเตือนที่ยังไม่อ่าน */
  next: { when: string; place: string; hours: number } | null; pendingJobs: number; rating: { avg: number; count: number } | null; unread: number;
  /** active = อนุมัติ KYC + เปิดโปรไฟล์แล้ว (ถอน/โปรโมท/ชวนเปิดเมมใช้ได้) · hasCert = มีใบรับรองการนวด */
  active: boolean; kycApproved: boolean; listed: boolean; hasCert: boolean; deleteRequested: string | null;
  /** ประมาณรายได้ (ค่าจากหน้า "ราคาและส่วนแบ่ง" ของแอดมิน — ชุดเดียวกับ /join/earnings) */
  estimate: { tiers: Tier[]; tipPct: number; payout: string; show: boolean };
  /** โปรโมชั่นที่ใช้ได้จริง: แผนโปรโมทโปรไฟล์ · ค่าคอมชวนเปิดเมม (null = ปิดระบบสมาชิก) */
  promos: { freeCodes: number; free: { days: number; windowDays: number; minJobs: number }; boost: { name: string; days: number; price: number }[]; member: { gold: { name: string; commission: number }; black: { name: string; commission: number }; mult: number } | null };
};

const GOLD = "#e8c472";
const SUG = ["กิน & เที่ยว", "ช่างภาพ", "ออกกำลัง", "คาเฟ่", "วิดีโอคอล", "ดูหนัง", "นั่งชิล", "ช้อปปิ้ง", "ตีกอล์ฟ", "คาราโอเกะ", "ดินเนอร์", "เที่ยวต่างจังหวัด", "คอนเสิร์ต", "ฟิตเนส", "ว่ายน้ำ", "เดินเล่นสวน"];
const QP = ["", "ดู", "ตี", "คอน", "เที่ยว", "โยคะ"];
const PLACES = ["นอกสถานที่", "กลางแจ้ง", "ห้างสรรพสินค้า", "คาเฟ่ / ร้านอาหาร", "คอนโด", "โรงแรม", "สปา"];
const PSPA: [string, string][] = [["Siam Serenity Spa", "สุขุมวิท 31"], ["Lanna Retreat", "เชียงใหม่"], ["Baan Suan Spa", "อารีย์"]];
const SKILLS: [string, string][] = [["massage", "นวดผ่อนคลาย (แนบใบรับรอง)"], ["photo", "ถ่ายรูปเก่ง"], ["eng", "พูดอังกฤษได้"], ["drive", "ขับรถพาเที่ยว"], ["fit", "เต้น / ฟิตเนสโค้ช"], ["cook", "ทำอาหาร"], ["music", "เล่นดนตรี / ร้องเพลง"], ["guide", "ไกด์ท้องถิ่น"]];
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const Ico = ({ d, size = 20, children }: { d?: string; size?: number; children?: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d && <path d={d} />}{children}</svg>
);

export function ProfileHub({ d }: { d: HubData }) {
  const router = useRouter();
  const q = d.t ? `?t=${encodeURIComponent(d.t)}` : "";
  const qs = (extra: string) => (d.t ? `?t=${encodeURIComponent(d.t)}&${extra}` : `?${extra}`);
  const href = { form: `/join/form/${d.mb}${q}`, form2: `/join/form/${d.mb}${qs("step=2")}`, kyc: `/join/kyc/${d.mb}${q}`, rejected: `/join/rejected/${d.mb}${q}` } as const;
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [promoOpen, setPromoOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(d.card.activities);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<string[]>(d.card.places);
  const [pspa, setPspa] = useState<string[]>(d.card.partner_spas);
  const [skills, setSkills] = useState<string[]>(d.card.skills);
  const [saved, setSaved] = useState<"" | "busy" | "ok" | "err">("");
  const [saveErr, setSaveErr] = useState("");
  const [bio, setBio] = useState(d.bio);
  const [height, setHeight] = useState(d.height ? String(d.height) : "");
  const [weight, setWeight] = useState(d.weight ? String(d.weight) : "");
  const [mainBusy, setMainBusy] = useState(false);
  const [certWarn, setCertWarn] = useState("");
  const [delAt, setDelAt] = useState(d.deleteRequested);
  const [delBusy, setDelBusy] = useState(false);
  // ต่ออายุคุกกี้เข้าโปรไฟล์ทุกครั้งที่เปิดหน้าหลัก (เลื่อน 30 วัน) — ไม่ต้องขอลิงก์ใหม่ทุกเดือน
  useEffect(() => { fetch("/api/join/renew", { method: "POST", cache: "no-store" }).then((r) => r.json()).catch(() => {}); }, []);
  // ยกเลิกคำขอลบบัญชี → โปรไฟล์กลับมาแสดงตามปกติ
  const cancelDelete = async () => {
    setDelBusy(true);
    const fd = new FormData(); fd.set("mb", d.mb); if (d.t) fd.set("t", d.t); fd.set("step", "delete_cancel");
    const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
    setDelBusy(false);
    if (res?.ok) setDelAt(null);
  };
  // เลือกกิจกรรมนวดได้เมื่อมีใบรับรองการนวดเท่านั้น
  const addPick = (label: string) => { if (!d.hasCert && isMassage(label)) { setCertWarn(CERT_MSG); return; } setPicked([...picked, label]); setQuery(""); setCertWarn(""); dirty(); };

  const dirty = () => setSaved("");
  const nDone = d.steps.filter((s) => s.ok).length;
  const allDone = nDone === d.steps.length;
  const sugg = SUG.filter((x) => !picked.includes(x) && (!query || x.includes(query))).slice(0, 6);
  const showCustom = !!query && !SUG.includes(query) && !picked.includes(query);

  const save = async () => {
    setSaved("busy");
    const fd = new FormData();
    fd.set("mb", d.mb); if (d.t) fd.set("t", d.t); fd.set("step", "card");
    picked.forEach((x) => fd.append("activities", x)); places.forEach((x) => fd.append("places", x));
    pspa.forEach((x) => fd.append("partner_spas", x)); skills.forEach((x) => fd.append("skills", x));
    fd.set("bio", bio); fd.set("height", height); fd.set("weight", weight);
    const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { card?: ProfileCard; warning?: string; error?: string } | null;
    setSaveErr(res?.ok ? "" : j?.error ?? "");
    // เซิร์ฟเวอร์ตัดกิจกรรม/สกิลนวดออกถ้ายังไม่มีใบรับรอง → แสดงตามที่บันทึกจริง
    if (res?.ok && j?.card) { setPicked(j.card.activities); setSkills(j.card.skills); }
    setCertWarn(j?.warning ?? "");
    setSaved(res?.ok ? "ok" : "err");
  };
  const setMain = async (index: number) => {
    if (index === 0 || mainBusy) return;
    setMainBusy(true);
    const res = await fetch("/api/join/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb: d.mb, t: d.t, action: "main", index }) }).catch(() => null);
    setMainBusy(false);
    if (res?.ok) router.refresh();
  };

  const chip = (on: boolean): React.CSSProperties => ({ background: on ? "rgba(110,190,160,0.2)" : "rgba(0,0,0,0.25)", color: on ? "#bfeedd" : "#f3ead9", border: `1px solid ${on ? "rgba(110,190,160,.5)" : "rgba(243,234,217,.1)"}` });
  const skillLine = skills.length ? "สกิลพิเศษ: " + SKILLS.filter(([id]) => skills.includes(id)).map(([, l]) => l.replace(" (แนบใบรับรอง)", "")).join(" · ") : "ยังไม่ได้เลือกสกิลพิเศษ";

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      <div className="lg:pl-[104px]"><div className="mx-auto w-full max-w-[1000px] pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-12 lg:pt-4">
        <div className="flex items-center gap-2" style={{ padding: "12px 14px 0" }}>
          <Link href="/work-with-us" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#251d1b] text-[#e8c472] grid place-items-center hover:text-[#e8c472]"><Ico d="m15 5-7 7 7 7" /></Link>
          <div className="font-semibold text-[17px] text-[#e8c472] flex-1">โปรไฟล์ของฉัน</div>
          <Link href={`/join/profile/${d.mb}/notifications${q}`} aria-label={d.unread ? `แจ้งเตือน · ยังไม่อ่าน ${d.unread} รายการ` : "แจ้งเตือน"} className="relative w-11 h-11 rounded-full bg-[#251d1b] text-[#e8c472] grid place-items-center hover:text-[#e8c472]">
            <Ico><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Ico>
            {d.unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d93a3a] text-white text-[11px] font-bold leading-[18px] text-center">{d.unread > 9 ? "9+" : d.unread}</span>}
          </Link>
        </div>

        <div className="grid md:grid-cols-2 md:items-start" style={{ padding: "12px 18px 0", gap: 21 }}>
          <div className="flex flex-col min-w-0" style={{ gap: 21 }}>
            {/* หัวโปรไฟล์ */}
            <div className="flex gap-4 items-start">
              <Link href={`/join/profile/${d.mb}/photos${q}`} aria-label="เพิ่ม/จัดการรูปโปรไฟล์" className="shrink-0 relative block w-[132px]">
                {d.main ? <img src={d.main} alt="รูปโปรไฟล์" className="w-[132px] aspect-[3/4] object-cover rounded-[14px] block bg-[#251d1b]" style={{ objectPosition: d.pos }} /> : <div className="w-[132px] aspect-[3/4] rounded-[14px] bg-[#251d1b]" />}
                <span className="absolute left-1.5 right-1.5 bottom-1.5 min-h-8 rounded-[10px] text-[13px] font-semibold text-[#e8c472] grid place-items-center" style={{ background: "rgba(23,18,17,0.85)" }}>+ เพิ่มรูป</span>
              </Link>
              <div className="min-w-0 flex flex-col gap-1.5 pt-1">
                <div className="font-semibold text-[22px] leading-[1.35]">{d.nickname}</div>
                <div className="text-[15px] leading-normal">{d.fullName}</div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[13px] text-[#b5a596] font-light">รหัสพนักงาน</span>
                  <span className="font-semibold text-[18px] text-[#e8c472] tracking-[1px]">{d.mb}</span>
                  <span className="text-[12px] text-[#b5a596] font-light">{d.statusLine}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="rounded-full text-[13px] text-[#e8c472] bg-[#251d1b] font-light" style={{ padding: "3px 10px" }}>{d.track}</span>
                  {d.tom && <span data-pt-group="tom" className="rounded-full text-[13px] font-light text-[#f3ead9]" style={{ padding: "3px 10px", background: "rgba(246,165,192,0.18)" }}>ทอมหล่อ</span>}
                  {d.invite && <span data-pt-lane="invite" className="rounded-full text-[13px] font-light text-[#f3ead9]" style={{ padding: "3px 10px", background: "rgba(232,196,114,0.18)" }}>✦ สายคำเชิญ</span>}
                </div>
              </div>
            </div>

            {d.lineGroup && <a href={d.lineGroup.url} target="_blank" rel="noopener" data-line-group={d.lineGroup.key} className="min-h-[52px] rounded-[14px] bg-[#06c755] text-white text-[15px] font-semibold flex items-center justify-center gap-[10px] hover:text-white">
              <Ico size={22} d="M12 4C7 4 3 7.2 3 11c0 3.4 3 6.2 7.2 6.9L10 21l3.6-3.1C18 17.4 21 14.5 21 11c0-3.8-4-7-9-7z" />{d.lineGroup.label}
            </a>}
            <div className="grid grid-cols-2 gap-[10px]">
              <Link href={`/join/profile/${d.mb}/jobs${q}`} className="rounded-2xl flex flex-col gap-0.5 min-w-0 hover:text-inherit" style={{ padding: 14, background: `${TINT.indigo[0]}, #1f1917`, border: `1px solid ${TINT.indigo[1]}` }}><span className="text-[12px] font-semibold" style={{ color: TINT.indigo[2] }}>📅 งานถัดไป</span>
                {d.next
                  ? <><span className="font-semibold text-[14px] leading-[1.35]">{d.next.when}</span><span className="text-[12px] font-light text-[#d9c9b4] line-clamp-2">{d.next.place} · {d.next.hours} ชม.</span></>
                  : <><span className="font-semibold">ยังไม่มีนัด</span><span className="text-[12px] font-light text-[#d9c9b4]">{d.pendingJobs ? `มีงานรอตอบรับ ${d.pendingJobs} งาน ›` : d.listed ? "เปิดรับงานอยู่ · รอลูกค้าจอง" : "เริ่มรับงานหลังทีมงานอนุมัติ"}</span></>}
              </Link>
              <Link href={`/join/profile/${d.mb}/reviews${q}`} className="rounded-2xl flex flex-col gap-0.5 hover:text-inherit" style={{ padding: 14, background: `${TINT.jade[0]}, #1f1917`, border: `1px solid ${TINT.jade[1]}` }}><span className="text-[12px] font-semibold" style={{ color: TINT.jade[2] }}>★ รีวิวของฉัน</span><span className="font-semibold text-[#e8c472]">{d.rating ? `★ ${d.rating.avg.toFixed(1)}` : "—"}</span><span className="text-[12px] font-light text-[#d9c9b4]">{d.rating ? `${d.rating.count} รีวิว` : "ยังไม่มีรีวิว"}</span></Link>
            </div>

            {/* กระเป๋าเงิน */}
            <div id="pt-wallet" className="flex flex-col gap-3 rounded-[18px] scroll-mt-3" style={{ padding: 16, background: "radial-gradient(110% 130% at 100% 0%, rgba(232,196,114,.24), transparent 55%), linear-gradient(150deg, #3d2a16 0%, #241b18 70%)", border: "1px solid rgba(232,196,114,.45)", boxShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-[#e8c472]"><Ico><path d="M3 7a2 2 0 0 1 2-2h13v4" /><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z" /><circle cx="16" cy="14.5" r="1.3" /></Ico>กระเป๋าเงิน</span>
                <Link href={`/join/profile/${d.mb}/earnings${q}`} className="tap text-[13px] text-[#e8c472] font-light">เช็คเรทรายได้ ›</Link>
              </div>
              <div><div className="text-[13px] text-[#d9c9b4] font-light">ยอดใช้ได้</div><div className="font-semibold text-[34px] leading-[1.15]" style={{ color: "#fff1c9" }}>{baht(d.wallet.available)}</div><div className="text-[13px] text-[#d9c9b4] mt-0.5 font-light">รอปล่อยเงิน {baht(d.wallet.pending)} · รายได้เดือนนี้ {baht(d.wallet.month)}{d.wallet.bond != null && <> · เงินประกันงาน {baht(d.wallet.bond)}</>}</div></div>
              {/* ยังไม่อนุมัติ/ยังไม่เปิดโปรไฟล์ → ยังไม่ใช่ Part-Time ที่ทำงานจริง: ซ่อนถอน/โปรโมท/ชวนเปิดเมม (API ก็ตอบ 409) */}
              {!d.active && <p className="m-0 rounded-xl text-[13px] text-[#f6c38e] font-light leading-[1.5]" style={{ padding: "8px 12px", background: "rgba(240,163,90,.1)" }}>ถอนเงิน · โปรโมทโปรไฟล์ · ชวนเปิดเมม {GATE_SHORT}<span className="block text-[12px] text-[#d9c9b4]">{GATE_MSG}</span></p>}
              {d.active && !d.kycApproved && <Link data-kyc-pay-warn href={`/join/kyc/${d.mb}${q}`} className="rounded-xl text-[13px] text-[#f6c38e] font-light leading-[1.5] hover:text-[#f6c38e]" style={{ padding: "8px 12px", background: "rgba(240,163,90,.1)" }}>⚠ {KYC_PAY_MSG}<span className="block text-[12px] text-[#e8c472]">ส่งเอกสารให้ครบ ›</span></Link>}
              {d.active && <div className="grid grid-cols-2 gap-2">
                <Link href={`/join/profile/${d.mb}/withdraw${q}`} className="min-h-11 rounded-xl text-[14px] font-semibold grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ background: "rgba(243,234,217,0.1)" }}>ถอนเงิน</Link>
                <button type="button" onClick={() => setPromoOpen(!promoOpen)} aria-expanded={promoOpen} className="min-h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold">{promoOpen ? "ปิด" : "โปรโมทโปรไฟล์"}</button>
              </div>}
              {d.active && promoOpen && <BoostPanel mb={d.mb} t={d.t} />}
              {d.active && <Link href={`/join/profile/${d.mb}/sales${q}`} className="min-h-12 rounded-xl flex items-center gap-2.5 text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "8px 12px", background: "rgba(232,196,114,0.12)", boxShadow: "inset 0 0 0 1px rgba(232,196,114,.35)" }}><span className="text-[18px]" aria-hidden="true">🤝</span><span className="flex-1 leading-[1.35]"><b className="block text-[14px]">ชวนลูกค้าเปิดเมม รับค่าคอม</b><span className="text-[12.5px] text-[#d9c9b4] font-light">ได้ค่าคอมทุกคนที่เปิดเมม หรือแปลงเป็นวงเงินโปรโมท</span></span><span className="text-[#e8c472]">›</span></Link>}
            </div>

            <EstimateCard d={d} q={q} />
            <PromoCard d={d} q={q} onBoost={() => { setPromoOpen(true); setTimeout(() => document.getElementById("pt-wallet")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} />
            <SaveLinkCard d={d} />

            {delAt && (
              <div className="flex flex-col gap-2 rounded-2xl" style={{ padding: "12px 14px", background: "rgba(255,138,154,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,138,154,.35)" }}>
                <span className="text-[14px] leading-[1.5]">ส่งคำขอลบบัญชีแล้ว ({new Date(delAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}) · ลูกค้าจะไม่เห็นโปรไฟล์ระหว่างรอทีมงานดำเนินการ</span>
                <button type="button" onClick={cancelDelete} disabled={delBusy} className="self-start min-h-11 px-4 rounded-xl text-[14px] font-semibold text-[#e8c472] disabled:opacity-50" style={{ background: "rgba(232,196,114,0.16)" }}>{delBusy ? "กำลังยกเลิก…" : "ยกเลิกคำขอลบบัญชี"}</button>
              </div>
            )}

            {d.fixes > 0 && (
              <Link href={href.rejected} className="flex items-center gap-3 rounded-2xl text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "14px 16px", background: "rgba(217,58,58,.16)", boxShadow: "inset 0 0 0 1px rgba(255,138,154,.45)" }}>
                <span aria-hidden="true" className="shrink-0 w-7 h-7 rounded-full bg-[#d93a3a] text-white grid place-items-center font-bold">!</span>
                <span className="flex-1 min-w-0 flex flex-col leading-[1.4]"><span className="font-semibold text-[15px]">ทีมงานขอให้แก้ไข {d.fixes} รายการ</span><span className="text-[13px] text-[#ffb3bd] font-light">แตะเพื่อดูเหตุผลและแก้ไข</span></span>
                <span className="text-[#ff8a9a]">›</span>
              </Link>
            )}

            {/* กรอกรายละเอียดใบสมัคร */}
            <div className="flex flex-col gap-[10px] rounded-2xl" style={{ padding: 14, background: `${TINT.wine[0]}, #1f1917`, border: `1px solid ${TINT.wine[1]}` }}>
              <div className="flex justify-between items-baseline gap-2"><span className="font-semibold text-[16px]">กรอกรายละเอียดใบสมัคร</span><span className="text-[13px] text-[#e8c472] font-light">ครบ {nDone}/{d.steps.length}</span></div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(243,234,217,0.12)" }}><div className="h-full bg-[#e8c472]" style={{ width: `${(nDone / d.steps.length) * 100}%` }} /></div>
              {allDone
                ? <Link href={d.contractDone ? `/join/done/${d.mb}${q}` : `/join/contract/${d.mb}${q}`} className="min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center hover:text-[#1b130b]">{d.contractDone ? "ดูใบสมัครที่ส่งแล้ว" : "อ่านสัญญาและส่งใบสมัคร"}</Link>
                : (() => { const i = d.steps.findIndex((st) => !st.ok && st.href); const nx = d.steps[i]; return d.fixes > 0 ? <Link href={href.rejected} className="min-h-[52px] rounded-[14px] bg-[#d93a3a] text-white text-[15px] font-semibold grid place-items-center hover:text-white">แก้ไขตามที่ทีมงานแจ้ง</Link> : <Link href={nx?.href ? href[nx.href] : href.form} className="min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center hover:text-[#1b130b]">{`กรอกต่อ · ${nx?.t ?? "ข้อมูลส่วนตัว"} (ครบ ${nDone}/${d.steps.length})`}</Link>; })()}
              {d.steps.map((st) => {
                const inner = (
                  <>
                    <span className="shrink-0 w-[26px] h-[26px] rounded-full grid place-items-center text-[14px] font-bold text-[#1b130b]" style={{ background: st.ok ? GOLD : "transparent", boxShadow: st.ok ? "none" : "inset 0 0 0 1.5px rgba(243,234,217,0.35)" }}>{st.ok ? "✓" : ""}</span>
                    <span className="flex-1 min-w-0 flex flex-col"><span className="text-[15px]">{st.t}</span><span className="text-[13px] text-[#b5a596] font-light">{st.sub}</span></span>
                    {st.href && <span className="shrink-0 text-[13px] font-light" style={{ color: st.href === "rejected" ? "#ff8a9a" : "#e8c472" }}>{st.ok || st.href === "rejected" ? "แก้ไข ›" : "กรอก ›"}</span>}
                  </>
                );
                const cls = "min-h-14 rounded-xl flex items-center gap-3 text-[#f3ead9] hover:text-[#f3ead9]";
                const st2 = { padding: "8px 12px", background: "rgba(232,196,114,0.16)" };
                return st.href ? <Link key={st.t} href={href[st.href]} className={cls} style={st2}>{inner}</Link> : <div key={st.t} className={cls} style={st2}>{inner}</div>;
              })}
            </div>
          </div>

          <div className="flex flex-col min-w-0" style={{ gap: 21 }}>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#251d1b]" role="tablist">
              {([["edit", "แก้ไข"], ["preview", "ดูตัวอย่างการ์ด"]] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="h-11 rounded-full text-[13px] font-semibold" style={{ background: tab === id ? GOLD : "transparent", color: tab === id ? "#211a18" : "#f3ead9" }}>{label}</button>
              ))}
            </div>

            {tab === "edit" ? (
              <div className="flex flex-col" style={{ gap: 21 }}>
                <Sec tint="wine" icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="m21 16-5-5-8 8" /></>} title="รูปโปรไฟล์" right={<span className="text-[12.5px] font-light text-[#d9c9b4]">{d.photos.length}/9 · แตะเพื่อตั้งรูปหลัก</span>}>
                  <div className="grid grid-cols-3 gap-2">
                    {d.photos.map((src, i) => (
                      <button key={src} type="button" onClick={() => setMain(i)} aria-label={i === 0 ? "รูปหลัก" : `ตั้งรูปที่ ${i + 1} เป็นรูปหลัก`} className="relative p-0 h-[120px] rounded-xl overflow-hidden" style={{ background: "rgba(232,196,114,0.16)" }}>
                        <img src={src} alt="" className="w-full h-full object-cover block" style={i === 0 ? { objectPosition: d.pos } : undefined} />
                        <span className="absolute left-1.5 bottom-1.5 text-[10px] rounded-full bg-[#e8c472] text-[#1b130b] font-light" style={{ padding: "2px 8px", opacity: i === 0 ? 1 : 0 }}>รูปหลัก</span>
                      </button>
                    ))}
                    {d.photos.length < 9 && (
                      <Link href={`/join/profile/${d.mb}/photos${q}`} className="h-[120px] rounded-xl grid place-items-center text-[13px] font-light text-[#f3ead9] hover:text-[#f3ead9]" style={{ background: "rgba(232,196,114,0.16)" }}>
                        <span className="flex flex-col items-center gap-1"><Ico d="M12 5v14M5 12h14" />เพิ่มรูป</span>
                      </Link>
                    )}
                  </div>
                </Sec>

                {/* Bio + ส่วนสูง / น้ำหนัก (ใหม่) — แสดงบนการ์ดหน้าแรก */}
                <Sec tint="plum" icon={<><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" /></>} title="แนะนำตัว (Bio)" right={<span className="text-[12px] font-light text-[#d9c9b4]">โชว์บนการ์ดหน้าแรก</span>}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] text-[#e6d6c4]">ข้อความแนะนำตัวสั้น ๆ</span>
                    <textarea data-bio-input value={bio} maxLength={160} rows={3} onChange={(e) => { setBio(e.target.value); dirty(); }} placeholder="เช่น ชอบคาเฟ่ ถ่ายรูปเก่ง คุยสนุก ดูแลตลอดนัด" className="w-full rounded-xl bg-[#100c0b] text-[#f3ead9] text-[15px] leading-[1.6] px-3.5 py-2.5 outline-none border border-[rgba(243,234,217,.14)] focus:border-[#cdb0ec] resize-none placeholder:text-[#7d6f66]" />
                    <span className="flex justify-between text-[11.5px] font-light text-[#a99a8e]"><span>ห้ามใส่เบอร์ LINE หรือช่องทางติดต่อ</span><span>{bio.length}/160</span></span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([["ส่วนสูง", "ซม.", height, setHeight, "175"], ["น้ำหนัก", "กก.", weight, setWeight, "68"]] as const).map(([l, u, v, set, ph]) => (
                      <label key={l} className="flex flex-col gap-1.5"><span className="text-[12.5px] text-[#e6d6c4]">{l}</span>
                        <span className="flex items-center rounded-xl bg-[#100c0b] border border-[rgba(243,234,217,.14)] focus-within:border-[#cdb0ec] pr-3">
                          <input data-body-input={u} inputMode="numeric" value={v} placeholder={ph} onChange={(e) => { set(e.target.value.replace(/\D/g, "").slice(0, 3)); dirty(); }} className="flex-1 min-w-0 h-12 bg-transparent px-3.5 text-[16px] text-[#f3ead9] outline-none placeholder:text-[#7d6f66]" />
                          <span className="text-[13px] text-[#a99a8e]">{u}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Sec>

                <Sec tint="indigo" icon={<><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" /></>} title="กิจกรรมที่รับ" right={<span className="text-[12.5px] font-light text-[#d9c9b4]">เลือกแล้ว {picked.length}</span>}>
                  <div className="flex flex-wrap gap-2 mb-[10px]">
                    {picked.map((label) => (
                      <button key={label} type="button" aria-label={`ลบ ${label}`} onClick={() => { setPicked(picked.filter((x) => x !== label)); dirty(); }} className="min-h-10 rounded-full text-[13px] text-[#c9d8f6] flex items-center gap-1.5" style={{ padding: "0 10px 0 14px", background: "rgba(125,160,225,0.18)", border: "1px solid rgba(125,160,225,.35)" }}>{label}<span className="text-[16px] leading-none">×</span></button>
                    ))}
                  </div>
                  <label className="h-12 rounded-xl bg-[#100c0b] border border-[rgba(243,234,217,.14)] focus-within:border-[#a9c2f0] flex items-center gap-2 px-[14px]">
                    <Ico><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ico>
                    <input value={query} onChange={(e) => setQuery(e.target.value.slice(0, 30))} placeholder="พิมพ์กิจกรรม เช่น ดูหนัง, ตีกอล์ฟ…" aria-label="ค้นหากิจกรรม" className="flex-1 min-w-0 h-11 bg-transparent border-0 outline-none text-[#f3ead9] placeholder:text-[#b5a596] text-[14px]" />
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[13px] font-light">
                    <span>ลองพิมพ์:</span>
                    {QP.map((v) => <button key={v || "clear"} type="button" onClick={() => setQuery(v)} className="h-10 px-3 rounded-full text-[13px] font-light" style={{ background: "rgba(232,196,114,0.16)", color: query === v ? GOLD : "#f3ead9" }}>{v || "ล้าง"}</button>)}
                  </div>
                  <div className="mt-2 rounded-xl overflow-hidden flex flex-col" style={{ background: "rgba(0,0,0,.25)", border: "1px solid rgba(125,160,225,.18)" }}>
                    {sugg.map((label) => <button key={label} type="button" onClick={() => addPick(label)} className="min-h-11 px-[14px] bg-transparent border-b border-[rgba(243,234,217,0.07)] text-[#f3ead9] text-[13.5px] flex justify-between items-center text-left">{label}<span className="text-[#a9c2f0] text-[13px] font-semibold">+ เลือก</span></button>)}
                    {!!query && !sugg.length && <div className="text-[13px] font-light" style={{ padding: "10px 14px" }}>ไม่พบในรายการแนะนำ</div>}
                    {showCustom && <button type="button" onClick={() => addPick(query)} className="min-h-11 px-[14px] text-[#e8c472] text-[13.5px] font-semibold text-left" style={{ background: "rgba(232,196,114,0.16)" }}>+ เพิ่ม “{query}”</button>}
                  </div>
                </Sec>

                <Sec tint="jade" icon={<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>} title="สถานที่ที่รับนัด" right={<span className="text-[12.5px] font-light text-[#d9c9b4]">เลือกแล้ว {places.length}</span>}>
                  <div className="flex flex-wrap gap-2">
                    {PLACES.map((label) => { const on = places.includes(label); return <button key={label} type="button" aria-pressed={on} onClick={() => { setPlaces(on ? places.filter((x) => x !== label) : [...places, label]); dirty(); }} className="min-h-11 px-[14px] rounded-full text-[13px] font-light" style={chip(on)}>{label}</button>; })}
                  </div>
                  <p className="text-[13px] m-0 mt-3 mb-1.5">สปา / สถานที่พาร์ทเนอร์</p>
                  <div className="flex flex-col gap-1.5">
                    {PSPA.map(([name, area]) => { const on = pspa.includes(name); return (
                      <button key={name} type="button" role="checkbox" aria-checked={on} onClick={() => { setPspa(on ? pspa.filter((x) => x !== name) : [...pspa, name]); dirty(); }} className="min-h-12 px-3 rounded-xl flex items-center gap-[10px] text-left text-[#f3ead9]" style={{ background: on ? "rgba(110,190,160,0.14)" : "rgba(0,0,0,.25)", border: `1px solid ${on ? "rgba(110,190,160,.45)" : "rgba(243,234,217,.08)"}` }}>
                        <span className="w-5 h-5 rounded-md grid place-items-center text-[13px] font-bold text-[#0f2a20]" style={{ background: on ? "#9ad7bf" : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px rgba(110,190,160,0.5)" }}>{on ? "✓" : ""}</span>
                        <span className="flex-1 text-[13.5px]">{name}</span><span className="text-[13px] font-light">{area}</span>
                      </button>
                    ); })}
                  </div>
                </Sec>

                <div className="flex flex-col gap-2 rounded-2xl" style={{ padding: 14, background: `${TINT.gold[0]}, #1f1917`, border: `1px solid ${TINT.gold[1]}` }}>
                  <div className="flex justify-between items-center"><span className="text-[14px] flex items-center gap-1.5">ราคา 3 ชม. <TierBadge tier={d.tier} basic={d.basic} /></span><span className="font-semibold text-[19px] text-[#e8c472]">{baht(d.price)}</span></div>
                  <div className="text-[13px] flex items-center gap-1.5 font-light"><Ico size={14}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Ico>กำหนดโดยทีมงานตามระดับ · แก้ไขเองไม่ได้</div>
                </div>

                <div className="flex flex-col rounded-2xl" style={{ padding: 14, gap: 13, background: `${TINT.plum[0]}, #1f1917`, border: `1px solid ${TINT.plum[1]}` }}>
                  <span className="text-[15px] font-semibold">✦ สกิลพิเศษ <span className="text-[12.5px] font-light text-[#d9c9b4]">(เลือกได้หลายข้อ)</span></span>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map(([id, label]) => { const on = skills.includes(id); const locked = id === MASSAGE_SKILL && !d.hasCert && !on; return <button key={id} type="button" aria-pressed={on} disabled={locked} aria-describedby={locked ? "cert-why" : undefined} onClick={() => { setSkills(on ? skills.filter((x) => x !== id) : [...skills, id]); dirty(); }} className="min-h-10 px-[14px] rounded-full text-[13px] font-light disabled:opacity-45" style={{ background: on ? "rgba(232,196,114,0.12)" : "transparent", color: on ? GOLD : "#f3ead9", boxShadow: on ? "none" : "inset 0 0 0 1px rgba(232,196,114,0.38)" }}>{locked ? "🔒 " : ""}{label}</button>; })}
                  </div>
                  <span className="text-[13px] font-light">แสดงเป็นแท็กบนโปรไฟล์ · ไม่มีค่าบริการเพิ่ม</span>
                  {/* ยังไม่มีใบรับรองการนวด → บอกเหตุผลที่กดไม่ได้ + ทางไปแนบ (เซิร์ฟเวอร์ตัดออกให้อีกชั้น) */}
                  {!d.hasCert && <span id="cert-why" className="text-[12.5px] font-light text-[#f6c38e] leading-[1.5]">🔒 {CERT_MSG} · <Link href={href.form2} className="text-[#e8c472] underline underline-offset-2">แนบใบรับรอง ›</Link></span>}
                </div>

                {certWarn && <p role="status" className="m-0 text-[13px] text-[#f6c38e]">{certWarn}</p>}
                {saved === "err" && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{saveErr || "บันทึกไม่สำเร็จ กรุณาลองใหม่"}</p>}
                <button type="button" onClick={save} disabled={saved === "busy"} className="h-[52px] rounded-[14px] text-[#1b130b] text-[15.5px] font-semibold w-full lg:sticky lg:bottom-4 z-10" style={{ background: saved === "ok" ? "#9ad7bf" : "linear-gradient(135deg,#fff1c9,#e8c472 55%,#d1a54c)", boxShadow: "0 10px 24px rgba(0,0,0,.4)" }}>{saved === "ok" ? "บันทึกแล้ว · ทีมงานจะตรวจรูปให้" : saved === "busy" ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="text-[13px] font-light">ลูกค้าจะเห็นการ์ดของคุณแบบนี้</div>
                <div className="rounded-[18px] overflow-hidden bg-[#2c1a1f]">
                  {d.main ? <PosPhoto key={d.mainPath} d={d} /> : <div className="w-full h-[340px] bg-[#251d1b]" />}
                  <div className="flex flex-col gap-2" style={{ padding: 14 }}>
                    <div className="flex justify-between items-baseline">
                      <span className="flex items-center gap-1.5"><span className="font-semibold text-[20px]">{d.nickname}{d.age ? ` · ${d.age} ปี` : ""}</span><TierBadge tier={d.tier} basic={d.basic} /></span>
                      <span className="text-[13px] text-[#e8c472] font-light">{d.rating ? `★ ${d.rating.avg.toFixed(1)} (${d.rating.count})` : "ยังไม่มีรีวิว"}</span>
                    </div>
                    {(height || weight) && <div className="flex gap-1.5">{height && <span className="rounded-full text-[12px] text-[#f1e3c8]" style={{ padding: "2px 9px", background: "rgba(232,196,114,.14)" }}>{height} ซม.</span>}{weight && <span className="rounded-full text-[12px] text-[#f1e3c8]" style={{ padding: "2px 9px", background: "rgba(232,196,114,.14)" }}>{weight} กก.</span>}</div>}
                    {bio.trim() && <div className="text-[13.5px] leading-[1.55] italic font-light text-[#d9c9b4]">“{bio.trim()}”</div>}
                    <div className="flex flex-wrap gap-1.5">{picked.map((a) => <span key={a} className="text-[13px] rounded-full font-light" style={{ padding: "4px 10px", background: "rgba(243,234,217,0.07)" }}>{a}</span>)}</div>
                    <div className="flex justify-between text-[13px] pt-2 border-t border-[rgba(243,234,217,0.07)] font-light"><span>3 ชม. <b className="text-[#e8c472]">{baht(d.price)}</b></span><span>{d.trackShort}{d.area ? ` · ${d.area}` : ""}</span></div>
                    <div className="text-[13px] font-light">{skillLine}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      </div>
      <PtNav c={{ mb: d.mb, q }} active="home" unread={d.unread} />
    </div>
  );
}

/** รูปหลักบนการ์ดตัวอย่าง — ลากเพื่อเลื่อนตำแหน่งรูปในกรอบ (object-position) แล้วบันทึก → ลูกค้าเห็นตำแหน่งเดียวกันทุกหน้า */
function PosPhoto({ d }: { d: HubData }) {
  const router = useRouter();
  const parse = (p: string) => { const m = /^(\d+)% (\d+)%$/.exec(p); return m ? [+m[1], +m[2]] : [50, 50]; };
  const [pos, setPos] = useState(() => parse(d.pos));
  const [state, setState] = useState<"" | "busy" | "ok" | "err">("");
  const drag = useRef<{ x: number; y: number; px: number; py: number; w: number; h: number } | null>(null);
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const changed = `${pos[0]}% ${pos[1]}%` !== d.pos;
  const nudge = (dx: number, dy: number) => { setPos(([x, y]) => [clamp(x + dx), clamp(y + dy)]); setState(""); };
  const save = async () => {
    setState("busy");
    const fd = new FormData();
    fd.set("mb", d.mb); if (d.t) fd.set("t", d.t); fd.set("step", "photo_pos"); fd.set("path", d.mainPath); fd.set("pos", `${pos[0]}% ${pos[1]}%`);
    const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
    setState(res?.ok ? "ok" : "err");
    if (res?.ok) router.refresh();
  };
  return (
    <div className="relative">
      <img src={d.main} alt="" draggable={false} className="w-full h-[340px] object-cover block select-none touch-none cursor-grab active:cursor-grabbing"
        style={{ objectPosition: `${pos[0]}% ${pos[1]}%` }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); drag.current = { x: e.clientX, y: e.clientY, px: pos[0], py: pos[1], w: r.width, h: r.height }; }}
        onPointerMove={(e) => { const g = drag.current; if (!g) return; setPos([clamp(g.px - ((e.clientX - g.x) / g.w) * 150), clamp(g.py - ((e.clientY - g.y) / g.h) * 150)]); setState(""); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
      <div className="absolute top-2.5 inset-x-2.5 flex justify-between items-center gap-2 pointer-events-none">
        <span className="rounded-full text-[12px] text-[#f3ead9] font-light" style={{ padding: "4px 10px", background: "rgba(23,18,17,.72)" }}>ลากรูปเพื่อเลื่อนตำแหน่ง</span>
        <span className="flex gap-1 pointer-events-auto">
          {([["ขึ้น", 0, -8, "M12 19V5M5 12l7-7 7 7"], ["ลง", 0, 8, "M12 5v14M5 12l7 7 7-7"]] as const).map(([l, dx, dy, p]) => (
            <button key={l} type="button" aria-label={`เลื่อนรูป${l}`} onClick={() => nudge(dx, dy)} className="w-9 h-9 rounded-full grid place-items-center text-[#f3ead9]" style={{ background: "rgba(23,18,17,.72)" }}><Ico d={p} size={16} /></button>
          ))}
        </span>
      </div>
      {(changed || state) && (
        <div className="absolute bottom-2.5 inset-x-2.5 flex gap-2">
          <button type="button" onClick={() => { setPos(parse(d.pos)); setState(""); }} className="h-10 px-4 rounded-full text-[13px] text-[#f3ead9]" style={{ background: "rgba(23,18,17,.8)" }}>ยกเลิก</button>
          <button type="button" onClick={save} disabled={state === "busy" || (!changed && state === "ok")} className="flex-1 h-10 rounded-full bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold">{state === "busy" ? "กำลังบันทึก…" : state === "ok" && !changed ? "บันทึกตำแหน่งแล้ว ✓" : state === "err" ? "ไม่สำเร็จ · ลองอีกครั้ง" : "บันทึกตำแหน่งรูป"}</button>
        </div>
      )}
    </div>
  );
}

/** ป้ายระดับ: TOP = ทอง · Secret = ดำเรืองแสง · Silver ไม่มีป้าย (เลิกใช้ป้าย BASIC 28 ต.ค. 2569) */
function TierBadge({ tier }: { tier: PtTier; basic?: boolean }) {
  if (tier === "silver") return null;
  if (tier === "secret") return <span data-tier="secret" className="inline-flex items-center h-[18px] px-[7px] rounded text-[9.5px] font-bold tracking-[.2em] text-[#e9e1ff]" style={{ background: "#0b0910", boxShadow: "inset 0 0 0 1px rgba(185,166,255,.7), 0 0 10px rgba(185,166,255,.55)" }}>SECRET</span>;
  return <span className="inline-flex items-center h-[18px] px-[7px] rounded text-[9.5px] font-bold tracking-[.2em] text-[#1b130b]" style={{ background: tier === "top" ? "linear-gradient(135deg, #fff1c9 0%, #e8c472 45%, #a8781f 100%)" : "linear-gradient(135deg, #f3ead9 0%, #b5a596 100%)", boxShadow: "inset 0 0 0 1px rgba(255,241,201,.5), 0 2px 6px rgba(0,0,0,.35)" }}>{tier === "top" ? "TOP" : "SILVER"}</span>;
}
