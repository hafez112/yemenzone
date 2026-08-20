import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentAiService } from './payment-ai.service';
import { PublicPaymentsController, AdminPaymentsController } from './payments.controller';

@Module({
  controllers: [PublicPaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PaymentAiService],
})
export class PaymentsModule {}
