import { Module } from '@nestjs/common';
import { MyToolsService } from './mytools.service';
import { MyToolsController } from './mytools.controller';

@Module({
  controllers: [MyToolsController],
  providers: [MyToolsService],
})
export class MyToolsModule {}
