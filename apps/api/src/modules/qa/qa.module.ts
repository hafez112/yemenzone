import { Module } from '@nestjs/common';
import { QaService } from './qa.service';
import { QaPublicController, QaSellerController } from './qa.controller';

@Module({
  controllers: [QaPublicController, QaSellerController],
  providers: [QaService],
})
export class QaModule {}
