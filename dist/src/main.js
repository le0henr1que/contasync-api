"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('ContaSync API')
        .setDescription('API de gestão contábil multi-cliente')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Autenticação e autorização')
        .addTag('users', 'Gestão de usuários')
        .addTag('clients', 'Gestão de clientes')
        .addTag('documents', 'Gestão de documentos fiscais')
        .addTag('payments', 'Gestão de pagamentos')
        .addTag('expenses', 'Gestão de despesas')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(process.env.PORT ?? 3000);
    console.log(`🚀 API rodando em: http://localhost:${process.env.PORT ?? 3000}/api`);
    console.log(`📚 Swagger disponível em: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map