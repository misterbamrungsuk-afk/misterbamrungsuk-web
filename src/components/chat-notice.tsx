// ป้ายเตือนบนห้องแชท (ลูกค้า + Part-Time): แชทถูกบันทึก · ห้ามช่องทางนอกแอป · ฝ่าฝืนซ้ำอาจถูกระงับ
export function ChatNotice() {
  return (
    <div role="note" className="flex gap-2.5 items-start rounded-[14px] text-[12.5px] leading-[1.55] font-light text-[#d9c9b4]" style={{ padding: "10px 12px", background: "rgba(201,40,61,.08)", border: "1px solid rgba(255,138,154,.28)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8a9a" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 mt-0.5"><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h0" /></svg>
      <span><b className="font-semibold text-[#ff8a9a]">แชทนี้ถูกบันทึกเพื่อความปลอดภัยของทั้ง 2 ฝ่าย</b><br />ห้ามแลกเบอร์โทร LINE โซเชียล หรือนัดจ่ายเงินนอกแอป · ข้อความต้องห้ามจะไม่ถูกส่ง และทีมงานจะตรวจสอบ ฝ่าฝืนซ้ำอาจถูกระงับบัญชี</span>
    </div>
  );
}
