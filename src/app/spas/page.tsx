import { VenueList } from "../hotels/venues";

export const dynamic = "force-dynamic";
export const metadata = { title: "สปาพาร์ทเนอร์ · Mister Bamrungsuk" };

export default async function SpasPage({ searchParams }: { searchParams: Promise<{ province?: string }> }) {
  return <VenueList type="สปา" province={(await searchParams).province} />;
}
