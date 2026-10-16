"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Onboarding "เริ่มต้นใช้งาน" — รูป 3 ใบ · ยินดีต้อนรับ · ขอตำแหน่ง · ติ๊กอายุ 20+ และข้อกำหนด → สมัครสมาชิก
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GOLD = "#e8c472";
const pm: React.CSSProperties = { display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 16, background: "#211a18", border: "1px solid rgba(243,234,217,0.07)" };

export default function OnboardingPage() {
  const router = useRouter();
  const [loc, setLoc] = useState<"ask" | "ok" | "no">("ask");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    try { navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((p) => { if (p.state === "granted") setLoc("ok"); }).catch(() => {}); } catch {}
  }, []);
  const askLoc = () => {
    if (!navigator.geolocation) return setLoc("no");
    navigator.geolocation.getCurrentPosition(() => setLoc("ok"), () => setLoc("no"), { timeout: 10000 });
  };
  const start = () => { if (agree) router.push("/auth/register"); };

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <main className="mx-auto w-full max-w-[480px] md:max-w-[960px] min-h-dvh flex flex-col pb-[110px] md:pb-10 relative">
        <div className="flex justify-between items-center" style={{ padding: "18px 20px" }}>
          <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="flex items-center gap-2 font-brand text-[12px] md:text-[14px] text-[#e8c472] hover:text-[#e8c472]">
            <img src="/brand/logo.png" alt="" width={40} height={40} className="w-10 h-10 object-contain" />Mister Bamrungsuk
          </Link>
          <Link href="/auth/register" className="text-[14px] text-[#d9c9b4] min-h-11 flex items-center px-1 hover:text-[#d9c9b4]">ข้าม</Link>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-10 md:items-center md:px-5 md:pt-6">
          <div className="flex gap-[10px] h-[280px] md:h-[440px]" style={{ padding: "6px 20px 0" }}>
            <img src="/brand/c/onboard-1.jpg" alt="" className="h-full object-cover rounded-[22px] min-w-0" style={{ flex: 1.2 }} />
            <div className="flex-1 flex flex-col gap-[10px] min-w-0">
              <img src="/brand/c/onboard-2.jpg" alt="" className="w-full flex-1 min-h-0 object-cover rounded-[22px]" />
              <img src="/brand/c/onboard-3.jpg" alt="" className="w-full flex-1 min-h-0 object-cover rounded-[22px]" />
            </div>
          </div>

          <div>
            <div style={{ padding: "26px 20px 0" }}>
              <div className="text-[12px] font-semibold" style={{ color: GOLD }}>ยินดีต้อนรับ</div>
              <h1 className="font-semibold text-[28px] md:text-[34px] leading-[1.25] m-0" style={{ marginTop: 6 }}>เพื่อนกิน เพื่อนเที่ยว ที่ไว้ใจได้</h1>
              <div className="text-[14px] text-[#d9c9b4]" style={{ marginTop: 6 }}>เพื่อนทุกคนยืนยันตัวตนแล้ว · เงินพักไว้กับเราจนจบนัด · มี SOS ตลอดนัด</div>
            </div>

            <div className="flex flex-col gap-[10px]" style={{ padding: "18px 20px 0" }}>
              <button type="button" onClick={askLoc} disabled={loc === "ok"} style={pm} className="text-left text-[#f3ead9]">
                <span className="w-[42px] h-[42px] rounded-xl grid place-items-center shrink-0" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                </span>
                <span className="grow min-w-0"><b className="font-medium">ตำแหน่ง</b><span className="block text-[12px] text-[#d9c9b4] font-light">เจอเพื่อนใกล้คุณ และดูได้ว่าเพื่อนมาถึงไหนแล้ว</span></span>
                <span className="text-[13px] font-light shrink-0" style={{ color: loc === "ok" ? "#5EDB98" : loc === "no" ? "#ff8a9a" : GOLD }}>{loc === "ok" ? "อนุญาตแล้ว" : loc === "no" ? "ไม่อนุญาต" : "อนุญาต"}</span>
              </button>
              <label style={{ ...pm, cursor: "pointer" }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="w-5 h-5 shrink-0" />
                <span className="text-[14px]">ฉันมีอายุ 20 ปีขึ้นไป และยอมรับ <Link href="/page/terms" className="text-[#e8c472]">ข้อกำหนด</Link></span>
              </label>
            </div>

            <div className="fixed md:static left-0 right-0 bottom-0 mx-auto max-w-[480px] md:max-w-none" style={{ padding: "12px 20px calc(16px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
              <button type="button" onClick={start} disabled={!agree} className="w-full h-14 rounded-2xl font-semibold text-[17px] text-[#1b130b]" style={{ background: GOLD, opacity: agree ? 1 : 0.45 }}>เริ่มใช้งาน</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
