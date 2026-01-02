import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { DocumentsModule } from './documents/documents.module';
import { DocumentRequestsModule } from './document-requests/document-requests.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { StripeModule } from './stripe/stripe.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PlansModule } from './plans/plans.module';
import { InvitationsModule } from './invitations/invitations.module';
import { TrialModule } from './trial/trial.module';
import { CheckoutModule } from './checkout/checkout.module';
import { LimitsModule } from './limits/limits.module';
import { DocumentFoldersModule } from './document-folders/document-folders.module';
import { HealthModule } from './health/health.module';
import { FeedbackModule } from './feedback/feedback.module';
// import { FinancialModule } from './financial/financial.module'; // Temporarily disabled - fixing schema issues
import { CommonModule } from './common/common.module';
import { FinancialModule } from './financial/financial.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CommonModule,
    StripeModule,
    WebhooksModule,
    AuthModule,
    ClientsModule,
    ActivityLogModule,
    DocumentsModule,
    DocumentRequestsModule,
    PaymentsModule,
    ExpensesModule,
    NotificationsModule,
    EmailModule,
    SubscriptionsModule,
    PlansModule,
    InvitationsModule,
    TrialModule,
    CheckoutModule,
    LimitsModule,
    DocumentFoldersModule,
    HealthModule,
    FeedbackModule,
    FinancialModule,
    // FinancialModule, // Temporarily disabled - fixing schema issues
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply TenantMiddleware to all routes except health check
    // It will extract tenantId from JWT and set it in AsyncLocalStorage
    consumer
      .apply(TenantMiddleware)
      .exclude('health')
      .forRoutes('*');
  }
}
