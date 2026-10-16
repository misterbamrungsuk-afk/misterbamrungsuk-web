import "server-only";
import { customersEnabled, dumpTable } from "@/lib/customer/auth";

export const BACKUP_TABLES = ["applicants", "customers", "wallet_accounts", "wallet_tx", "wallet_entries", "wallet_topups", "bookings", "booking_events", "messages", "reviews", "withdrawals"] as const;

/** สำรองตาราง Supabase เป็น JSON — ตารางที่ดึงไม่ได้จะบันทึก error ไว้แทน */
export async function buildBackup() {
  const tables: Record<string, unknown[] | { error: string }> = {};
  if (customersEnabled()) {
    for (const t of BACKUP_TABLES) {
      try { tables[t] = await dumpTable(t); } catch (e) { tables[t] = { error: String(e) }; }
    }
  }
  return { app: "mister-bamrungsuk", created_at: new Date().toISOString(), demo: !customersEnabled(), tables };
}

export const backupFilename = () => `mb-backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
