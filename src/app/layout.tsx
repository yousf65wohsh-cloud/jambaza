import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "جمبزة",
  title: {
    default: "جمبزة — استمع مع أصدقائك",
    template: "%s | جمبزة",
  },
  description:
    "جمبزة تطبيق استماع للموسيقى: ارفع أغانيك، نظّم قوائمك، واستمع مع أصدقائك في غرف مشتركة.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "جمبزة",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="bg-background text-foreground min-h-dvh font-sans antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          <AppShell>{children}</AppShell>
        </SerwistProvider>
      </body>
    </html>
  );
}
