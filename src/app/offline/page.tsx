/* eslint-disable @next/next/no-img-element */
export const metadata = { title: "ไม่มีสัญญาณ — Mister Bamrungsuk" };

// บอร์ด C-Offline "ไม่มีสัญญาณอินเทอร์เน็ต" — หน้า service worker แสดงเมื่อออฟไลน์ (ไม่มีข้อมูลนัดในเครื่อง → ไม่แสดงการ์ดนัด)
export default function OfflinePage() {
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <div className="mx-auto w-full max-w-[480px] min-h-dvh relative">
        <header className="flex items-center h-16 px-4" style={{ background: "#251d1b" }}>
          <a href="/" className="inline-flex items-center gap-2 font-brand text-[12px] text-[#e8c472]"><img src="/brand/logo.png" alt="" width={40} height={40} className="w-10 h-10 object-contain" />Mister Bamrungsuk</a>
        </header>
        <main className="flex flex-col items-center text-center gap-[14px]" style={{ padding: "80px 24px 160px" }}>
          <div className="w-[88px] h-[88px] rounded-full bg-[#211a18] grid place-items-center text-[#e8c472]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /><path d="M3 3l18 18" /></svg>
          </div>
          <h1 className="m-0 font-semibold text-[22px]">ไม่มีสัญญาณอินเทอร์เน็ต</h1>
          <p className="m-0 max-w-[280px] text-[13px] font-light text-[#d9c9b4]">นัดที่กำลังดำเนินอยู่ยังปลอดภัย · ถ้าฉุกเฉินโทร 191 หรือกด SOS เมื่อสัญญาณกลับมา</p>
        </main>
        <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-2" style={{ padding: "12px 16px calc(28px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
          <a href="/" className="min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center">ลองใหม่</a>
          <a href="tel:191" className="min-h-11 grid place-items-center text-[14px] text-[#ff8a9a]">SOS · โทร 191</a>
        </div>
      </div>
    </div>
  );
}
