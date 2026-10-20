import { LegalPage } from "@/components/join/legal-page";
import { CUSTOMER_PRIVACY, PRIVACY_VERSION } from "@/lib/join/legal";

export const metadata = { title: "ประกาศความเป็นส่วนตัว (ลูกค้า) · Mister Bamrungsuk" };

// ประกาศการคุ้มครองข้อมูลส่วนบุคคล สำหรับลูกค้า (ผู้ใช้บริการ) — ผู้สมัคร Part-Time ดูที่ /join/privacy
export default function CustomerPrivacyPage() {
  return <LegalPage title="ประกาศการคุ้มครองข้อมูลส่วนบุคคล (ลูกค้า)" version={PRIVACY_VERSION} sections={CUSTOMER_PRIVACY} back={{ href: "/", label: "กลับหน้าแรก" }} />;
}
