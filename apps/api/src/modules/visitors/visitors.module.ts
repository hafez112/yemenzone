import { Module } from '@nestjs/common';
import { VisitorsTrackController, AdminVisitorsController } from './visitors.controller';
import { VisitorsService } from './visitors.service';

@Module({
  controllers: [VisitorsTrackController, AdminVisitorsController],
  providers: [VisitorsService],
})
export class VisitorsModule {}
