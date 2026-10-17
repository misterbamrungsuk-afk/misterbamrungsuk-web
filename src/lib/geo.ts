// คำนวณระยะ/เวลาถึง/ปัดพิกัด — ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ
export type LatLng = { lat: number; lng: number };

/** อยู่ในประเทศไทย (กรอบกว้าง ๆ) — กันพิกัดหลุด/ปลอม */
export const inThailand = (p: Partial<LatLng> | null | undefined): p is LatLng =>
  !!p && typeof p.lat === "number" && typeof p.lng === "number" && p.lat >= 5 && p.lat <= 21 && p.lng >= 97 && p.lng <= 106;

/** ระยะเส้นตรง (กม.) */
export function km(a: LatLng, b: LatLng) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** เวลาถึงโดยประมาณ (นาที) เป็นช่วง — ถนนจริงยาวกว่าเส้นตรง ~1.4 เท่า · ความเร็วเฉลี่ยในเมือง ~22 กม./ชม. */
export function etaRange(distKm: number): [number, number] {
  const mins = (distKm * 1.4 / 22) * 60;
  if (distKm < 0.15) return [0, 0];
  const r5 = (n: number) => Math.max(2, Math.round(n / 5) * 5 || Math.ceil(n));
  const lo = r5(mins * 0.85), hi = Math.max(lo + 5, r5(mins * 1.3));
  return [lo, hi];
}
export const etaText = (distKm: number) => { const [lo, hi] = etaRange(distKm); return lo === 0 ? "ถึงแล้ว / ใกล้มาก" : `ประมาณ ${lo}–${hi} นาที`; };
export const kmText = (d: number) => (d < 1 ? `${Math.max(50, Math.round(d * 1000 / 50) * 50)} ม.` : `${d < 10 ? d.toFixed(1) : Math.round(d)} กม.`);

/** ปัดพิกัดเป็นช่องตาราง ~1.1 กม. (0.01°) แล้วเอาจุดกลางช่อง — ไม่เก็บตำแหน่งจริงของ Part-Time สำหรับหน้าสาธารณะ */
export const snapCell = (p: LatLng): LatLng => ({ lat: Math.round((Math.floor(p.lat * 100) + 0.5) * 1e4) / 1e6, lng: Math.round((Math.floor(p.lng * 100) + 0.5) * 1e4) / 1e6 });
