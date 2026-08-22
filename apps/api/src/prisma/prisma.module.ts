import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CurrencyService } from './currency.service';

@Global()
@Module({
  providers: [PrismaService, CurrencyService],
  exports: [PrismaService, CurrencyService],
})
export class PrismaModule {}
