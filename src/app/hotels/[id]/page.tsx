import { VenueDetail } from "../venues";

import { partnerDetail } from "@/lib/market/partners";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await partnerDetail("โรงแรม", (await params).id);
  return { title: p ? `${p.name} · โรงแรมพาร์ทเนอร์ · Mister Bamrungsuk` : "โรงแรมพาร์ทเนอร์ · Mister Bamrungsuk" };
}

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <VenueDetail type="โรงแรม" id={(await params).id} />;
}
