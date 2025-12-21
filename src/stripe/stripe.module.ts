import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STRIPE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>('STRIPE_SECRET_KEY');

        if (!secretKey) {
          throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
        }

        return new Stripe(secretKey, {
          apiVersion: '2025-12-15.clover',
          typescript: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [STRIPE_CLIENT],
})
export class StripeModule {}
