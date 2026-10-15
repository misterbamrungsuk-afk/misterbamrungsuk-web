import { redirect } from "next/navigation";

// ลำดับตาม canvas: ชำระเงินก่อน แล้วกรอกใบสมัครจากโปรไฟล์ของฉัน — ลิงก์เก่า /join/apply พาไปหน้าชำระเงิน
export default async function ApplyRedirect({ searchParams }: { searchParams: Promise<{ pkg?: string }> }) {
  const { pkg } = await searchParams;
  redirect(pkg === "A" || pkg === "B" ? `/join/pay?pkg=${pkg}` : "/join");
}
