import { notFound } from "next/navigation";
import { canResume } from "@/lib/join/resume";
import { extraOf, getByMb } from "@/lib/join/store";
import { Forbidden } from "../../../_kyc/ui";
import { PhotosClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "รูปโปรไฟล์ — Mister Bamrungsuk" };

// บอร์ด ProviderPhotos "เพิ่มรูปโปรไฟล์ (สูงสุด 9 รูป)"
export default async function PhotosPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  return <PhotosClient mb={mb} t={t ?? ""} initial={extraOf(row).photos ?? []} />;
}
