import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartPublicController, CartAdminController } from './cart.controller';

@Module({
  controllers: [CartPublicController, CartAdminController],
  providers: [CartService],
})
export class CartModule {}
