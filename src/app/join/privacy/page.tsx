import { LegalPage } from "@/components/join/legal-page";
import { PRIVACY, PRIVACY_VERSION } from "@/lib/join/legal";

export const metadata = { title: "นโยบายความเป็นส่วนตัว · Mister Bamrungsuk" };

export default function PrivacyPage() {
  return <LegalPage title="นโยบายความเป็นส่วนตัว" version={PRIVACY_VERSION} sections={PRIVACY} />;
}
