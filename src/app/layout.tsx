import type { Metadata, Viewport } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/vazirmatn/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "زر — تابلوی لحظه‌ای نرخ ارز",
  description:
    "نمایش بلادرنگ نرخ ارزهای بازار آزاد؛ واکشی زنده از آلان‌چند، به‌روزرسانی هر ۱۵ ثانیه، نمودار روند و تاریخچهٔ قیمت.",
};

export const viewport: Viewport = {
  themeColor: "#06070b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen font-sans antialiased noise">
        {children}
      </body>
    </html>
  );
}
