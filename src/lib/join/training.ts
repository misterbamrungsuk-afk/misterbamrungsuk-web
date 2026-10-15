// ตารางอบรมกลุ่ม (ตามบอร์ด TrainingCohort) — session เริ่มที่ 1
export const TRAINING = {
  group: "กลุ่ม 1",
  dates: "15–16 พ.ย. 2569",
  datesLong: "15–16 พ.ย. 2569 (2 วัน)",
  /** ข้อความช่วงอบรมบนหน้าผู้สมัคร (บอร์ด P-Done / P-Training) */
  window: "ภายใน 20 พ.ย. 2569",
  venue: "MB Studio ทองหล่อ ซ.10",
  openService: "30 พ.ย. 2569",
  requiredCore: 4,
};

export const TRAINING_SESSIONS = [
  { session: 1, day: "15", mon: "พ.ย.", title: "ปฐมนิเทศ & มารยาทบริการ", meta: "09:00–12:00 · MB Studio ทองหล่อ" },
  { session: 2, day: "15", mon: "พ.ย.", title: "บุคลิกภาพ & การดูแลลูกค้า", meta: "13:00–17:00 · MB Studio ทองหล่อ" },
  { session: 3, day: "16", mon: "พ.ย.", title: "ความปลอดภัย & SOS", meta: "09:00–11:00 · MB Studio ทองหล่อ" },
  { session: 4, day: "16", mon: "พ.ย.", title: "มาตรฐานการนวด (เพื่อนกินเที่ยว · นวด)", meta: "11:00–14:00 · MB Studio ทองหล่อ" },
  { session: 5, day: "16", mon: "พ.ย.", title: "ทดสอบ & ถ่ายรูปโปรไฟล์", meta: "14:30–17:00 · MB Studio ทองหล่อ" },
] as const;
