import { VenueDetail } from "../venues";

export const dynamic = "force-dynamic";

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <VenueDetail type="โรงแรม" id={(await params).id} />;
}
