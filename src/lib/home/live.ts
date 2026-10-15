import "server-only";
import { createHash } from "crypto";
import { getEarnings } from "@/lib/join/earnings-settings";
import { ageFrom } from "@/lib/join/form";
import { extraOf, listApplicants, type Applicant } from "@/lib/join/store";
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
  return rows.map((a) => {
    const x = extraOf(a);
    const id = publicId(a.mb_code);
    const top = x.tier === "top";
    const svc = a.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
    const acts = [...new Set([...(a.package === "B" ? ["massage" as Act] : []), ...(x.card?.activities ?? []).map((t) => ACT_OF[t]).filter(Boolean)])] as Act[];
    const area = (x.areas ?? [])[0]?.split(" › ") ?? [];
    return {
      id, nick: a.nickname, age: a.birthdate ? ageFrom(a.birthdate) ?? 0 : 0, img: `/api/public/pt-photo?id=${id}&i=0`, top, rating: "ใหม่",
      reviews: 0, jobs: 0, years: 0, height: a.height || 0, langs: "TH",
      // แสดงระดับเขต/อำเภอ (ไม่ลงถึงแขวง) · จังหวัดแสดงเมื่อไม่ใช่กรุงเทพฯ
      area: area[1] || area[0] || "กรุงเทพฯ", prov: area[0] && area[0] !== "กรุงเทพฯ" ? area[0] : undefined,
      acts: acts.length ? acts : ["eat"], free: 0, bio: x.listing?.title || a.intro || "Part-Time ที่ผ่านการอบรมมาตรฐาน Mister Bamrungsuk",
      review: ["", ""], real: true, price: top ? svc.top : svc.silver, photos: Math.min(9, photoPaths(a).length), pos: mainPos(a),
    } satisfies Person;
  });
}

export async function findLiveByPublicId(id: string) {
  return (await getLiveApplicants()).find((a) => publicId(a.mb_code) === id) ?? null;
}
