"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const clients_module_1 = require("./clients/clients.module");
const activity_log_module_1 = require("./activity-log/activity-log.module");
const documents_module_1 = require("./documents/documents.module");
const document_requests_module_1 = require("./document-requests/document-requests.module");
const payments_module_1 = require("./payments/payments.module");
const expenses_module_1 = require("./expenses/expenses.module");
const notifications_module_1 = require("./notifications/notifications.module");
const email_module_1 = require("./email/email.module");
const stripe_module_1 = require("./stripe/stripe.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const tenant_middleware_1 = require("./common/middleware/tenant.middleware");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const plans_module_1 = require("./plans/plans.module");
const invitations_module_1 = require("./invitations/invitations.module");
const trial_module_1 = require("./trial/trial.module");
const checkout_module_1 = require("./checkout/checkout.module");
const limits_module_1 = require("./limits/limits.module");
const document_folders_module_1 = require("./document-folders/document-folders.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_middleware_1.TenantMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            stripe_module_1.StripeModule,
            webhooks_module_1.WebhooksModule,
            auth_module_1.AuthModule,
            clients_module_1.ClientsModule,
            activity_log_module_1.ActivityLogModule,
            documents_module_1.DocumentsModule,
            document_requests_module_1.DocumentRequestsModule,
            payments_module_1.PaymentsModule,
            expenses_module_1.ExpensesModule,
            notifications_module_1.NotificationsModule,
            email_module_1.EmailModule,
            subscriptions_module_1.SubscriptionsModule,
            plans_module_1.PlansModule,
            invitations_module_1.InvitationsModule,
            trial_module_1.TrialModule,
            checkout_module_1.CheckoutModule,
            limits_module_1.LimitsModule,
            document_folders_module_1.DocumentFoldersModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map