import "server-only";
import { MASSAGE_SKILL, isMassage } from "@/lib/join/pt-ui";
import { SECRET_SILHOUETTES } from "./people";
import { tierPrice } from "@/lib/join/config";
import { createHash } from "crypto";
import { getAttendance } from "@/lib/join/store";
import { coreDone } from "@/lib/join/training";
import { getEarnings } from "@/lib/join/earnings-settings";
import { ageFrom } from "@/lib/join/form";
import { extraOf, listApplicants, type Applicant } from "@/lib/join/store";
import { ratingSummary } from "@/lib/bookings/day";
import { activeBoosts } from "@/lib/join/boost";
import type { Act, Person } from "./people";

// Part-Time จริงบนหน้าแรก — เงื่อนไข: ชำระแล้ว (verified) · KYC ผ่าน · มีรูป · แอดมินเปิด "แสดงบนหน้าแรก" · ไม่พักงาน · ไม่ขอลบบัญชี
// id สาธารณะ = r + hash สั้นของรหัส (ไม่เปิดเผยรหัสผู้สมัคร)

const ACT_OF: Record<string, Act> = { "กิน & เที่ยว": "eat", "ดินเนอร์": "eat", "คาเฟ่": "cafe", "ช่างภาพ": "photo", "ถ่ายรูป": "photo", "ดูหนัง": "movie", "ออกกำลัง": "gym", "ฟิตเนส": "gym", "นั่งชิล": "chill" };

export const publicId = (mb: string) => "r" + createHash("sha256").update(`mb-public:${mb}`).digest("hex").slice(0, 10);

export function isLive(a: Applicant) {
  const x = extraOf(a);
  return a.status === "verified" && x.kyc_status === "approved" && !!x.listed && !x.work?.paused && !x.delete_requested_at && !!((x.photos?.length ?? 0) || a.docs.photo);
}

/** รูปที่เปิดสาธารณะได้ (เรียงตามรูปโปรไฟล์ · รูปแรก = รูปหลัก) */
export const photoPaths = (a: Applicant) => { const x = extraOf(a); return x.photos?.length ? x.photos : a.docs.photo ? [a.docs.photo] : []; };
/** ตำแหน่งรูปหลักที่ Part-Time ปรับไว้ (ไม่ได้ปรับ = กลาง) */
export const mainPos = (a: Applicant) => { const p = photoPaths(a)[0]; return (p && extraOf(a).photo_pos?.[p]) || undefined; };

export async function getLiveApplicants() {
  const rows = await listApplicants("verified").catch(() => [] as Applicant[]);
  return rows.filter(isLive);
}

export async function getLivePeople(): Promise<Person[]> {
  const [rows, cfg] = await Promise.all([getLiveApplicants(), getEarnings()]);
  const att = new Map(await Promise.all(rows.map(async (a) => [a.id, await getAttendance(a.id).catch(() => ({} as Record<number, boolean>))] as const)));
  const [stars, boosts] = await Promise.all([ratingSummary(rows.map((a) => a.id)).catch(() => new Map<string, { avg: number; count: number }>()), activeBoosts().catch(() => new Map<string, string>())]);
  return rows.map((a) => {
    const st = stars.get(a.id);
    const x = extraOf(a);
    const id = publicId(a.mb_code);
    const secret = x.tier === "secret", top = x.tier === "top" || secret;
    const svc = a.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
    // นวดผ่อนคลาย: สายนวด (B) หรือสายอื่นที่แนบใบรับรอง + เลือกสกิล/กิจกรรมนวด (เช่น ลิงก์เชิญที่นวดได้)
    const massage = a.package === "B" || (!!a.docs.cert_doc && (!!x.card?.skills?.includes(MASSAGE_SKILL) || !!x.card?.activities?.some(isMassage)));
    const acts = [...new Set([...(massage ? ["massage" as Act] : []), ...(x.card?.activities ?? []).map((t) => ACT_OF[t]).filter(Boolean)])] as Act[];
    const area = (x.areas ?? [])[0]?.split(" › ") ?? [];
    return {
      id, nick: a.nickname, age: a.birthdate ? ageFrom(a.birthdate) ?? 0 : 0, img: `/api/public/pt-photo?id=${id}&i=0`, top, rating: st?.count ? st.avg.toFixed(1) : "ใหม่",
      reviews: st?.count ?? 0, jobs: 0, years: 0, height: a.height || 0, langs: "TH",
      // แสดงระดับเขต/อำเภอ (ไม่ลงถึงแขวง) · จังหวัดแสดงเมื่อไม่ใช่กรุงเทพฯ
      area: x.geo ? `แถว${x.geo.label}` : area[1] || area[0] || "กรุงเทพฯ", prov: x.geo ? undefined : area[1] && area[0] !== "กรุงเทพฯ" ? area[0] : undefined,
      ...(x.geo ? { geo: [x.geo.lat, x.geo.lng] as [number, number] } : {}),
      acts: acts.length ? acts : ["eat"], free: 0, bio: x.listing?.title || a.intro || "Part-Time ที่ผ่านการอบรมมาตรฐาน Mister Bamrungsuk",
      ...(x.group === "tom" ? { group: "tom" as const } : {}),
      review: ["", ""], real: true, trained: coreDone(att.get(a.id) ?? {}), checked: a.criminal_check === "passed", boost: boosts.has(a.id), price: tierPrice(x, svc), ...(secret ? { secret: true } : {}), photos: Math.min(9, photoPaths(a).length), pos: mainPos(a),
      // Secret: ไม่โชว์หน้า → รูปเงา/หันหลังแทน (เลือกตามรหัส ให้คงที่) · ไม่เปิดแกลเลอรีรูปจริง
      ...(secret ? { img: SECRET_SILHOUETTES[x.group === "tom" ? "tom" : "man"][[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 2], photos: 0, pos: undefined } : {}),
    } satisfies Person;
  });
}

export async function findLiveByPublicId(id: string) {
  return (await getLiveApplicants()).find((a) => publicId(a.mb_code) === id) ?? null;
}
