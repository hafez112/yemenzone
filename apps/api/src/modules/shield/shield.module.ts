import { Global, Module } from '@nestjs/common';
import { ShieldService } from './shield.service';
import { ShieldMiddleware } from './shield.middleware';
import { AdminShieldController, PublicShieldController } from './shield.controller';

@Global()
@Module({
  controllers: [PublicShieldController, AdminShieldController],
  providers: [ShieldService, ShieldMiddleware],
  exports: [ShieldService, ShieldMiddleware],
})
export class ShieldModule {}
