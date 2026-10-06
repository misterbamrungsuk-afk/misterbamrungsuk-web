import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { getListing } from "@/lib/partner/portal";
import { ListingClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PartnerListingPage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const l = await getListing(p.id);
  const canPublish = p.account_status === "approved" || p.account_status === "active";
  return (
    <>
      <h1 className="font-display text-2xl font-semibold mt-5">หน้าร้านของฉัน</h1>
      <ListingClient initial={{ ...l, type: l.type ?? p.type, area: l.area ?? p.province }} name={p.business_name} canPublish={canPublish} />
    </>
  );
}
