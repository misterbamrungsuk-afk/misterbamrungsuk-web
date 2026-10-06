"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";

// สลับมุมมองผู้ใช้: ลูกค้า / Part-Time / แอดมิน
// - หน้าเฉพาะกลุ่มกำหนดโหมดเอง (/provider/*, /jobs → Part-Time)
// - หน้าที่ใช้ร่วมกัน (แชท, โปรไฟล์, แจ้งเตือน) ใช้โหมดล่าสุดที่เลือกไว้ในเครื่อง
export type Mode = "customer" | "provider" | "admin";
const KEY = "mb_mode";

const PROVIDER_PATHS = [/^\/provider(\/|$)/, /^\/jobs(\/|$)/];
const CUSTOMER_PATHS = [/^\/home$/, /^\/map$/, /^\/matching$/, /^\/search$/, /^\/book\//, /^\/order\//, /^\/post\//, /^\/favorites$/, /^\/tracking\//];

export function useMode(): Mode {
  const path = usePathname();
  const [stored, setStored] = useState<Mode>("customer");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "provider" || v === "customer") setStored(v);
    } catch {}
  }, [path]);
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (PROVIDER_PATHS.some((r) => r.test(path))) return "provider";
  if (CUSTOMER_PATHS.some((r) => r.test(path))) return "customer";
  return stored;
}

function remember(m: Mode) {
  try {
    localStorage.setItem(KEY, m);
  } catch {}
}

export function ModeSwitch() {
  const { lang } = useI18n();
  const router = useRouter();
  const mode = useMode();
  const [busy, setBusy] = useState(false);
  const th = lang === "th";

  const go = async (m: Mode) => {
    if (m === mode && m !== "admin") return;
    if (m === "customer") {
      remember("customer");
      return router.push("/home");
    }
    if (m === "provider") {
      remember("provider");
      return router.push("/provider");
    }
    // แอดมิน: โหมดเดโมเข้าด้วยบัญชีสาธิต super ให้ทันที; โหมดจริงถ้ายังไม่ล็อกอิน middleware จะพาไปหน้าล็อกอินเอง
    // (เช็ก session ก่อน เพื่อไม่ให้การลองบัญชีสาธิตไปนับเป็นการเดารหัสผิดเมื่อตั้งบัญชีจริงไว้)
    setBusy(true);
    const probe = await fetch("/admin", { method: "HEAD", redirect: "manual" }).catch(() => null);
    const loggedIn = probe?.ok === true;
    if (!loggedIn) {
      await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "super@mord.demo", password: "mord-demo" }),
      }).catch(() => null);
    }
    window.location.href = "/admin";
  };

  const items: { k: Mode; th: string; en: string }[] = [
    { k: "customer", th: "ลูกค้า", en: "Customer" },
    { k: "provider", th: "Part-Time", en: "Part-Time" },
    { k: "admin", th: "แอดมิน", en: "Admin" },
  ];

  return (
    <div role="tablist" aria-label={th ? "สลับโหมดผู้ใช้" : "Switch user mode"} className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-ink-850 border border-ink-600">
      {items.map((x) => {
        const on = mode === x.k;
        return (
          <button key={x.k} role="tab" aria-selected={on} disabled={busy} onClick={() => go(x.k)}
            className={`h-9 rounded-lg text-[13px] font-semibold transition ${on ? "bg-crimson-500 text-white" : "text-ink-300 hover:text-ink-100"}`}>
            {busy && x.k === "admin" ? "…" : th ? x.th : x.en}
          </button>
        );
      })}
    </div>
  );
}
