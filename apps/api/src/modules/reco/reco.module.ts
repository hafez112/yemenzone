import { Module } from '@nestjs/common';
import { RecoService } from './reco.service';
import { RecoController } from './reco.controller';

@Module({
  controllers: [RecoController],
  providers: [RecoService],
})
export class RecoModule {}
