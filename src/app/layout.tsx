import type { Metadata, Viewport } from "next";
import { Archivo_Black, Cormorant_Garamond, IBM_Plex_Sans_Thai, Kanit, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { PwaRegister } from "@/components/pwa-register";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CookieConsent } from "@/components/cookie-consent";
import { NavTrack } from "@/components/smart-back";

const plex = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const kanit = Kanit({ subsets: ["thai", "latin"], weight: ["500", "600", "700", "800"], variable: "--font-kanit" });
const noto = Noto_Sans_Thai({ subsets: ["thai", "latin"], weight: ["100", "300", "400", "600", "700"], variable: "--font-noto" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo" });
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
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plex.variable} ${kanit.variable} ${cormorant.variable} ${noto.variable} ${archivo.variable}`}>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <PwaRegister />
        <ScrollReveal />
        <CookieConsent />
        <NavTrack />
      </body>
    </html>
  );
}
