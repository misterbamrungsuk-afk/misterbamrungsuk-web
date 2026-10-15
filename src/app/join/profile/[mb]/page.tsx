import { notFound } from "next/navigation";
import { canResume } from "@/lib/join/resume";
import { extraOf, getByMb } from "@/lib/join/store";
import { getEarnings } from "@/lib/join/earnings-settings";
import { ageFrom } from "@/lib/join/form";
import { Forbidden } from "../../_kyc/ui";
import { ProfileHub, type HubData } from "./client";

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
  const kyc = x.kyc_status ?? "none";
  const cfg = await getEarnings();
  const svc = row.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;

  const data: HubData = {
    mb, t: t ?? "", nickname: row.nickname, fullName: `${row.first_name} ${row.last_name}`,
    statusLine: x.invite ? `คำเชิญพิเศษ · ไม่เก็บค่าการันตี · ${row.status === "verified" ? "ชำระค่าอบรมแล้ว" : "ส่งสลิปแล้ว · รอทีมงานตรวจ"}` : `สมัครปกติ · ${row.status === "verified" ? "ชำระค่าการันตีแล้ว" : "ส่งสลิปแล้ว · รอทีมงานตรวจ"}`,
    track: row.package === "B" ? "เพื่อนกินเที่ยว · นวด" : "เพื่อนกินเที่ยว", trackShort: row.package === "B" ? "สายนวด" : "สายกินเที่ยว",
    main, photos, age: row.birthdate ? ageFrom(row.birthdate) : null, area: (x.areas ?? [])[0]?.split(" › ").pop() ?? "",
    price: x.tier === "top" ? svc.top : svc.silver, tier: x.tier === "top" ? "top" : "silver", verified: row.status === "verified",
    steps: [
      { t: "ชำระเงิน", sub: row.status === "verified" ? "ตรวจสลิปแล้ว" : "ส่งสลิปแล้ว · รอทีมงานตรวจ", ok: true, href: "" },
      { t: "ข้อมูลส่วนตัว", sub: "ชื่อ เบอร์โทร LINE ที่พัก", ok: done.has(1), href: "form" },
      { t: "วันเวลาที่รับงาน", sub: "วัน ช่วงเวลา ชั่วโมงต่อวัน ประสบการณ์", ok: done.has(2), href: "form2" },
      { t: "ยืนยันตัวตน + บัญชีรับเงิน", sub: kyc === "rejected" ? "เอกสารต้องแก้ไข" : "บัตรประชาชน เซลฟี่ บัญชีธนาคาร", ok: kyc !== "none" && kyc !== "rejected", href: kyc === "rejected" ? "rejected" : "kyc" },
    ],
    contractDone: !!row.contract_accepted_at,
    card: x.card ?? { activities: [], places: [], partner_spas: [], skills: [] },
  };
  return <ProfileHub d={data} />;
}
