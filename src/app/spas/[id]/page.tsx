import { VenueDetail } from "../../hotels/venues";

export const dynamic = "force-dynamic";

export default async function SpaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <VenueDetail type="สปา" id={(await params).id} />;
}
