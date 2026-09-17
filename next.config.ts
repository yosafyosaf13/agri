import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" غير مطلوب على Vercel (يتولّى تلقائياً)
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // ضغط الصور لتحسين الأداء
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // ضمان عمل الـ API routes على Vercel
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
