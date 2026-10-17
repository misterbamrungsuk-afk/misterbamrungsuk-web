import { redirect } from "next/navigation";

// หน้านี้เคยเป็นข้อมูลตัวอย่าง (โหมดเดโม) — รอบเปิดใช้จริงพาไปหน้าที่ใช้ข้อมูลจริงแทน · ส่ง query ต่อ (เช่น ?denied=1 ให้แบนเนอร์ขึ้น)
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of [v].flat()) if (x != null) q.append(k, x);
  const qs = q.toString();
  redirect(`/admin/orders${qs ? `?${qs}` : ""}`);
}
