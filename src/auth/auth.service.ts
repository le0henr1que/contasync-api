import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterAccountantDto } from './dto/register.dto';
import { SignupDto, TenantType } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Role, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        accountant: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
        client: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const payload: any = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    if (user.accountant) {
      payload.accountantId = user.accountant.id;
      payload.subscriptionStatus = user.accountant.subscriptionStatus;
    }

    if (user.client) {
      payload.clientId = user.client.id;
    }

    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = await this.createRefreshToken(user.id, rememberMe);

    // Build subscription info if accountant has one
    let subscriptionInfo = null;
    if (user.accountant?.subscription) {
      const sub = user.accountant.subscription;
      subscriptionInfo = {
        id: sub.id,
        status: sub.status,
        interval: sub.interval,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        trialEnd: sub.trialEnd,
        plan: sub.plan ? {
          id: sub.plan.id,
          name: sub.plan.name,
          slug: sub.plan.slug,
          description: sub.plan.description,
          tenantType: sub.plan.tenantType,
          priceMonthly: sub.plan.priceMonthly,
          priceYearly: sub.plan.priceYearly,
          stripePriceIdMonthly: sub.plan.stripePriceIdMonthly,
          stripePriceIdYearly: sub.plan.stripePriceIdYearly,
          limitsJson: sub.plan.limitsJson,
          featuresJson: sub.plan.featuresJson,
        } : null,
      };
    } else if (user.client?.subscription) {
      // Build subscription info for individual client
      const sub = user.client.subscription;
      subscriptionInfo = {
        id: sub.id,
        status: sub.status,
        interval: sub.interval,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        trialEnd: sub.trialEnd,
        plan: sub.plan ? {
          id: sub.plan.id,
          name: sub.plan.name,
          slug: sub.plan.slug,
          description: sub.plan.description,
          tenantType: sub.plan.tenantType,
          priceMonthly: sub.plan.priceMonthly,
          priceYearly: sub.plan.priceYearly,
          stripePriceIdMonthly: sub.plan.stripePriceIdMonthly,
          stripePriceIdYearly: sub.plan.stripePriceIdYearly,
          limitsJson: sub.plan.limitsJson,
          featuresJson: sub.plan.featuresJson,
        } : null,
      };
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountantId: user.accountant?.id,
        clientId: user.client?.id,
        expenseModuleEnabled: user.client?.expenseModuleEnabled ?? false,
        financialModuleEnabled: user.client?.financialModuleEnabled ?? false,
        subscriptionStatus: user.accountant?.subscriptionStatus,
        trialEndsAt: user.accountant?.trialEndsAt,
        subscription: subscriptionInfo,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
        name: registerDto.name,
        role: registerDto.role || Role.CLIENT,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async registerAccountant(registerDto: RegisterAccountantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const existingCnpj = await this.prisma.accountant.findUnique({
      where: { cnpj: registerDto.cnpj },
    });

    if (existingCnpj) {
      throw new ConflictException('Este CNPJ já está cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
        name: registerDto.name,
        role: Role.ACCOUNTANT,
        accountant: {
          create: {
            companyName: registerDto.companyName,
            cnpj: registerDto.cnpj,
            crc: registerDto.crc,
            phone: registerDto.phone,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        accountant: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountantId: user.accountant?.id,
    };
  }

  async signup(signupDto: SignupDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    // Get the selected plan or default trial plan
    let selectedPlan;
    if (signupDto.planId) {
      selectedPlan = await this.prisma.plan.findUnique({
        where: { id: signupDto.planId },
      });
      if (!selectedPlan || !selectedPlan.isActive) {
        throw new ConflictException('Plano selecionado não encontrado ou inativo.');
      }
    } else {
      // Fallback to trial plan if no plan selected
      const trialSlug = signupDto.type === TenantType.ACCOUNTANT_FIRM ? 'firm-trial' : 'individual-free-trial';
      selectedPlan = await this.prisma.plan.findFirst({
        where: {
          tenantType: signupDto.type,
          slug: trialSlug,
          isActive: true,
        },
      });
      if (!selectedPlan) {
        throw new ConflictException('Plano trial não encontrado. Contate o suporte.');
      }
    }

    // Calculate trial period (14 days)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const currentPeriodStart = new Date();
    const currentPeriodEnd = trialEndsAt;

    if (signupDto.type === TenantType.ACCOUNTANT_FIRM) {
      // Create ACCOUNTANT with required fields
      if (!signupDto.cpfCnpj || !signupDto.companyName) {
        throw new ConflictException('CNPJ e Nome da Empresa são obrigatórios para contadores');
      }

      // Check if CNPJ already exists
      const existingCnpj = await this.prisma.accountant.findUnique({
        where: { cnpj: signupDto.cpfCnpj },
      });

      if (existingCnpj) {
        throw new ConflictException('Este CNPJ já está cadastrado');
      }

      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          passwordHash: hashedPassword,
          name: signupDto.name,
          role: Role.ACCOUNTANT,
          accountant: {
            create: {
              companyName: signupDto.companyName,
              cnpj: signupDto.cpfCnpj,
              crc: '', // Optional field, can be filled later
              phone: null,
              trialEndsAt,
              subscriptionStatus: SubscriptionStatus.TRIALING,
              subscription: {
                create: {
                  planId: selectedPlan.id,
                  status: SubscriptionStatus.TRIALING,
                  interval: 'MONTHLY',
                  currentPeriodStart,
                  currentPeriodEnd,
                  trialEnd: trialEndsAt,
                  cancelAtPeriodEnd: false,
                },
              },
            },
          },
        },
        include: {
          accountant: {
            include: {
              subscription: true,
            },
          },
        },
      });

      // Generate access token
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        accountantId: user.accountant?.id,
        subscriptionStatus: user.accountant?.subscriptionStatus,
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });

      // Create Stripe checkout session for the accountant to add payment method
      // Only if plan has Stripe prices configured
      let checkoutUrl: string | undefined;
      if (selectedPlan.stripePriceIdMonthly || selectedPlan.stripePriceIdYearly) {
        try {
          const checkoutSession = await this.subscriptionsService.createCheckoutSession(
            user.accountant!.id,
            {
              planId: selectedPlan.id,
              successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing`,
            },
          );
          checkoutUrl = checkoutSession.url;
        } catch (error) {
          console.error('Error creating Stripe checkout session during signup:', error);
          // Don't fail signup if checkout creation fails
        }
      } else {
        console.log(`⚠️  Stripe checkout skipped - Plan "${selectedPlan.name}" has no Stripe price IDs configured`);
      }

      // TODO: Send welcome email

      return {
        accessToken,
        checkoutUrl,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountantId: user.accountant?.id,
          subscriptionStatus: user.accountant?.subscriptionStatus,
          trialEndsAt: user.accountant?.trialEndsAt,
        },
      };
    } else {
      // Create INDIVIDUAL CLIENT (standalone, no accountant)
      if (!signupDto.cpfCnpj) {
        throw new ConflictException('CPF é obrigatório para clientes individuais');
      }

      // Check if CPF already exists
      const existingCpf = await this.prisma.client.findUnique({
        where: { cpfCnpj: signupDto.cpfCnpj },
      });

      if (existingCpf) {
        throw new ConflictException('Este CPF já está cadastrado');
      }

      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          passwordHash: hashedPassword,
          name: signupDto.name,
          role: Role.CLIENT,
          client: {
            create: {
              cpfCnpj: signupDto.cpfCnpj,
              phone: null,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              // Module configuration for individual clients
              financialModuleEnabled: true,  // Enable personal finance module
              expenseModuleEnabled: false,   // Disable accounting modules (until linked to accountant)
              // Individual client has their own subscription
              subscription: {
                create: {
                  planId: selectedPlan.id,
                  status: SubscriptionStatus.TRIALING,
                  interval: 'MONTHLY',
                  currentPeriodStart,
                  currentPeriodEnd,
                  trialEnd: trialEndsAt,
                  cancelAtPeriodEnd: false,
                },
              },
            },
          },
        },
        include: {
          client: {
            include: {
              subscription: true,
            },
          },
        },
      });

      // Generate access token
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        clientId: user.client?.id,
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });

      // Create Stripe checkout session for individual client
      let checkoutUrl: string | undefined;
      if (selectedPlan.stripePriceIdMonthly || selectedPlan.stripePriceIdYearly) {
        try {
          // For individual clients, use the dedicated client checkout method
          const checkoutSession = await this.subscriptionsService.createClientCheckoutSession(
            user.client!.id,
            {
              planId: selectedPlan.id,
              successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/client-portal/settings?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/client-portal/settings`,
            },
          );
          checkoutUrl = checkoutSession.url;
        } catch (error) {
          console.error('Error creating Stripe checkout session for individual client:', error);
          // Don't fail signup if checkout creation fails
        }
      } else {
        console.log(`⚠️  Stripe checkout skipped - Plan "${selectedPlan.name}" has no Stripe price IDs configured`);
      }

      // TODO: Send welcome email

      return {
        accessToken,
        checkoutUrl,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.client?.id,
          expenseModuleEnabled: user.client?.expenseModuleEnabled ?? false,
          financialModuleEnabled: user.client?.financialModuleEnabled ?? true,
        },
      };
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { accountant: true, client: true } } },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = storedToken.user;

    const payload: any = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    if (user.accountant) {
      payload.accountantId = user.accountant.id;
      payload.subscriptionStatus = user.accountant.subscriptionStatus;
    }

    if (user.client) {
      payload.clientId = user.client.id;
    }

    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });

    return { accessToken };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Logout realizado com sucesso' };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accountant: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
        client: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Build subscription info
    let subscriptionInfo = null;
    if (user.accountant?.subscription) {
      const sub = user.accountant.subscription;
      subscriptionInfo = {
        id: sub.id,
        status: sub.status,
        interval: sub.interval,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEnd: sub.trialEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        plan: sub.plan,
      };
    } else if (user.client?.subscription) {
      const sub = user.client.subscription;
      subscriptionInfo = {
        id: sub.id,
        status: sub.status,
        interval: sub.interval,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEnd: sub.trialEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        plan: sub.plan,
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountant: user.accountant,
      client: user.client,
      accountantId: user.accountant?.id,
      clientId: user.client?.id,
      expenseModuleEnabled: user.client?.expenseModuleEnabled ?? false,
      financialModuleEnabled: user.client?.financialModuleEnabled ?? false,
      onboardingCompleted: user.accountant?.onboardingCompleted ?? true,
      subscription: subscriptionInfo,
      // Indicate whether this is an individual client (has own subscription)
      isIndividualClient: user.client && !user.client.accountantId,
    };
  }

  async completeOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accountant: true },
    });

    if (!user?.accountant) {
      throw new UnauthorizedException('Usuário não é um contador');
    }

    await this.prisma.accountant.update({
      where: { id: user.accountant.id },
      data: { onboardingCompleted: true },
    });

    return { message: 'Onboarding completado com sucesso' };
  }

  async getOnboardingProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accountant: {
          include: {
            clients: true,
          },
        },
      },
    });

    if (!user?.accountant) {
      throw new UnauthorizedException('Usuário não é um contador');
    }

    // Check if accountant has completed key tasks
    const hasAddedClient = user.accountant.clients.length > 0;

    const documentsCount = await this.prisma.document.count({
      where: {
        createdById: userId,
      },
    });
    const hasUploadedDocument = documentsCount > 0;

    const paymentsCount = await this.prisma.payment.count({
      where: {
        client: {
          accountantId: user.accountant.id,
        },
      },
    });
    const hasRegisteredPayment = paymentsCount > 0;

    // Profile is considered complete if has companyName and cnpj (already required at signup)
    const hasCompletedProfile = !!(user.accountant.companyName && user.accountant.cnpj);

    const tasks = {
      hasAddedClient,
      hasUploadedDocument,
      hasRegisteredPayment,
      hasCompletedProfile,
    };

    const completedTasks = Object.values(tasks).filter(Boolean).length;
    const totalTasks = Object.keys(tasks).length;
    const completionPercentage = (completedTasks / totalTasks) * 100;

    return {
      onboardingCompleted: user.accountant.onboardingCompleted,
      tasks,
      completionPercentage,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'Se o e-mail existir, um link de redefinição será enviado' };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    console.log(`📧 [DEV] Reset password link: http://localhost:3001/reset-password?token=${token}`);

    return { message: 'Se o e-mail existir, um link de redefinição será enviado' };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Token inválido');
    }

    if (resetToken.used) {
      throw new UnauthorizedException('Token já foi utilizado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Link expirado. Solicite um novo');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso' };
  }

  private async createRefreshToken(userId: string, rememberMe?: boolean): Promise<string> {
    const token = randomBytes(32).toString('hex');
    // If rememberMe is true, token expires in 30 days, otherwise 24 hours
    const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expirationTime);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }
}
