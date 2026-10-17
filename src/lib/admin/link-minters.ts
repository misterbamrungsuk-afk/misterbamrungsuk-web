import "server-only";
import { extraOf, type Applicant } from "@/lib/join/store";

const LINK_DAYS = 30;
export type Minter = { email: string; at: string };

/** แอดมินทุกคนที่ออกลิงก์ให้ผู้สมัครคนนี้ภายใน 30 วัน (link_by_all + link_by ล่าสุด) — ใช้กันอนุมัติ KYC เอง */
export function linkMinters(row: Applicant): Minter[] {
  const x = extraOf(row) as unknown as { link_by?: Minter | null; link_by_all?: Minter[] | null };
  // ระหว่างที่ store.ts ยังไม่ส่ง link_by_all ผ่าน extraOf — อ่านจาก docs.extra / แถว (โหมดเดโม) ตรง ๆ ด้วย
  const raw = row as unknown as { link_by_all?: Minter[] | null; docs?: { extra?: { link_by_all?: Minter[] | null } } };
  const all = [...(x.link_by_all ?? raw.docs?.extra?.link_by_all ?? raw.link_by_all ?? []), ...(x.link_by ? [x.link_by] : [])];
  const cut = Date.now() - LINK_DAYS * 86400_000;
  const seen = new Map<string, Minter>();
  for (const m of all) {
    if (!m?.email || !(Date.parse(m.at) > cut)) continue;
    const e = m.email.trim().toLowerCase();
    const prev = seen.get(e);
    if (!prev || Date.parse(prev.at) < Date.parse(m.at)) seen.set(e, { email: e, at: m.at });
  }
  return [...seen.values()];
}
