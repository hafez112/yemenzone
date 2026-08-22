'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { shareCreate, shareUpdate } from '@/lib/tool-db';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, copyText, Empty, Field, inp, QrView, Stat, uid, waIntl } from './shared/ui';

// 🍽️ المنيو الرقمي بـ QR — منيو أنيق برابط عام وكود يُطبع على الطاولات
interface MItem { id: number; name: string; price: number; desc: string }
interface MCat { id: number; name: string; items: MItem[] }
interface Menu { name: string; whatsapp: string; note: string; cats: MCat[]; slug: string }

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

export default function MenuQrTool() {
  const { data: menu, setData: setMenu } = useToolDB<Menu>('menu-qr', { name: '', whatsapp: '', note: '', cats: [], slug: '' }, 'yz-menu-v1');
  const [catName, setCatName] = useState('');
  const [busy, setBusy] = useState(false);
  const [itemForms, setItemForms] = useState<Record<number, { name: string; price: string; desc: string }>>({});

  const link = menu.slug ? `${SITE()}/s/${menu.slug}` : '';
  const itemCount = menu.cats.reduce((s, c) => s + c.items.length, 0);

  const addCat = () => {
    if (!catName.trim()) { toast('✍️ أدخل اسم القسم', 'error'); return; }
    setMenu({ ...menu, cats: [...menu.cats, { id: uid(), name: catName.trim(), items: [] }] });
    setCatName('');
    toast('🗂️ أُضيف القسم');
  };

  const addItem = (catId: number) => {
    const f = itemForms[catId] || { name: '', price: '', desc: '' };
    if (!f.name.trim()) { toast('✍️ أدخل اسم الصنف', 'error'); return; }
    setMenu({ ...menu, cats: menu.cats.map((c) => c.id === catId ? { ...c, items: [...c.items, { id: uid(), name: f.name.trim(), price: Number(f.price) || 0, desc: f.desc.trim() }] } : c) });
    setItemForms({ ...itemForms, [catId]: { name: '', price: '', desc: '' } });
    toast('🍽️ أُضيف الصنف');
  };

  const publish = async () => {
    if (!menu.name.trim()) { toast('✍️ أدخل اسم المطعم أولاً', 'error'); return; }
    if (!itemCount) { toast('✍️ أضف صنفاً واحداً على الأقل', 'error'); return; }
    setBusy(true);
    const payload = { name: menu.name, whatsapp: waIntl(menu.whatsapp), note: menu.note, cats: menu.cats.map((c) => ({ name: c.name, items: c.items.map((i) => ({ name: i.name, price: i.price, desc: i.desc })) })) };
    try {
      if (menu.slug) {
        await shareUpdate(menu.slug, menu.name, payload);
        toast('🔄 حُدّث المنيو — الرابط نفسه يعمل');
      } else {
        const r = await shareCreate('menu', menu.name, payload);
        setMenu({ ...menu, slug: r.slug });
        toast('🎉 نُشر منيوك! الرابط وQR جاهزان');
      }
    } catch (e: any) { toast(e.message || 'تعذّر النشر', 'error'); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🗂️" label="الأقسام" value={menu.cats.length} />
        <Stat icon="🍽️" label="الأصناف" value={itemCount} />
        <Stat icon={menu.slug ? '🟢' : '⚪'} label="الحالة" value={menu.slug ? 'منشور' : 'مسودة'} tone={menu.slug ? 'text-lime-300' : 'text-white'} />
      </div>

      <div className={card + ' space-y-3'}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="🍽️ اسم المطعم"><input value={menu.name} onChange={(e) => setMenu({ ...menu, name: e.target.value })} placeholder="مطعم الذوق اليمني" className={inp} /></Field>
          <Field label="📱 واتساب الطلبات"><input inputMode="tel" value={menu.whatsapp} onChange={(e) => setMenu({ ...menu, whatsapp: e.target.value.replace(/[^0-9+]/g, '') })} placeholder="777123456" className={inp} dir="ltr" /></Field>
        </div>
        <Field label="📝 سطر ترحيبي (اختياري)"><input value={menu.note} onChange={(e) => setMenu({ ...menu, note: e.target.value })} placeholder="أهلاً بكم — كل أطباقنا تُحضّر طازجة" className={inp} /></Field>
      </div>

      {/* الأقسام والأصناف */}
      <div className="space-y-3">
        {menu.cats.map((c) => {
          const f = itemForms[c.id] || { name: '', price: '', desc: '' };
          return (
            <div key={c.id} className={card}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="font-extrabold text-sm">🗂️ {c.name} <span className="text-white/40 text-[10px]">({c.items.length})</span></p>
                <button onClick={() => { setMenu({ ...menu, cats: menu.cats.filter((x) => x.id !== c.id) }); toast('🗑️ حُذف القسم'); }} className={btnD}>حذف القسم</button>
              </div>
              <div className="space-y-1.5 mb-2.5">
                {c.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <span className="flex-1 text-sm font-bold truncate">{it.name}</span>
                    <span className="text-xs font-black text-lime-300">{it.price.toLocaleString()}</span>
                    <button onClick={() => setMenu({ ...menu, cats: menu.cats.map((x) => x.id === c.id ? { ...x, items: x.items.filter((y) => y.id !== it.id) } : x) })} className={btnD}>✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={f.name} onChange={(e) => setItemForms({ ...itemForms, [c.id]: { ...f, name: e.target.value } })} placeholder="اسم الصنف" className={inp} />
                <input inputMode="decimal" value={f.price} onChange={(e) => setItemForms({ ...itemForms, [c.id]: { ...f, price: e.target.value.replace(/[^0-9.]/g, '') } })} placeholder="السعر" className={inp + ' !w-20 text-center'} />
                <button onClick={() => addItem(c.id)} className={btnP + ' !px-3 shrink-0'}>➕</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="🗂️ قسم جديد: مشويات، عصائر..." className={inp} />
        <button onClick={addCat} className={btnS + ' shrink-0 !py-2.5'}>➕ قسم</button>
      </div>

      <button onClick={publish} disabled={busy} className={btnP + ' w-full !py-3.5 text-base'}>
        {busy ? '⏳ جاري النشر...' : menu.slug ? '🔄 تحديث المنيو المنشور' : '🚀 نشر المنيو والحصول على QR'}
      </button>

      {menu.slug && (
        <div className={card + ' text-center space-y-3'}>
          <p className="text-sm font-extrabold text-lime-300">🎉 منيوك مباشر الآن على هذا الرابط</p>
          <div className="flex justify-center"><QrView data={link} size={190} /></div>
          <div className="flex gap-2">
            <input readOnly value={link} className={inp + ' text-center text-xs'} dir="ltr" onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button onClick={() => copyText(link).then(() => toast('📋 نُسخ الرابط'))} className={btnS + ' shrink-0'}>📋 نسخ</button>
          </div>
          <div className="flex gap-2">
            <a href={link} target="_blank" rel="noreferrer" className={btnS + ' flex-1 text-center'}>👁️ معاينة المنيو</a>
            <button onClick={() => window.print()} className={btnS + ' flex-1'}>🖨️ اطبع الـ QR للطاولات</button>
          </div>
          <p className="text-[10px] text-white/40">💡 أي تعديل على الأصناف أو الأسعار ← اضغط «تحديث» والرابط نفسه يتحدث فوراً</p>
        </div>
      )}

      {menu.cats.length === 0 && <Empty icon="🍽️" text="ابدأ بإضافة قسم (مشويات، مقبلات، مشروبات...) ثم أضف أصنافه" />}
    </div>
  );
}
