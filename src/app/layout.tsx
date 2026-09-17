import type { Metadata } from "next";
import { Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AIAssistantProvider } from "@/components/ai-assistant/ai-assistant-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "إدارة العمل الميداني الزراعي",
  description:
    "نظام إدارة الزيارات الميدانية والمحاصيل والمعاملات — مساعد ذكي بصوت وصورة",
  keywords: [
    "زراعة",
    "ميداني",
    "زيارات",
    "محاصيل",
    "معاملات",
    "مساعد ذكي",
  ],
  authors: [{ name: "Agri Field Work System" }],
  applicationName: "إدارة العمل الميداني الزراعي",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/icon-192.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "العمل الميداني",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "إدارة العمل الميداني الزراعي",
    description: "نظام إدارة الزيارات الميدانية والمحاصيل",
    type: "website",
    locale: "ar_AR",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "شعار التطبيق" }],
  },
};

export const viewport = {
  themeColor: "#4a7c59",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body
        className={`${cairo.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <AIAssistantProvider />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
