import { HomeFeed } from "./home-feed";
import { homeFeedProps } from "./home-props";
import { getSite } from "@/i18n/server";
import { redirect } from "next/navigation";

export async function generateMetadata() { return { title: (await getSite()).home.metaTitle }; }

// หน้าแรกลูกค้า (บอร์ด C-Home): ค้นหาเพื่อน + ทางแยก ร่วมงานกับเรา / สินค้า / โปรไฟล์ Part-Time + เมนูลูกค้า
// หน้าตัวอย่างสำหรับผู้สนใจร่วมทีมแยกไปที่ /join/showcase · หมอนวดแยกไป /massage
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ svc?: string }> }) {
  // ?svc=eat|massage = ลิงก์ตรงไปบริการนั้น (โฆษณา / LINE OA)
  const q = (await searchParams).svc;
  if (q === "massage") redirect("/massage"); // ลิงก์เก่า (โฆษณา / LINE) → หน้าแยกหมอนวด
  const svc = q === "eat" || q === "massage" ? q : "";
  return <HomeFeed {...await homeFeedProps()} svc={svc} />;
}
