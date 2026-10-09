import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans_Thai, Kanit } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { PwaRegister } from "@/components/pwa-register";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CookieConsent } from "@/components/cookie-consent";

const plex = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const kanit = Kanit({ subsets: ["thai", "latin"], weight: ["500", "600", "700", "800"], variable: "--font-kanit" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });

export const metadata: Metadata = {
  title: "Mister Bamrungsuk — เพื่อนกิน เพื่อนเที่ยว ระดับพรีเมียม",
  description: "นัดเพื่อนกิน เพื่อนเที่ยว ที่ยืนยันตัวตนแล้ว เลือกตามกิจกรรม กิน & เที่ยว คาเฟ่ ดูหนัง ถ่ายรูป ออกกำลัง จองเป็นบล็อก 3 / 5 ชม. จ่ายผ่านแอปอย่างปลอดภัย",
  applicationName: "Mister Bamrungsuk",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mister Bamrungsuk", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/brand/icon-48.png", sizes: "48x48" }, { url: "/brand/icon-192.png", sizes: "192x192" }], apple: "/brand/icon-180.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0e0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plex.variable} ${kanit.variable} ${cormorant.variable}`}>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <PwaRegister />
        <ScrollReveal />
        <CookieConsent />
      </body>
    </html>
  );
}
