import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Enable raw body for webhooks
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS - allow all origins in production for Railway health checks
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

  app.enableCors();

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix - exclude health check from prefix for Railway
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API rodando em: http://0.0.0.0:${port}/api`);
  console.log(`📚 Swagger disponível em: http://0.0.0.0:${port}/api/docs`);
  console.log(`❤️ Health check disponível em: http://0.0.0.0:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Erro ao iniciar a aplicação:', error);
  process.exit(1);
});
