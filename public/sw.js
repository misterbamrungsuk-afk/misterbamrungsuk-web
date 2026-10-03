// Mister Bamrungsuk service worker — PWA ขั้นพื้นฐาน
// - static assets (_next/static, ไอคอน, ฟอนต์): cache-first
// - หน้าเว็บ: network-first ถ้าเน็ตหลุดใช้ของที่แคชไว้ ไม่มีก็แสดง /offline
// - API และข้อมูลเงิน/แชท: ไม่แคชเด็ดขาด (ต้องสดเสมอ)
const VERSION = "mb-v1"; // เปลี่ยนเลขเมื่อไอคอน/แอปเปลี่ยน เพื่อล้างแคชเก่า
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PRECACHE = ["/offline", "/pwa-icon/192", "/pwa-icon/512"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // รูป Unsplash / แผนที่ ปล่อยให้เบราว์เซอร์จัดการ
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/pwa-icon")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline"))),
    );
  }
});
