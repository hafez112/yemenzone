import { Module } from '@nestjs/common';
import { ReviewsController, CustomerDashboardController, SellerAdviceController, SellerReviewsController } from './reviews.controller';
import { SmartScoreService } from './smart-score.service';

@Module({
  controllers: [ReviewsController, CustomerDashboardController, SellerAdviceController, SellerReviewsController],
  providers: [SmartScoreService],
})
export class ReviewsModule {}
