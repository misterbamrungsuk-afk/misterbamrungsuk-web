import { VenueDetail } from "../../hotels/venues";

import { partnerDetail } from "@/lib/market/partners";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await partnerDetail("สปา", (await params).id);
  return { title: p ? `${p.name} · สปาพาร์ทเนอร์ · Mister Bamrungsuk` : "สปาพาร์ทเนอร์ · Mister Bamrungsuk" };
}

export default async function SpaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <VenueDetail type="สปา" id={(await params).id} />;
}
