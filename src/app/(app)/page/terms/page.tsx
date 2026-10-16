import Link from "next/link";
import { getMoney } from "@/lib/wallet/settings";
import { lineAddUrl } from "@/lib/join/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "ช่วยเหลือและนโยบาย — Mister Bamrungsuk" };

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";

// บอร์ด C-Legal "ช่วยเหลือและนโยบาย" — ปรับข้อความให้ตรงระบบจริง: ชำระผ่านกระเป๋าเงิน · กติกายกเลิกจากหลังบ้าน · ไม่มีโทรในแอป
export default async function TermsPage() {
  const m = await getMoney();
  const FAQ: [string, string][] = [
    ["เงินของฉันปลอดภัยไหม", `ปลอดภัยค่ะ เงินพักไว้กับเราจนจบนัด เพื่อนจะได้รับเมื่อคุณกดยืนยันจบนัด หรือเมื่อครบ ${m.autoCompleteHours} ชม. หลังเพื่อนแจ้งจบงานโดยไม่มีการแจ้งปัญหา`],
    ["ยกเลิกได้ถึงเมื่อไหร่", `${m.cancelRule} · เงินคืนเข้ากระเป๋าเงินในแอป`],
    ["ถ้าเพื่อนไม่มาตามนัด", "กด \"มีปัญหา? แจ้งเรา\" ในหน้าการจอง ทีมงานตรวจข้อมูลของทั้ง 2 ฝ่าย (แชท เวลาเช็กอิน) ปกติภายใน 24 ชม. ถ้าเพื่อนไม่มาจริง คืนเงินเต็ม 100% ระหว่างนั้นเงินยังพักไว้กับเรา"],
    ["ถ้าฉันไปไม่ทันหรือไม่ได้ไปตามนัด", "แจ้งเพื่อนในแชทหรือยกเลิกล่วงหน้า หากไม่มาโดยไม่แจ้ง ทีมงานพิจารณาตามหลักฐานของทั้ง 2 ฝ่าย และอาจไม่คืนค่าบริการ"],
    ["เพื่อนทุกคนผ่านการตรวจสอบอย่างไร", "เพื่อนทุกคนยืนยันเบอร์โทร ส่งบัตรประชาชน เซลฟีคู่บัตร และสำเนาเซ็นรับรองให้ทีมงานตรวจ ผ่านการอบรมก่อนเปิดรับงาน"],
    ["ลบบัญชีและข้อมูลของฉันได้ไหม", "ได้ค่ะ ไปที่ บัญชี → ลบบัญชี ข้อมูลส่วนบุคคลจะถูกลบภายใน 30 วันตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) ยกเว้นข้อมูลที่กฎหมายกำหนดให้เก็บ"],
  ];
  const SECTIONS: [string, string, string[]][] = [
    ["terms", "ข้อกำหนดการใช้งาน", ["ผู้ใช้ต้องมีอายุ 20 ปีขึ้นไป และให้ข้อมูลที่เป็นจริง", "แพลตฟอร์มเป็นตัวกลางนัดหมายเพื่อนกิน เพื่อนเที่ยว ไม่มีบริการทางเพศทุกกรณี", "ชำระเต็มจำนวนผ่านกระเป๋าเงินในแอปเท่านั้น เงินพักไว้กับเราจนจบนัด", "ห้ามนัดหรือชำระเงินนอกแอป ห้ามแลกเบอร์หรือช่องทางติดต่อ หากพบจะระงับบัญชี", "การยกเลิกและคืนเงินเป็นไปตามกติกาการยกเลิก"]],
    ["privacy", "นโยบายความเป็นส่วนตัว (PDPA)", ["เราเก็บเฉพาะข้อมูลที่จำเป็น เช่น ชื่อ เบอร์โทร อีเมล ประวัติการจองและการชำระเงิน", "เบอร์โทรของทั้งสองฝ่ายถูกซ่อน ติดต่อกันผ่านแชทในแอป", "ข้อมูลยืนยันตัวตนของเพื่อนเข้าถึงได้เฉพาะทีมตรวจสอบ", "คุณขอดู แก้ไข หรือลบข้อมูลได้ทุกเมื่อ ลบภายใน 30 วัน", "ไม่ขายหรือเปิดเผยข้อมูลแก่บุคคลภายนอก เว้นแต่กฎหมายกำหนด"]],
    ["conduct", "มาตรฐานและจรรยาบรรณของเพื่อน", ["ตรงเวลา แต่งกายสุภาพ และให้เกียรติลูกค้าตลอดนัด", "ไม่ให้หรือรับบริการทางเพศ ไม่ดื่มจนขาดสติระหว่างงาน", "ไม่ขอช่องทางติดต่อส่วนตัวหรือรับเงินนอกแอป", "เคารพขอบเขตและความเป็นส่วนตัวของลูกค้า", "ผิดเงื่อนไขจะได้รับใบเตือน ครบ 3 ครั้งระงับบัญชี กรณีร้ายแรงระงับทันที"]],
  ];
  const Ic = ({ d }: { d: string }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  return (
    <div className="pb-8">
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href="/profile" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 font-semibold text-[19px]">ช่วยเหลือและนโยบาย</h1>
      </div>
      <div className="rounded-[20px] bg-[#211a18] overflow-hidden" style={{ margin: "0 16px", border: `1px solid ${LN}` }}>
        {([["#terms", "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4", "ข้อกำหนดการใช้งาน"], ["#privacy", "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", "นโยบายความเป็นส่วนตัว (PDPA)"], ["#conduct", "M4 21V4h16v17l-8-4z", "มาตรฐานและจรรยาบรรณของเพื่อน"]] as const).map(([href, d, l], i) => (
          <a key={href} href={href} className="flex items-center gap-3 text-[15px] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "14px 16px", borderBottom: i < 2 ? `1px solid ${LN}` : "none" }}><Ic d={d} /><span className="flex-1">{l}</span></a>
        ))}
      </div>
      <div style={{ padding: "20px 16px 0" }}>
        <div className="font-medium text-[17px]">คำถามพบบ่อย</div>
        {FAQ.map(([q, a]) => (
          <details key={q} className="group" style={{ borderBottom: `1px solid ${LN}`, padding: "14px 0" }}>
            <summary className="flex justify-between gap-[10px] font-medium cursor-pointer list-none">{q}<span style={{ color: GOLD }} className="group-open:hidden">+</span><span style={{ color: GOLD }} className="hidden group-open:inline">−</span></summary>
            <div className="text-[13px] font-light text-[#d9c9b4] leading-[1.6] mt-1.5">{a}</div>
          </details>
        ))}
        {SECTIONS.map(([id, h, li]) => (
          <section key={id} id={id} className="rounded-[20px] bg-[#211a18]" style={{ marginTop: 22, padding: 16, border: `1px solid ${LN}` }}>
            <div className="font-medium text-[17px]">{h}</div>
            <ul className="m-0 mt-2 text-[13px] font-light text-[#d9c9b4] leading-[1.7]" style={{ paddingLeft: 18 }}>{li.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
        ))}
      </div>
      <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="h-[54px] rounded-2xl flex items-center justify-center gap-2 font-medium text-[#f3ead9] hover:text-[#f3ead9]" style={{ margin: "20px 16px 0", border: `1px solid ${LN}` }}>ติดต่อฝ่ายช่วยเหลือ (LINE)</a>
    </div>
  );
}
