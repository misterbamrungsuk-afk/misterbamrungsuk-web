import { LegalPage } from "@/components/join/legal-page";
import { consentSections } from "@/components/join/consent-doc";
import { CONSENT_VERSION } from "@/lib/join/legal";

export const metadata = { title: "หนังสือให้ความยินยอม (ผู้สมัครงาน) · Mister Bamrungsuk" };

export default function ConsentPage() {
  return <LegalPage title="หนังสือให้ความยินยอมการเก็บรวบรวม ใช้หรือเปิดเผยข้อมูลส่วนบุคคล (ผู้สมัครงาน)" version={CONSENT_VERSION} sections={consentSections("partner")} />;
}
