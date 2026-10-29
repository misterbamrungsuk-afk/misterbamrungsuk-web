import type { Metadata, Viewport } from "next";
import { Archivo_Black, Cormorant_Garamond, IBM_Plex_Sans_Thai, Kanit, Noto_Sans_SC, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { getLang, htmlLang } from "@/i18n/server";
import { PwaRegister } from "@/components/pwa-register";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CookieConsent } from "@/components/cookie-consent";
import { NavTrack } from "@/components/smart-back";
import { ErrorReporter, EARLY_ERROR_SCRIPT } from "@/components/error-reporter";
import { GoogleAnalytics } from "@/components/ga";
import { SiteTracker } from "@/components/site-tracker";
import { Suspense } from "react";

const plex = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const kanit = Kanit({ subsets: ["thai", "latin"], weight: ["500", "600", "700", "800"], variable: "--font-kanit" });
const noto = Noto_Sans_Thai({ subsets: ["thai", "latin"], weight: ["100", "300", "400", "600", "700"], variable: "--font-noto" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo" });
// จีนตัวย่อ (สิงคโปร์) — โหลดตาม unicode-range เฉพาะตัวอักษรที่ใช้ ไม่ preload (ไฟล์ใหญ่)
const notoSC = Noto_Sans_SC({ weight: ["400", "500", "700"], preload: false, display: "swap", variable: "--font-sc" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });

export const metadata: Metadata = {
  title: "Mister Bamrungsuk — เพื่อนกิน เพื่อนเที่ยว ระดับพรีเมียม",
  description: "เลือกเพื่อนระดับพรีเมียมได้ที่ Mister Bamrungsuk",
  metadataBase: new URL("https://misterbamrungsuk.com"),
  openGraph: { siteName: "Mister Bamrungsuk", description: "เลือกเพื่อนระดับพรีเมียมได้ที่ Mister Bamrungsuk", images: [{ url: "/brand/og-logo-2.jpg", width: 1200, height: 630 }], locale: "th_TH", type: "website" },
  twitter: { card: "summary_large_image", description: "เลือกเพื่อนระดับพรีเมียมได้ที่ Mister Bamrungsuk", images: ["/brand/og-logo-2.jpg"] },
  applicationName: "Mister Bamrungsuk",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mister Bamrungsuk", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/brand/icon-48.png", sizes: "48x48" }, { url: "/brand/icon-192.png", sizes: "192x192" }], apple: "/brand/icon-180.png" },
  // iOS Safari/LINE ห้ามแปลงเบอร์/อีเมล/ที่อยู่/วันที่เป็นลิงก์เอง (แก้ DOM ก่อน hydrate = React error #418)
  formatDetection: { telephone: false, email: false, address: false, date: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e0a0a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={htmlLang(lang)} className={`${plex.variable} ${kanit.variable} ${cormorant.variable} ${noto.variable} ${archivo.variable} ${notoSC.variable}`}>
      {/* จับ error ตั้งแต่ก่อน React hydrate (เช่น #418) ไว้ในคิว → ErrorReporter ส่งต่อ */}
      <head><script dangerouslySetInnerHTML={{ __html: EARLY_ERROR_SCRIPT }} /></head>
      <body>
        <I18nProvider initial={lang}>{children}</I18nProvider>
        <PwaRegister />
        <ScrollReveal />
        <CookieConsent />
        <Suspense fallback={null}><GoogleAnalytics /></Suspense>
        <SiteTracker />
        <NavTrack />
        <ErrorReporter />
      </body>
    </html>
  );
}
