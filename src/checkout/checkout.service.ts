import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateClientCheckoutSessionDto } from './dto/create-client-checkout-session.dto';
import Stripe from 'stripe';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    this.logger.log(`Creating checkout session for email: ${dto.email}`);

    // 1. Verificar se já existe usuário com este email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Já existe um usuário cadastrado com este email');
    }

    // 2. Verificar se já existe CNPJ cadastrado
    const existingAccountant = await this.prisma.accountant.findUnique({
      where: { cnpj: dto.cpfCnpj },
    });

    if (existingAccountant) {
      throw new BadRequestException('Já existe um escritório cadastrado com este CNPJ');
    }

    // 3. Buscar o plano
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plano não encontrado ou inativo');
    }

    // 4. Determinar o Stripe Price ID baseado no intervalo
    const stripePriceId = dto.billingInterval === 'MONTHLY'
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdYearly;

    if (!stripePriceId) {
      throw new BadRequestException(`Plano não possui preço configurado para cobrança ${dto.billingInterval}`);
    }

    // 5. Hash da senha (será armazenada nos metadados para criar o usuário após pagamento)
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 6. Preparar metadados para o Stripe (serão usados no webhook)
    const metadata = {
      email: dto.email,
      name: dto.name,
      passwordHash,
      cpfCnpj: dto.cpfCnpj,
      companyName: dto.companyName,
      crc: dto.crc,
      phone: dto.phone || '',
      planId: dto.planId,
      billingInterval: dto.billingInterval,
      flow: 'public_checkout', // Identificador para o webhook saber que é um checkout público
    };

    // 7. Criar sessão de checkout no Stripe
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/checkout/cancel`,
        customer_email: dto.email,
        metadata,
        subscription_data: {
          metadata, // Também adicionar aos metadados da subscription
        },
      });

      this.logger.log(`Checkout session created successfully: ${session.id}`);

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao criar sessão de checkout. Tente novamente.');
    }
  }

  async createClientCheckoutSession(dto: CreateClientCheckoutSessionDto) {
    this.logger.log(`Creating client checkout session for email: ${dto.email}`);

    // 1. Verificar se já existe usuário com este email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Já existe um usuário cadastrado com este email');
    }

    // 2. Verificar se já existe CPF cadastrado
    const existingClient = await this.prisma.client.findUnique({
      where: { cpfCnpj: dto.cpf },
    });

    if (existingClient) {
      throw new BadRequestException('Já existe um cliente cadastrado com este CPF');
    }

    // 3. Buscar o plano
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plano não encontrado ou inativo');
    }

    // 4. Determinar o Stripe Price ID baseado no intervalo
    const stripePriceId = dto.billingInterval === 'MONTHLY'
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdYearly;

    if (!stripePriceId) {
      throw new BadRequestException(`Plano não possui preço configurado para cobrança ${dto.billingInterval}`);
    }

    // 5. Hash da senha (será armazenada nos metadados para criar o usuário após pagamento)
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 6. Preparar metadados para o Stripe (serão usados no webhook)
    const metadata = {
      email: dto.email,
      name: dto.name,
      passwordHash,
      cpf: dto.cpf,
      planId: dto.planId,
      billingInterval: dto.billingInterval,
      flow: 'public_client_checkout', // Identificador para o webhook saber que é checkout de cliente
      userType: 'CLIENT',
    };

    // 7. Criar sessão de checkout no Stripe
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/checkout/cancel`,
        customer_email: dto.email,
        metadata,
        subscription_data: {
          metadata, // Também adicionar aos metadados da subscription
        },
      });

      this.logger.log(`Client checkout session created successfully: ${session.id}`);

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch (error) {
      this.logger.error(`Failed to create client checkout session: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao criar sessão de checkout. Tente novamente.');
    }
  }
}
