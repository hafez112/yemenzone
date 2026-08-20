import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SecurityService } from './security.service';
import { CacheService } from './cache.service';
import { QueueService } from './queue.service';
import { HealthController } from './health.controller';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me-super-secret-key-32chars-min',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any },
    }),
  ],
  controllers: [HealthController],
  providers: [SecurityService, CacheService, QueueService],
  exports: [SecurityService, JwtModule, CacheService, QueueService],
})
export class SecurityModule {}
