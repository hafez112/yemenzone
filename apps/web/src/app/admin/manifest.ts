import type { MetadataRoute } from 'next';

// 📱 تطبيق الويب التقدمي للوحة تحكم المنصة — يُركَّب كتطبيق مستقل على جوال المدير
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'لوحة تحكم منصة يمن زون',
    short_name: 'لوحة المنصة',
    description: 'غرفة قيادة منصة يمن زون — المتاجر، المالية، الأمن، التصميم',
    id: '/admin',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#0A0A14',
    theme_color: '#6C3DF5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
