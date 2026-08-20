// نظام الأنماط المتعددة — خفيف جداً (CSS Variables فقط، بدون مكتبات ثقيلة)

export const PLATFORM_STYLES = [
  { id: 'neon-purple', name: 'نيون بنفسجي', primary: '#6C3DF5', secondary: '#00E5C7', accent: '#FFB800', bg: '#F7F7FC', dark: '#0A0A14' },
  { id: 'ocean-blue',  name: 'أزرق محيط',   primary: '#0EA5E9', secondary: '#22D3EE', accent: '#F59E0B', bg: '#F0F9FF', dark: '#082F49' },
  { id: 'emerald',     name: 'أخضر زمردي',   primary: '#059669', secondary: '#34D399', accent: '#FBBF24', bg: '#F0FDF4', dark: '#022C22' },
  { id: 'royal-gold',  name: 'ذهبي ملكي',    primary: '#B45309', secondary: '#F59E0B', accent: '#7C3AED', bg: '#FFFBEB', dark: '#1C0A00' },
  { id: 'rose-pink',   name: 'وردي عصري',    primary: '#E11D48', secondary: '#FB7185', accent: '#8B5CF6', bg: '#FFF1F2', dark: '#1A0510' },
  { id: 'desert-sand', name: 'رملي صحراوي',  primary: '#C2410C', secondary: '#FDBA74', accent: '#0D9488', bg: '#FFF7ED', dark: '#1C0F02' },
  { id: 'midnight',    name: 'ليلي سماوي',   primary: '#4338CA', secondary: '#818CF8', accent: '#22D3EE', bg: '#EEF2FF', dark: '#070714' },
  { id: 'coral-reef',  name: 'مرجاني حي',    primary: '#F43F5E', secondary: '#FDA4AF', accent: '#10B981', bg: '#FFF1F2', dark: '#1F0710' },
] as const;

// قوالب متاجر التجار
export const STORE_TEMPLATES = [
  { id: 'default', name: 'الافتراضي', desc: 'بسيط ونظيف',      dark: false, radius: '1rem',   cardStyle: 'flat'  },
  { id: 'modern',  name: 'العصري',    desc: 'زجاجي متحرك',     dark: false, radius: '1.5rem', cardStyle: 'glass' },
  { id: 'dark',    name: 'الداكن',    desc: 'ليلي فاخر',       dark: true,  radius: '1rem',   cardStyle: 'glow'  },
  { id: 'elegant', name: 'الأنيق',    desc: 'ذهبي راقٍ',       dark: false, radius: '0.5rem', cardStyle: 'gold'  },
  { id: 'aurora',  name: 'أورورا',    desc: 'شفق متدرج حالم',  dark: false, radius: '1.5rem', cardStyle: 'aurora' },
  { id: 'minimal', name: 'المينيمال', desc: 'هدوء اسكندنافي',  dark: false, radius: '0.25rem', cardStyle: 'minimal' },
] as const;

// تطبيق النمط على الصفحة فوراً
export function applyStyle(styleId: string) {
  const s = PLATFORM_STYLES.find(x => x.id === styleId) || PLATFORM_STYLES[0];
  const root = document.documentElement;
  root.style.setProperty('--primary', s.primary);
  root.style.setProperty('--secondary', s.secondary);
  root.style.setProperty('--accent', s.accent);
  root.style.setProperty('--bg', s.bg);
  root.style.setProperty('--dark', s.dark);
  localStorage.setItem('yz_style', s.id);
}

export function getSavedStyle(): string {
  if (typeof window === 'undefined') return 'neon-purple';
  return localStorage.getItem('yz_style') || 'neon-purple';
}
