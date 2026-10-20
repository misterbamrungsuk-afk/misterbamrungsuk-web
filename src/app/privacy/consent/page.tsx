import { LegalPage } from "@/components/join/legal-page";
import { consentSections } from "@/components/join/consent-doc";
import { CONSENT_VERSION } from "@/lib/join/legal";

export const metadata = { title: "หนังสือให้ความยินยอม (ลูกค้า) · Mister Bamrungsuk" };

export default function CustomerConsentPage() {
  return <LegalPage title="หนังสือให้ความยินยอมการเก็บรวบรวม ใช้หรือเปิดเผยข้อมูลส่วนบุคคล (ลูกค้า)" version={CONSENT_VERSION} sections={consentSections("customer")} back={{ href: "/", label: "กลับหน้าแรก" }} />;
}
