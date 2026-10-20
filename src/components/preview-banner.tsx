import Link from "next/link";

/** แถบ "ตัวอย่าง" บนหน้าที่เปิดให้ดูระหว่างโหมดรับสมัคร Part-Time (site-gate PT_ONLY) — ลอยบนสุด ไม่บังปุ่ม */
export function PreviewBanner({ at = "top", offset = 72 }: { at?: "top" | "bottom"; offset?: number }) {
  return (
    <div className="fixed inset-x-0 z-[60] flex justify-center pointer-events-none" style={at === "top" ? { top: `calc(env(safe-area-inset-top, 0px) + ${offset}px)` } : { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${offset}px)` }}>
      <Link href="/soon" data-preview-banner className="pointer-events-auto rounded-full text-[12.5px] font-semibold text-[#1b130b] hover:text-[#1b130b] shadow-[0_6px_18px_rgba(0,0,0,.45)]" style={{ padding: "6px 14px", background: "#e8c472" }}>
        ตัวอย่าง · เปิดให้บริการเร็ว ๆ นี้
      </Link>
    </div>
  );
}
