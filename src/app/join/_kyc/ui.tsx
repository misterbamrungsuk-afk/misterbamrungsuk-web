import Link from "next/link";

// ชิ้นส่วนร่วมของหน้า KYC / บัญชีรับเงิน / ผลตรวจ / อบรม (ตามบอร์ด D2/D3/D5/TrainingCohort)
export const C = { bg: "#0e0a0a", s1: "#241717", s2: "#21191a", ln: "rgba(240,200,90,.38)", red: "#b0182c", gold: "#f0c75a", goldL: "#ffd76a", tx: "#f6efe4", mut: "#cdbfb3", pink: "#FF8A97" };
export const RED_GRAD = "linear-gradient(100deg, #7e0a1e 0%, #c8102e 24%, #ff5068 50%, #c8102e 76%, #7e0a1e 100%)";

export function Page({ children, padBottom = true }: { children: React.ReactNode; padBottom?: boolean }) {
  return (
    <main className={`mb-page font-lux-body mx-auto w-full max-w-[480px] min-h-dvh relative ${padBottom ? "pb-40" : "pb-8"}`} style={{ background: C.bg, color: C.tx, fontVariantNumeric: "lining-nums" }}>
      {children}
    </main>
  );
}

export function StepHeader({ step, title, back }: { step: number; title: string; back: string }) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href={back} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full grid place-items-center" style={{ border: `1px solid ${C.ln}`, color: C.tx }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className="min-w-0">
          <div className="text-[11px] tracking-[1px] font-semibold" style={{ color: C.gold }}>ขั้นที่ {step} / 5</div>
          <div className="font-lux font-semibold text-lg">{title}</div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 px-4">
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className="h-1 rounded-[2px]" style={{ background: i <= step ? C.gold : C.ln }} />)}
      </div>
    </>
  );
}

export function Forbidden() {
  return (
    <Page padBottom={false}>
      <div className="px-4 pt-24 text-center flex flex-col items-center gap-3">
        <h1 className="font-lux text-2xl font-semibold">ลิงก์หมดอายุหรือไม่มีสิทธิ์</h1>
        <p className="text-sm" style={{ color: C.mut }}>กรุณาเปิดจากลิงก์ที่ได้รับหลังสมัคร หรือติดต่อแอดมินทาง LINE</p>
      </div>
    </Page>
  );
}

/** แถบปุ่มล่างจอ (ตรึงไว้ เหมือนบอร์ดที่วาง absolute bottom:24px) */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[448px] flex flex-col gap-3 z-10">{children}</div>;
}

export const ctaStyle: React.CSSProperties = {
  height: 56, borderRadius: 999, border: "1px solid rgba(245,210,110,.85)", background: RED_GRAD,
  boxShadow: "0 8px 24px rgba(255,40,70,.45)", color: "#fff", fontWeight: 600, fontSize: 17,
  display: "flex", alignItems: "center", justifyContent: "center", width: "100%",
};
