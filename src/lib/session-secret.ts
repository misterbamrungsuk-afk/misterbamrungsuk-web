// รหัสลงลายเซ็น session/โทเคนทั้งระบบ (ลูกค้า · พาร์ทเนอร์ · ร้านค้า · ลิงก์ออเดอร์)
// เว็บจริง (Vercel) ไม่มี / สั้นกว่า 32 ตัว = ล้มทันที — ห้ามตกไปใช้ค่าสำรองที่ใครก็ปลอมโทเคนได้
// ทุก deployment บน Vercel (รวม Preview) = เข้มแบบเว็บจริง — Preview มักใช้ฐานข้อมูลจริงร่วมกัน ห้ามมีค่าสำรอง/บัญชีสาธิต
export const isProdDeploy = () => !!process.env.VERCEL || process.env.VERCEL_ENV === "production";

export function sessionSecret(): string {
  const v = process.env.ADMIN_SESSION_SECRET;
  if (v && v.length >= 32) return v;
  if (isProdDeploy()) throw new Error("ADMIN_SESSION_SECRET missing or shorter than 32 chars in production");
  return v || "hamoo-demo-secret";
}
