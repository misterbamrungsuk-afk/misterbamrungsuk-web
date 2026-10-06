// ความยินยอมคุกกี้ (PDPA) — เก็บใน localStorage + cookie "mb_consent"
// ใช้ hasConsent("analytics") ก่อนโหลด analytics/pixel ใดๆ; ฟังการเปลี่ยนแปลงด้วย onConsentChange

export type ConsentCategory = "necessary" | "analytics" | "marketing";
export type ConsentState = { v: 1; analytics: boolean; marketing: boolean; at: string };

export const CONSENT_KEY = "mb_consent";
const EVENT = "mb-consent-change";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) return JSON.parse(raw) as ConsentState;
  } catch {}
  const m = document.cookie.match(/(?:^|;\s*)mb_consent=([^;]+)/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])) as ConsentState; } catch { return null; }
}

export function saveConsent(c: { analytics: boolean; marketing: boolean }) {
  const state: ConsentState = { v: 1, analytics: c.analytics, marketing: c.marketing, at: new Date().toISOString() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(state)); } catch {}
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(JSON.stringify(state))}; Path=/; Max-Age=${180 * 86400}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
  return state;
}

/** อนุญาตหมวดนี้แล้วหรือยัง ("necessary" = true เสมอ) */
export function hasConsent(cat: ConsentCategory): boolean {
  if (cat === "necessary") return true;
  const c = readConsent();
  return !!c && c[cat] === true;
}

export function onConsentChange(fn: (c: ConsentState) => void) {
  const h = (e: Event) => fn((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

/** เปิดหน้าตั้งค่าคุกกี้อีกครั้ง (เช่น ลิงก์ "ตั้งค่าคุกกี้" ในหน้าโปรไฟล์) */
export const openConsentSettings = () => window.dispatchEvent(new Event("mb-consent-open"));
