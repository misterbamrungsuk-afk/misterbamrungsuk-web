"use client";
import { useEffect, useState } from "react";
import { PARTNER_SPAS, type PartnerSpa } from "./booking";
import { SHOW_SAMPLES } from "./home/people";

/** สปาพาร์ทเนอร์จาก /api/spas (fallback = ข้อมูลตัวอย่าง) */
export function usePartnerSpas() {
  const [spas, setSpas] = useState<PartnerSpa[]>(SHOW_SAMPLES ? PARTNER_SPAS : []); // เว็บจริงไม่แสดงร้านตัวอย่าง
  useEffect(() => {
    let live = true;
    fetch("/api/spas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d?.spas?.length) setSpas(d.spas); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return spas;
}
