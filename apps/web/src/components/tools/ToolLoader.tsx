'use client';
import dynamic from 'next/dynamic';
import ToolShell from './ToolShell';
import ToolGate from './ToolGate';
import { toolBySlug } from '@/lib/tools';

// ⏳ تحميل كسول لكل أداة — مكتباتها الثقيلة لا تُحمّل إلا عند فتحها (بدون SSR)
const loading = (
  <div className="grid place-items-center py-24">
    <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-purple-500 animate-spin" />
  </div>
);

const MAP: Record<string, any> = {
  currency: dynamic(() => import('./CurrencyTool'), { loading: () => loading, ssr: false }),
  invoice: dynamic(() => import('./InvoiceTool'), { loading: () => loading, ssr: false }),
  qr: dynamic(() => import('./QrTool'), { loading: () => loading, ssr: false }),
  barcode: dynamic(() => import('./BarcodeTool'), { loading: () => loading, ssr: false }),
  designer: dynamic(() => import('./DesignerTool'), { loading: () => loading, ssr: false }),
  'bg-remover': dynamic(() => import('./BgRemoverTool'), { loading: () => loading, ssr: false }),
  writer: dynamic(() => import('./WriterTool'), { loading: () => loading, ssr: false }),
  catalog: dynamic(() => import('./CatalogTool'), { loading: () => loading, ssr: false }),
  pricing: dynamic(() => import('./PricingTool'), { loading: () => loading, ssr: false }),
  installments: dynamic(() => import('./InstallmentsTool'), { loading: () => loading, ssr: false }),
  debts: dynamic(() => import('./DebtsTool'), { loading: () => loading, ssr: false }),
  whatsapp: dynamic(() => import('./WhatsappTool'), { loading: () => loading, ssr: false }),
  zakat: dynamic(() => import('./ZakatTool'), { loading: () => loading, ssr: false }),
  prayer: dynamic(() => import('./PrayerTool'), { loading: () => loading, ssr: false }),
  compressor: dynamic(() => import('./CompressorTool'), { loading: () => loading, ssr: false }),
  ocr: dynamic(() => import('./OcrTool'), { loading: () => loading, ssr: false }),
  docs: dynamic(() => import('./DocsTool'), { loading: () => loading, ssr: false }),
  bio: dynamic(() => import('./BioTool'), { loading: () => loading, ssr: false }),
  'site-check': dynamic(() => import('./SiteCheckTool'), { loading: () => loading, ssr: false }),
  tech: dynamic(() => import('./TechTool'), { loading: () => loading, ssr: false }),
  'card-scan': dynamic(() => import('./CardScanTool'), { loading: () => loading, ssr: false }),
  'add-me': dynamic(() => import('./AddMeTool'), { loading: () => loading, ssr: false }),
  'logo-ai': dynamic(() => import('./LogoTool'), { loading: () => loading, ssr: false }),
  'ad-maker': dynamic(() => import('./GifAdTool'), { loading: () => loading, ssr: false }),
  'quick-sell': dynamic(() => import('./QuickSellTool'), { loading: () => loading, ssr: false }),
  'share-card': dynamic(() => import('./ShareCardTool'), { loading: () => loading, ssr: false }),
  'price-hunt': dynamic(() => import('./PriceHuntTool'), { loading: () => loading, ssr: false }),
  requests: dynamic(() => import('./RequestsTool'), { loading: () => loading, ssr: false }),
  posts: dynamic(() => import('./PostsTool'), { loading: () => loading, ssr: false }),
  'used-market': dynamic(() => import('./UsedMarketTool'), { loading: () => loading, ssr: false }),
  // 💎 الخدمات المدفوعة العشرون
  inventory: dynamic(() => import('./InventoryTool'), { loading: () => loading, ssr: false }),
  crm: dynamic(() => import('./CrmTool'), { loading: () => loading, ssr: false }),
  delivery: dynamic(() => import('./DeliveryTool'), { loading: () => loading, ssr: false }),
  expenses: dynamic(() => import('./ExpensesTool'), { loading: () => loading, ssr: false }),
  coupons: dynamic(() => import('./CouponsTool'), { loading: () => loading, ssr: false }),
  quotes: dynamic(() => import('./QuotesTool'), { loading: () => loading, ssr: false }),
  vouchers: dynamic(() => import('./VouchersTool'), { loading: () => loading, ssr: false }),
  'sales-report': dynamic(() => import('./SalesReportTool'), { loading: () => loading, ssr: false }),
  backup: dynamic(() => import('./BackupTool'), { loading: () => loading, ssr: false }),
  appointments: dynamic(() => import('./AppointmentsTool'), { loading: () => loading, ssr: false }),
  'menu-qr': dynamic(() => import('./MenuQrTool'), { loading: () => loading, ssr: false }),
  rooms: dynamic(() => import('./RoomsTool'), { loading: () => loading, ssr: false }),
  'rental-contract': dynamic(() => import('./RentalContractTool'), { loading: () => loading, ssr: false }),
  tickets: dynamic(() => import('./TicketsTool'), { loading: () => loading, ssr: false }),
  cv: dynamic(() => import('./CvTool'), { loading: () => loading, ssr: false }),
  warranties: dynamic(() => import('./WarrantiesTool'), { loading: () => loading, ssr: false }),
  vault: dynamic(() => import('./VaultTool'), { loading: () => loading, ssr: false }),
  budget: dynamic(() => import('./BudgetTool'), { loading: () => loading, ssr: false }),
  'quiz-maker': dynamic(() => import('./QuizMakerTool'), { loading: () => loading, ssr: false }),
  polls: dynamic(() => import('./PollsTool'), { loading: () => loading, ssr: false }),
  // 💎 خدمتا المتجر المدفوعتان — بطاقة تحويل إلى لوحة البائع
  'smart-add': dynamic(() => import('./StoreServiceRedirect'), { loading: () => loading, ssr: false }),
  'store-app': dynamic(() => import('./StoreServiceRedirect'), { loading: () => loading, ssr: false }),
};

// الخدمتان المرتبطتان بلوحة البائع — يمرّر إليهما slug ليعرف وجهته
const STORE_SERVICES = ['smart-add', 'store-app'];

export default function ToolLoader({ slug }: { slug: string }) {
  const Cmp = MAP[slug];
  if (!Cmp || !toolBySlug(slug)) return null;
  // 🛡️ الحارس يقرر: خدمات التاجر للبائعين فقط، والبقية تتطلب دخول العميل
  return <ToolShell slug={slug}><ToolGate slug={slug}>{
    STORE_SERVICES.includes(slug) ? <Cmp slug={slug} /> : <Cmp />
  }</ToolGate></ToolShell>;
}
