import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Test Helpers for E2E Tests
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
  accessToken?: string;
  accountantId?: string;
  clientId?: string;
}

export interface TestAccountant {
  id: string;
  userId: string;
  companyName: string;
  cnpj: string;
  crc: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
}

/**
 * Clean all test data from database
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Delete in correct order (respect foreign key constraints)
  await prisma.paymentDocument.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentFolder.deleteMany();
  await prisma.documentRequest.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invitation.deleteMany();

  // Financial module
  await prisma.aIInsight.deleteMany();
  await prisma.financialGoal.deleteMany();
  await prisma.investmentTransaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.installmentPayment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.recurringPayment.deleteMany();
  await prisma.financialTransaction.deleteMany();

  // Subscriptions
  await prisma.usageRecord.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();

  // Users and auth
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.client.deleteMany();
  await prisma.accountant.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Create a test accountant with user
 */
export async function createTestAccountant(
  app: INestApplication,
  data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
    cnpj: string;
    crc: string;
  },
): Promise<TestUser> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/signup')
    .send({
      email: data.email,
      password: data.password,
      name: data.name,
      role: 'ACCOUNTANT',
      companyName: data.companyName,
      cnpj: data.cnpj,
      crc: data.crc,
    })
    .expect(201);

  return {
    id: response.body.user.id,
    email: data.email,
    password: data.password,
    role: 'ACCOUNTANT',
    accessToken: response.body.accessToken,
    accountantId: response.body.user.accountant?.id,
  };
}

/**
 * Login as user and get access token
 */
export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body.accessToken;
}

/**
 * Create a test client for an accountant
 */
export async function createTestClient(
  app: INestApplication,
  accountantToken: string,
  data: {
    email: string;
    name: string;
    cpfCnpj: string;
    companyName?: string;
  },
): Promise<any> {
  const response = await request(app.getHttpServer())
    .post('/api/clients')
    .set('Authorization', `Bearer ${accountantToken}`)
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Invite a client
 */
export async function inviteClient(
  app: INestApplication,
  accountantToken: string,
  data: {
    email: string;
    name: string;
    cpfCnpj: string;
  },
): Promise<{ invitationId: string; token: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/invitations')
    .set('Authorization', `Bearer ${accountantToken}`)
    .send(data)
    .expect(201);

  return {
    invitationId: response.body.id,
    token: response.body.token,
  };
}

/**
 * Accept client invitation
 */
export async function acceptInvitation(
  app: INestApplication,
  token: string,
  password: string,
): Promise<{ accessToken: string; clientId: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/invitations/accept')
    .send({ token, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    clientId: response.body.user.client?.id,
  };
}

/**
 * Get current user info
 */
export async function getCurrentUser(
  app: INestApplication,
  token: string,
): Promise<any> {
  const response = await request(app.getHttpServer())
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return response.body;
}

/**
 * Wait for a specific time (for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}.${timestamp}.${random}@contasync-test.com`;
}

/**
 * Generate unique CNPJ for testing
 */
export function generateTestCNPJ(): string {
  const random = Math.floor(Math.random() * 100000000000000);
  return random.toString().padStart(14, '0');
}

/**
 * Generate unique CPF for testing
 */
export function generateTestCPF(): string {
  const random = Math.floor(Math.random() * 100000000000);
  return random.toString().padStart(11, '0');
}

/**
 * Simulate trial expiration
 */
export async function expireTrial(
  prisma: PrismaService,
  accountantId: string,
): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.subscription.updateMany({
    where: { accountantId },
    data: {
      trialEnd: yesterday,
    },
  });
}

/**
 * Simulate time passage for recurring payments
 */
export async function advanceTime(
  prisma: PrismaService,
  days: number,
): Promise<void> {
  // This is a helper to simulate time passage
  // In real tests, you would mock Date.now() or use a time travel library
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  // Update recurring payments nextDueDate
  await prisma.$executeRaw`
    UPDATE recurring_payments
    SET "nextDueDate" = "nextDueDate" - INTERVAL '${days} days'
    WHERE "isActive" = true
  `;
}
