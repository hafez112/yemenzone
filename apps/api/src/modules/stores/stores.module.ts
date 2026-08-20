import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { LocalAiService } from './local-ai.service';

@Module({
  controllers: [StoresController],
  providers: [StoresService, LocalAiService],
})
export class StoresModule {}
