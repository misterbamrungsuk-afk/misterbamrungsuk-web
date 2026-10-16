// Mister Bamrungsuk service worker — PWA ขั้นพื้นฐาน
// - static assets (_next/static, ไอคอน, ฟอนต์): cache-first
// - หน้าเว็บ: network-first ถ้าเน็ตหลุดใช้ของที่แคชไว้ ไม่มีก็แสดง /offline
// - API และข้อมูลเงิน/แชท: ไม่แคชเด็ดขาด (ต้องสดเสมอ)
const VERSION = "mb-v2"; // เปลี่ยนเลขเมื่อไอคอน/แอปเปลี่ยน เพื่อล้างแคชเก่า
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

// web push (#16) — payload { title, body, url, tag } จาก /lib/push.ts
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: event.data && event.data.text() }; }
  const title = d.title || "Mister Bamrungsuk";
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag,
    icon: "/pwa-icon/192", badge: "/pwa-icon/192", data: { url: d.url || "/notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url === url && "focus" in c) return c.focus();
      const c = list.find((x) => "navigate" in x);
      return c ? c.navigate(url).then((w) => w && w.focus()) : self.clients.openWindow(url);
    }),
  );
});
