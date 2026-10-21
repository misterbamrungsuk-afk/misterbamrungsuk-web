import { notFound } from "next/navigation";
import { canResume } from "@/lib/join/resume";
import SOSButton from "@/components/sos";
import { extraOf, getByMb } from "@/lib/join/store";
import { getEarnings } from "@/lib/join/earnings-settings";
import { ageFrom } from "@/lib/join/form";
import { Forbidden } from "../../_kyc/ui";
import { ProfileHub, type HubData } from "./client";
import { FIX_ITEMS } from "@/lib/join/fixes";
import { ptWallet, ratingSummary } from "@/lib/bookings/day";
import { listForParttime, listNotices } from "@/lib/bookings";
import { isPtActive } from "@/lib/join/pt-ui";
import { BOOST_PLANS, FREE_BOOST, listBoostCodes } from "@/lib/join/boost";
import { getMemberSettings } from "@/lib/member/tiers";

export const dynamic = "force-dynamic";
export const metadata = { title: "โปรไฟล์ของฉัน — Mister Bamrungsuk" };

// บอร์ด ProviderEditProfile "โปรไฟล์ของฉัน" — ศูนย์กลางหลังชำระเงิน: กรอกใบสมัครต่อ · รูปโปรไฟล์ · การ์ดที่ลูกค้าเห็น
export default async function ProfilePage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  const x = extraOf(row);
  const done = new Set(x.form_done ?? []);
  const fileUrl = (p: string) => `/api/join/file?mb=${mb}&path=${encodeURIComponent(p)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;
  const photos = (x.photos ?? []).map(fileUrl);
  const main = photos[0] ?? (row.docs.photo ? fileUrl(row.docs.photo) : "");
  const mainPath = x.photos?.[0] ?? row.docs.photo ?? "";
  const kyc = x.kyc_status ?? "none";
  // รายการที่ทีมงานตีกลับ → แจ้งบนโปรไฟล์ + ขั้นที่เกี่ยวข้องยังไม่ครบ
  const fixes = kyc === "rejected" ? Object.keys(x.kyc_reason ?? {}) : [];
  const bad = (...go: string[]) => fixes.some((k) => go.includes(FIX_ITEMS.find((i) => i.key === k)?.go ?? ""));
  const cfg = await getEarnings();
  const svc = row.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  // โปรโมชั่นที่ Part-Time ใช้ได้จริง (ค่าจากตั้งค่าแอดมิน) — โปรโมทโปรไฟล์ · ค่าคอมชวนเปิดเมม (แปลงเป็นวงเงินโปรโมท ×เท่า)
  const ms = await getMemberSettings().catch(() => null);

  const w = await ptWallet(row.id).catch(() => null);
  const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const month = (w?.history ?? []).filter((h) => h.kind === "split" && h.bucket === "pending" && Date.parse(h.created_at) >= +m0).reduce((t, h) => t + h.amount, 0);
  // งานถัดไป (ยืนยันแล้ว/ถึงจุดนัดแล้ว ที่ยังไม่จบ) · รีวิวจริง · แจ้งเตือนที่ยังไม่อ่าน — ล้มก็แสดงว่าง ไม่ให้หน้าหลักพัง
  const [jobs, rate, notices] = await Promise.all([listForParttime(row.id).catch(() => []), ratingSummary([row.id]).catch(() => new Map<string, { avg: number; count: number }>()), listNotices("parttime", row.id).catch(() => [])]);
  const nowMs = Date.now();
  const nx = jobs.filter((b) => ["accepted", "checked_in"].includes(b.status) && Date.parse(b.starts_at) + b.hours * 3600_000 > nowMs).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const r = rate.get(row.id);
  const freeCodes = (await listBoostCodes().catch(() => [])).filter((c) => c.parttime_id === row.id && c.status === "unused").length;
  const data: HubData = {
    next: nx ? { when: new Date(nx.starts_at).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) + " น.", place: [nx.place?.label, nx.place?.detail].filter(Boolean).join(" · "), hours: nx.hours } : null,
    pendingJobs: jobs.filter((b) => b.status === "requested").length,
    rating: r ? { avg: Math.round(r.avg * 10) / 10, count: r.count } : null,
    unread: notices.filter((n) => !n.read_at).length,
    active: isPtActive(x), kycApproved: kyc === "approved", listed: !!x.listed, hasCert: !!row.docs.cert_doc, deleteRequested: x.delete_requested_at ?? null,
    wallet: { available: (w?.available ?? 0) / 100, pending: (w?.pending ?? 0) / 100, month: month / 100, bond: x.invite ? (w?.bond ?? 0) / 100 : null },
    mb, t: t ?? "", nickname: row.nickname, fullName: `${row.first_name} ${row.last_name}`,
    statusLine: x.invite && !row.amount ? "คำเชิญพิเศษ · ไม่มีค่าสมัคร · ระดับ TOP" : `${x.invite ? "คำเชิญพิเศษ" : "สมัครปกติ"} · ${row.status === "verified" ? "ชำระค่าสมัครแล้ว" : "ส่งสลิปแล้ว · รอทีมงานตรวจ"}`,
    track: row.package === "B" ? "เพื่อนกินเที่ยว · นวด" : "เพื่อนกินเที่ยว", trackShort: row.package === "B" ? "สายนวด" : "สายกินเที่ยว",
    main, mainPath, pos: (mainPath && x.photo_pos?.[mainPath]) || "50% 50%", photos, age: row.birthdate ? ageFrom(row.birthdate) : null, area: (x.areas ?? [])[0]?.split(" › ").pop() ?? "",
    price: x.tier === "top" ? svc.top : svc.silver, tier: x.tier === "top" ? "top" : "silver", verified: row.status === "verified",
    steps: [
      { t: "ชำระเงิน", sub: bad("slip") ? "สลิปต้องส่งใหม่" : row.status === "verified" ? "ตรวจสลิปแล้ว" : "ส่งสลิปแล้ว · รอทีมงานตรวจ", ok: !bad("slip"), href: bad("slip") ? "rejected" : "" },
      { t: "ข้อมูลส่วนตัว", sub: bad("form") ? "ทีมงานขอให้แก้ไข" : "ชื่อ เบอร์โทร LINE ที่พัก", ok: done.has(1) && !bad("form"), href: bad("form") ? "rejected" : "form" },
      { t: "วันเวลาที่รับงาน", sub: bad("form2") ? "ทีมงานขอให้แก้ไข" : "วัน ช่วงเวลา ชั่วโมงต่อวัน ประสบการณ์", ok: done.has(2) && !bad("form2"), href: bad("form2") ? "rejected" : "form2" },
      { t: "ยืนยันตัวตน + บัญชีรับเงิน", sub: bad("kyc", "bank") ? "เอกสารต้องแก้ไข" : "บัตรประชาชน เซลฟี่ บัญชีธนาคาร", ok: kyc !== "none" && !bad("kyc", "bank") && !!row.bank_account, href: bad("kyc", "bank") ? "rejected" : "kyc" },
    ],
    invite: !!x.invite, tom: x.group === "tom",
    contractDone: !!row.contract_accepted_at, fixes: fixes.length,
    card: x.card ?? { activities: [], places: [], partner_spas: [], skills: [] },
    estimate: { tiers: cfg.tiers, tipPct: cfg.tipPct, payout: cfg.payout, show: cfg.show },
    promos: { freeCodes, free: FREE_BOOST, boost: BOOST_PLANS.map((p) => ({ name: p.name, days: p.days, price: p.price })), member: ms?.enabled ? { gold: { name: ms.tiers.gold.name, commission: ms.tiers.gold.commission }, black: { name: ms.tiers.black.name, commission: ms.tiers.black.commission }, mult: ms.boostMult } : null },
  };
  return <><ProfileHub d={data} /><SOSButton /></>;
}
