import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { isHotelPartner, listRoomTypes } from "@/lib/hotels/store";
import { RoomsClient } from "./client";

export const dynamic = "force-dynamic";

// ประเภทห้องพัก (เฉพาะโรงแรม) — ลูกค้าเลือกห้อง/วันที่และจ่ายจากกระเป๋าในหน้าโรงแรม
export default async function PartnerRoomsPage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  if (!(await isHotelPartner(p))) redirect("/partner/portal/listing");
  const rooms = (await listRoomTypes(p.id).catch(() => [])).filter((t) => t.active);
  return (
    <>
      <h1 className="font-display text-2xl font-semibold mt-5">ห้องพัก</h1>
      <p className="text-xs text-ink-300 mt-1">ตั้งประเภทห้อง ราคาต่อคืน และจำนวนห้อง · ลูกค้าจองและชำระผ่านแพลตฟอร์ม ระบบกันห้องเต็มให้อัตโนมัติ</p>
      <RoomsClient initial={rooms.map((t) => ({ id: t.id, name: t.name, price_baht: t.price_satang / 100, capacity: t.capacity, rooms: t.rooms, photos: t.photos, description: t.description ?? "" }))} />
    </>
  );
}
