"use client";

// สถานที่ที่ผู้ใช้กด "นัดเพื่อนที่นี่" จากหน้า /spas/[id] หรือ /hotels/[id]
// เก็บใน sessionStorage → หน้าเลือกบริการ /book/[id] ใช้เลือกสถานที่ให้อัตโนมัติ (best effort ไม่กระทบ flow เดิม)
export type PickedPlace = { kind: "spa" | "hotel"; id: string; name: string; area: string };
const KEY = "mb_place";

export function savePlace(p: PickedPlace) {
  try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}
export function readPlace(): PickedPlace | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as PickedPlace | null;
    return v && (v.kind === "spa" || v.kind === "hotel") && typeof v.id === "string" ? v : null;
  } catch { return null; }
}
export function clearPlace() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
