"use client";

import { useRouter } from "next/navigation";

export function LogoutLink() {
  const router = useRouter();
  return <button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); router.push("/login"); router.refresh(); }} className="text-[#d9c9b4]">ออกจากระบบ</button>;
}
