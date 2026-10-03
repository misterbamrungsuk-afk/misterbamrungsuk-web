export const metadata = { title: "ออฟไลน์ — Mister Bamrungsuk" };

export default function OfflinePage() {
  return (
    <main className="app-frame flex flex-col items-center justify-center gap-4 px-9 text-center">
      <div className="w-28 h-28 rounded-full border border-ink-600 grid place-items-center text-ink-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
          <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" strokeLinecap="round" />
          <circle cx="12" cy="19" r="1" />
          <path d="M3 3l18 18" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold">ไม่มีการเชื่อมต่อ</h1>
      <p className="text-ink-300 text-sm leading-relaxed">ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ การจองและเงินในระบบกลางของคุณยังปลอดภัย</p>
      <a href="/home" className="mt-2 h-12 px-7 rounded-2xl bg-ink-100 text-ink-950 font-semibold grid place-items-center">ลองใหม่</a>
    </main>
  );
}
