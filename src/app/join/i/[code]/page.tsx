/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CLOSE_AT } from "@/lib/join/config";
import { nextCohortSeats } from "@/lib/join/cohorts";
import { findInvite } from "@/lib/join/invites";
import { JoinSalePage } from "../../join-sale";

export const dynamic = "force-dynamic";
// ปกลิงก์ (LINE / Facebook / Messenger) แยกจากหน้าสมัครปกติ — เห็นทันทีว่าเป็นคำเชิญพิเศษ
const OG_DESC = "สมัครฟรี ไม่มีค่าสมัคร · ได้ระดับ TOP ทันที · ลิงก์ส่วนตัว";
export const metadata = {
  title: "✦ คำเชิญพิเศษ · Part-Time — Mister Bamrungsuk",
  description: OG_DESC,
  robots: { index: false },
  openGraph: { title: "✦ คำเชิญพิเศษ · เพื่อนกินเที่ยว Part-Time", description: OG_DESC, siteName: "Mister Bamrungsuk", images: [{ url: "/brand/og-invite.jpg", width: 1200, height: 630 }], locale: "th_TH", type: "website" },
  twitter: { card: "summary_large_image", title: "✦ คำเชิญพิเศษ · เพื่อนกินเที่ยว Part-Time", description: OG_DESC, images: ["/brand/og-invite.jpg"] },
};

// บอร์ด JoinInvite — ลิงก์เชิญ /join/i/[รหัส] · ค่าสมัครเท่าสมัครปกติ (ลิงก์เป็นช่องทางเข้า + ป้าย) · ลิงก์ใช้ไม่ได้ → แจ้งเหตุผล + ไปหน้าสมัครปกติ
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const { state } = await findInvite(code);
  if (state !== "ok") {
    const why = state === "full" ? "ลิงก์เชิญนี้มีผู้ใช้ครบจำนวนแล้ว" : state === "expired" ? "ลิงก์เชิญนี้หมดอายุแล้ว" : state === "off" ? "ลิงก์เชิญนี้ถูกปิดแล้ว" : "ไม่พบลิงก์เชิญนี้";
    return (
      <main className="mb-v7 min-h-dvh grid place-items-center text-center" style={{ background: "#171211", color: "#f3ead9", padding: 24 }}>
        <div className="flex flex-col items-center gap-3 max-w-[420px]">
          <img src="/brand/logo.png" alt="Mister Bamrungsuk" width={64} height={64} className="w-16 h-16 object-contain" />
          <h1 className="m-0 text-[22px] font-semibold">{why}</h1>
          <p className="m-0 text-[14px] font-light text-[#d9c9b4]">ติดต่อผู้ที่ส่งลิงก์ให้คุณเพื่อขอลิงก์ใหม่ หรือสมัครแบบปกติได้ที่หน้ารับสมัคร</p>
          <Link href="/join" className="mt-2 min-h-12 px-6 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ไปหน้ารับสมัคร</Link>
        </div>
      </main>
    );
  }
  const s = await nextCohortSeats().catch(() => ({ cohort: "", left: 0, quota: 0, full: true }));
  return <JoinSalePage seats={{ left: s.left, quota: s.quota, cohort: s.cohort, closed: s.full || Date.now() > Date.parse(CLOSE_AT) }} invite={code} />;
}
