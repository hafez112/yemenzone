import { Module } from '@nestjs/common';
import { StoreTypesController } from './store-types.controller';
import { StoreTypesService } from './store-types.service';

@Module({
  controllers: [StoreTypesController],
  providers: [StoreTypesService],
})
export class StoreTypesModule {}
