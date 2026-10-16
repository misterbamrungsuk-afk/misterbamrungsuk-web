"use client";

import { useRouter } from "next/navigation";

export function LogoutLink() {
  const router = useRouter();
  return <button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); router.push("/login"); router.refresh(); }} className="h-11 rounded-[14px] text-[#d9c9b4]" style={{ border: "1px solid rgba(243,234,217,.12)" }}>ออกจากระบบ</button>;
}
