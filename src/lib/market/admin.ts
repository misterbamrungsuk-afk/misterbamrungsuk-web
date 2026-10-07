import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";

/** แอดมินที่มีสิทธิ์ /admin/market (super, finance) — null = ไม่มีสิทธิ์ */
export async function marketAdmin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/market") ? s : null;
}
