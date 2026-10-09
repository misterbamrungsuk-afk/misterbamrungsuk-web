import { PolicyTabs } from "./policy-tabs";

export const metadata = { title: "นโยบายร้านค้า · Mister Bamrungsuk" };

export default async function PolicyIndex({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = (await searchParams).tab;
  return <PolicyTabs initial={t === "shipping" || t === "privacy" ? t : "returns"} />;
}
