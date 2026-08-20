import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

// ⚡ البوابة الفورية — WebSocket لحظي للمحادثات والتنبيهات
// المسار /api/socket.io يمر عبر Caddy ضمن /api/* — لا تغيير في البنية
// المصادقة بتوكن JWT نفسه (handshake.auth.token) — غير المصادقين يُقطعون فوراً
@WebSocketGateway({
  path: '/api/socket.io',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('Realtime');

  @WebSocketServer()
  server!: Server;

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth as any)?.token || client.handshake.query?.token;
      const payload: any = await this.jwt.verifyAsync(String(token || ''));
      if (!payload?.sub || !payload?.typ) throw new Error('bad token');
      client.data.user = { sub: payload.sub, typ: payload.typ };
      await client.join(`user:${payload.typ}:${payload.sub}`);
      client.emit('ready', { ok: true });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    client.removeAllListeners();
  }

  // إرسال حدث لمستخدم محدد (بائع/عميل/سائق/مدير)
  toUser(typ: string, id: string, event: string, payload: any) {
    if (!this.server || !id) return;
    this.server.to(`user:${typ}:${id}`).emit(event, payload);
  }
}
