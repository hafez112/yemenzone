// ⚡ الاتصال الفوري — WebSocket عبر socket.io (المسار /api/socket.io يمر من Caddy)
// يعمل فقط لمن لديه توكن — والاستطلاع الدوري يبقى احتياطاً تلقائياً إن تعذر الاتصال
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let tried = false;

export function connectRealtime(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket?.connected) return socket;
  const token = localStorage.getItem('yz_token');
  if (!token) return null;
  if (socket) return socket; // يعيد الاتصال تلقائياً
  if (tried && !socket) {
    // سابقة فاشلة — أعد المحاولة (التوكن ربما تجدد)
  }
  tried = true;
  const base = process.env.NEXT_PUBLIC_API_URL || undefined; // فارغ = نفس الدومين
  socket = io(base as any, {
    path: '/api/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity,
  });
  socket.on('connect_error', () => { /* صامت — الاستطلاع يغطي */ });
  return socket;
}

// الاشتراك في رسائل الشات اللحظية — يرجع دالة إلغاء
export function onChatMessage(cb: (payload: any) => void): () => void {
  const s = connectRealtime();
  if (!s) return () => {};
  s.on('chat:message', cb);
  return () => { s.off('chat:message', cb); };
}

// إعادة الاتصال بعد تجديد التوكن (مثلاً عند انتهاء الجلسة وتجديدها)
export function reconnectRealtime() {
  if (socket) { socket.disconnect(); socket = null; tried = false; }
  connectRealtime();
}
