import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Kanit } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { PwaRegister } from "@/components/pwa-register";

const plex = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const kanit = Kanit({ subsets: ["thai", "latin"], weight: ["500", "600", "700", "800"], variable: "--font-kanit" });

export const metadata: Metadata = {
  title: "Mister Bamrungsuk — หมอนวดชายมืออาชีพ มาหาคุณถึงที่",
  description: "จองหมอนวดชายที่ยืนยันตัวตนและใบรับรองแล้ว นวดไทย ออฟฟิศซินโดรม อโรมา นวดกีฬา ถึงบ้าน คอนโด โรงแรม จ่ายผ่านระบบกลางที่ปลอดภัย",
  applicationName: "Mister Bamrungsuk",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mister Bamrungsuk", statusBarStyle: "black-translucent" },
  icons: { icon: "/pwa-icon/192", apple: "/pwa-icon/180" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plex.variable} ${kanit.variable}`}>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
