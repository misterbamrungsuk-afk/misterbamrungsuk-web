import type { Metadata, Viewport } from "next";
import { Anuphan, Playfair_Display } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";

const anuphan = Anuphan({ subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-anuphan" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "HaMoo — เพื่อนที่คุณเลือกได้",
  description: "แพลตฟอร์มเพื่อนเช่าอันดับหนึ่ง ค้นหา แชทหา นัดเจอ ปลอดภัยทุกการนัดพบ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0b0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${anuphan.variable} ${playfair.variable}`}>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
