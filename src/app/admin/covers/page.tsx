import { coversConfigured, listAll, SLOTS, type CoverRow, type CoverSlot } from "@/lib/covers";
import { CoversAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "รูปหน้าปก · แอดมิน Mister Bamrungsuk" };

// รูปหน้าปก: สไลด์หน้าแรก · โปสเตอร์ /join · ปก /partner · ปก + แบนเนอร์ /market (ตามบอร์ด AdminCovers)
export default async function CoversAdminPage() {
  const rows = await listAll();
  const by = Object.fromEntries((Object.keys(SLOTS) as CoverSlot[]).map((k) => [k, rows.filter((r) => r.slot === k)])) as Record<CoverSlot, CoverRow[]>;
  const defaults = Object.fromEntries((Object.keys(SLOTS) as CoverSlot[]).map((k) => [k, SLOTS[k].defaults])) as Record<CoverSlot, string[]>;
  return <CoversAdmin initial={by} defaults={defaults} configured={coversConfigured()} />;
}
