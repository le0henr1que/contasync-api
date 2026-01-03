import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateClientCheckoutSessionDto } from './dto/create-client-checkout-session.dto';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * POST /api/checkout/create-session
   *
   * Endpoint público para criar uma sessão de checkout no Stripe
   * ANTES de criar a conta do usuário.
   *
   * Fluxo:
   * 1. Frontend coleta dados do usuário (email, senha, empresa, plano)
   * 2. Chama este endpoint
   * 3. Backend valida dados e cria sessão no Stripe com metadados
   * 4. Retorna URL do Stripe Checkout
   * 5. Usuário paga no Stripe
   * 6. Webhook do Stripe (checkout.session.completed) cria User + Accountant + Subscription
   *
   * @param dto - Dados para criar a sessão de checkout
   * @returns sessionId e checkoutUrl do Stripe
   */
  @Public()
  @Post('create-session')
  @HttpCode(HttpStatus.OK)
  async createSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.checkoutService.createCheckoutSession(dto);
  }

  /**
   * POST /api/checkout/create-client-session
   *
   * Endpoint público para criar uma sessão de checkout no Stripe
   * para CLIENTES INDIVIDUAIS (sem contador).
   *
   * Fluxo:
   * 1. Frontend coleta dados do cliente (email, senha, CPF, plano)
   * 2. Chama este endpoint
   * 3. Backend valida dados e cria sessão no Stripe com metadados
   * 4. Retorna URL do Stripe Checkout
   * 5. Cliente paga no Stripe
   * 6. Webhook do Stripe (checkout.session.completed) cria User + Client + Subscription
   *
   * @param dto - Dados para criar a sessão de checkout do cliente
   * @returns sessionId e checkoutUrl do Stripe
   */
  @Public()
  @Post('create-client-session')
  @HttpCode(HttpStatus.OK)
  async createClientSession(@Body() dto: CreateClientCheckoutSessionDto) {
    return this.checkoutService.createClientCheckoutSession(dto);
  }
}
