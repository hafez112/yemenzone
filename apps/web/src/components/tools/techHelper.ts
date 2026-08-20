// عنوان الـ API من جهة العميل (نفس NEXT_PUBLIC_API_URL)
export const SERVER_API_SAFE = () => process.env.NEXT_PUBLIC_API_URL || '';
