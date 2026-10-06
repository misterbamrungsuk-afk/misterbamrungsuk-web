"use client";
import { useEffect, useState } from "react";
import { PARTNER_SPAS, type PartnerSpa } from "./booking";

/** สปาพาร์ทเนอร์จาก /api/spas (fallback = ข้อมูลตัวอย่าง) */
export function usePartnerSpas() {
  const [spas, setSpas] = useState<PartnerSpa[]>(PARTNER_SPAS);
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
