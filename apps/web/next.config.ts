import type { NextConfig } from 'next';

// Next.js 16 — Turbopack افتراضي + React Compiler + تخزين مؤقت أقصى للسرعة
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  reactCompiler: true, // ⚡ مترجم React: memoization تلقائي — تفاعلات أسرع بدون تغيير كود
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'], // ⚡ صور أخف حتى 50%
  },
  experimental: {
    // ⚡ استيراد محسّن للحزم الثقيلة — حزم JS أصغر = تحميل أسرع
    optimizePackageImports: [
      'framer-motion', 'gsap', 'lucide-react', 'qr-code-styling',
      'socket.io-client', '@tanstack/react-query',
    ],
    // ⚡ كاش التنقّل: الصفحات المُجلَبة مسبقاً تفور فوراً (5 دقائق ثابتة / 30 ثانية ديناميكية)
    staleTimes: { static: 300, dynamic: 30 },
  },
  // ⚡ ترويسات كاش: الأصول الثابتة سنة كاملة، sw.js بلا كاش (لتحديثات PWA الفورية)
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
