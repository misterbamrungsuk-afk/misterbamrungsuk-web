import { VenueList } from "./venues";

export const dynamic = "force-dynamic";
export const metadata = { title: "โรงแรมพาร์ทเนอร์ · Mister Bamrungsuk" };

export default async function HotelsPage({ searchParams }: { searchParams: Promise<{ province?: string }> }) {
  return <VenueList type="โรงแรม" province={(await searchParams).province} />;
}
