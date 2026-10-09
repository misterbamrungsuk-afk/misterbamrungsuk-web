import { PartnerSalePage } from "./sale";
import { getCovers } from "@/lib/covers";

export const revalidate = 60;

export const metadata = {
  title: "Partner Program · Mister Bamrungsuk — By Madame Gor",
  description: "เปิดพื้นที่ให้สปา โรงแรม ร้านอาหาร และพาร์ทเนอร์ด้านเวลเนส เข้าถึงฐานลูกค้าผู้หญิงกลุ่มพรีเมียมโดยตรง",
};

export default async function PartnerPage() {
  const [hero] = await getCovers("partner_hero");
  return <PartnerSalePage hero={hero} />;
}
