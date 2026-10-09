import { getCovers } from "@/lib/covers";
import { JoinSalePage } from "./join-sale";

export const revalidate = 60;

export const metadata = { title: "รับสมัคร Part-Time — Mister Bamrungsuk" };

// โปสเตอร์มาจากแอดมิน "รูปหน้าปก" (ช่อง join_poster)
export default async function JoinPage() {
  const [poster] = await getCovers("join_poster");
  return <JoinSalePage poster={poster ?? "/brand/poster.jpg"} />;
}
