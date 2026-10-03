import { LegalPage } from "@/components/join/legal-page";
import { TERMS, TERMS_VERSION } from "@/lib/join/legal";

export const metadata = { title: "ข้อกำหนดการสมัคร · Mister Bamrungsuk" };

export default function TermsPage() {
  return <LegalPage title="ข้อกำหนดและเงื่อนไขการสมัคร" version={TERMS_VERSION} sections={TERMS} />;
}
