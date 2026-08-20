import { NextRequest, NextResponse } from 'next/server';

// 🔓 فتح بوابة الإدارة — بالرمز السري عبر POST، أو بالرابط الخاص عبر GET ?key=
// الرابط الخاص الكامل: https://yemenzone1.com/gate/unlock?key=الرمز_السري
export async function POST(req: NextRequest) {
  const gate = process.env.ADMIN_GATE || '';
  if (!gate) return NextResponse.json({ ok: true }); // البوابة غير مفعّلة — الإدارة مفتوحة
  const { key } = await req.json().catch(() => ({ key: '' }));
  if (key !== gate) return NextResponse.json({ message: 'الرمز السري غير صحيح' }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('yz_admin_unlock', gate, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12, // 12 ساعة
    path: '/',
  });
  return res;
}

// الرابط الخاص: يفتح البوابة ويحوّل للوحة مباشرة
export async function GET(req: NextRequest) {
  const gate = process.env.ADMIN_GATE || '';
  const key = req.nextUrl.searchParams.get('key') || '';
  const back = req.nextUrl.searchParams.get('back') || '/admin';

  if (!gate || key !== gate) {
    return NextResponse.redirect(new URL('/gate', req.url));
  }
  const res = NextResponse.redirect(new URL(back.startsWith('/admin') ? back : '/admin', req.url));
  res.cookies.set('yz_admin_unlock', gate, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
  return res;
}
