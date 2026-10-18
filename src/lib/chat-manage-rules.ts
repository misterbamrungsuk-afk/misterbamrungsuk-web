// กติกาจัดการแชท (ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ) — ดู src/lib/bookings/chat-manage.ts
/** ยกเลิกการส่งได้ภายใน 24 ชม. หลังส่ง */
export const UNSEND_MS = 24 * 3600_000;
export const UNSENT_TEXT = "ยกเลิกการส่งข้อความแล้ว";
/** นัดที่ยังไม่จบ — ลบกล่องแชทไม่ได้ (ซ่อนได้อย่างเดียว) */
export const CHAT_ACTIVE = ["requested", "accepted", "checked_in", "cancel_requested", "disputed"];
