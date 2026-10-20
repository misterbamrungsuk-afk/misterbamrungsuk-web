import { LegalPage } from "@/components/join/legal-page";
import { PRIVACY, PRIVACY_VERSION } from "@/lib/join/legal";

export const metadata = { title: "ประกาศความเป็นส่วนตัว (ผู้สมัครงาน) · Mister Bamrungsuk" };

export default function PrivacyPage() {
  return <LegalPage title="ประกาศการคุ้มครองข้อมูลส่วนบุคคล (ผู้สมัครงาน)" version={PRIVACY_VERSION} sections={PRIVACY} />;
}
