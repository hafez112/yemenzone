import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductAiService } from './product-ai.service';
import { StorefrontController } from '../public/storefront.controller';
import { WishlistModule } from '../wishlist/wishlist.module';

@Module({
  imports: [WishlistModule], // 💸 تنبيه انخفاض السعر عند تحديث المنتج
  controllers: [ProductsController, StorefrontController],
  providers: [ProductsService, ProductAiService],
})
export class ProductsModule {}
