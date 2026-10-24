import { PageHead } from "../admin-nav";

export const metadata = { title: "Collab MB x Bars · แอดมิน" };

// ระบบ Collab = MB x Bars (บอส/SIRI 24 ต.ค. 2569) — ยังไม่มีระบบ · เตรียมเมนูไว้ก่อน รอรายละเอียดการทำงาน
export default function CollabPage() {
  return (
    <>
      <PageHead title="Collab · MB x Bars" sub="ระบบร่วมกับบาร์ / ร้าน · กำลังเตรียม" />
      <section className="rounded-2xl border border-[rgba(240,200,90,.38)] p-5 flex flex-col gap-2 text-[14px] max-w-[720px]">
        <b className="text-[16px]">ยังไม่เปิดระบบ</b>
        <p className="m-0 text-[#cdbfb3]">เมนูนี้เตรียมไว้สำหรับระบบ Collab ระหว่าง Mister Bamrungsuk กับบาร์ / ร้านที่ร่วมโปรโมท · เมื่อกำหนดรูปแบบแล้ว (เช่น ร้านสมัครอย่างไร · จ่ายเงินแบบไหน · ส่วนแบ่ง) จะเพิ่มหน้าบริหารย่อยที่นี่ และยอดเงินเข้าจะแสดงในหน้า &quot;ยอดเงินเข้า&quot; ใต้ระบบ Collab</p>
      </section>
    </>
  );
}
