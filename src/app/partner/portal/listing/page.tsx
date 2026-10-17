import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { getListing } from "@/lib/partner/portal";
import { ListingClient } from "./client";
import { AvatarEditor } from "@/components/avatar-editor";

export const dynamic = "force-dynamic";

export default async function PartnerListingPage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const l = await getListing(p.id);
  const canPublish = p.account_status === "approved" || p.account_status === "active";
  return (
    <>
      <h1 className="font-display text-2xl font-semibold mt-5">หน้าร้านของฉัน</h1>
      <section className="mt-4 rounded-2xl border border-ink-600 p-4 flex flex-col items-center gap-1"><b className="text-sm self-start">รูปโปรไฟล์ / โลโก้</b><span className="text-xs text-ink-300 self-start">แสดงบนหน้ารายชื่อโรงแรม · สปา และหน้าร้านของคุณ</span><AvatarEditor as="partner" letter={p.business_name} size={120} /></section>
      <ListingClient initial={{ ...l, type: l.type ?? p.type, area: l.area ?? p.province }} name={p.business_name} canPublish={canPublish} />
    </>
  );
}
