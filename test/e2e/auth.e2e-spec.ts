import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  cleanDatabase,
  createTestAccountant,
  loginUser,
  getCurrentUser,
  generateTestEmail,
  generateTestCNPJ,
} from '../utils/test-helpers';

/**
 * E2E Tests for Authentication & Onboarding
 *
 * Tests:
 * - E2E-001: Complete accountant signup flow
 * - E2E-002: Login and password reset
 */
describe('Authentication & Onboarding (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation pipes as main app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  /**
   * E2E-001: Complete Accountant Signup Flow
   *
   * Priority: CRITICAL
   *
   * Flow:
   * 1. Submit signup form with accountant data
   * 2. Verify account created with 14-day trial
   * 3. Verify user can login
   * 4. Verify onboarding modal state
   * 5. Complete onboarding
   * 6. Verify modal doesn't appear again after logout/login
   */
  describe('E2E-001: Complete Accountant Signup Flow', () => {
    it('should create accountant account with trial and complete onboarding', async () => {
      const testEmail = generateTestEmail('accountant');
      const testCNPJ = generateTestCNPJ();
      const password = 'Test@123456';

      // Step 1: Signup
      const signupData = {
        email: testEmail,
        password: password,
        name: 'Test Accountant',
        role: 'ACCOUNTANT',
        companyName: 'Test Accounting Firm',
        cnpj: testCNPJ,
        crc: 'CRC-123456',
      };

      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Verify signup response
      expect(signupResponse.body).toHaveProperty('accessToken');
      expect(signupResponse.body).toHaveProperty('user');
      expect(signupResponse.body.user.email).toBe(testEmail);
      expect(signupResponse.body.user.role).toBe('ACCOUNTANT');
      expect(signupResponse.body.user.accountant).toBeDefined();

      const { accessToken, user } = signupResponse.body;
      const accountantId = user.accountant.id;

      // Step 2: Verify trial subscription created (14 days)
      const subscription = await prisma.subscription.findUnique({
        where: { accountantId },
        include: { plan: true },
      });

      expect(subscription).toBeDefined();
      expect(subscription?.status).toBe('TRIALING');
      expect(subscription?.trialEnd).toBeDefined();

      // Verify trial is ~14 days
      const trialDays = Math.ceil(
        (subscription!.trialEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(trialDays).toBeGreaterThanOrEqual(13);
      expect(trialDays).toBeLessThanOrEqual(15);

      // Step 3: Verify accountant not yet completed onboarding
      expect(user.accountant.onboardingCompleted).toBe(false);

      // Step 4: Complete onboarding
      await request(app.getHttpServer())
        .post('/api/auth/complete-onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 5: Verify onboarding marked as completed
      const updatedUser = await getCurrentUser(app, accessToken);
      expect(updatedUser.accountant.onboardingCompleted).toBe(true);

      // Step 6: Logout and login again
      const newAccessToken = await loginUser(app, testEmail, password);
      expect(newAccessToken).toBeDefined();

      // Step 7: Verify onboarding still completed (modal shouldn't appear)
      const reloggedUser = await getCurrentUser(app, newAccessToken);
      expect(reloggedUser.accountant.onboardingCompleted).toBe(true);
      expect(reloggedUser.accountant.subscriptionStatus).toBe('TRIALING');
    });

    it('should reject signup with invalid CNPJ format', async () => {
      const signupData = {
        email: generateTestEmail('invalid'),
        password: 'Test@123456',
        name: 'Test User',
        role: 'ACCOUNTANT',
        companyName: 'Test Company',
        cnpj: '123', // Invalid CNPJ (too short)
        crc: 'CRC-123456',
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(400);
    });

    it('should reject signup with duplicate email', async () => {
      const testEmail = generateTestEmail('duplicate');
      const password = 'Test@123456';

      // Create first user
      await createTestAccountant(app, {
        email: testEmail,
        password,
        name: 'First User',
        companyName: 'First Company',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-111111',
      });

      // Try to create second user with same email
      const signupData = {
        email: testEmail,
        password,
        name: 'Second User',
        role: 'ACCOUNTANT',
        companyName: 'Second Company',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-222222',
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(400);
    });
  });

  /**
   * E2E-002: Login and Password Reset
   *
   * Priority: CRITICAL
   *
   * Flow:
   * 1. Login with valid credentials
   * 2. Logout
   * 3. Request password reset
   * 4. Reset password with token
   * 5. Login with new password
   */
  describe('E2E-002: Login and Password Reset', () => {
    it('should login successfully with valid credentials', async () => {
      const testEmail = generateTestEmail('login-test');
      const password = 'Test@123456';

      // Create test user
      await createTestAccountant(app, {
        email: testEmail,
        password,
        name: 'Login Test User',
        companyName: 'Test Company',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-123456',
      });

      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.email).toBe(testEmail);
    });

    it('should reject login with invalid credentials', async () => {
      const testEmail = generateTestEmail('invalid-login');

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        })
        .expect(401);
    });

    it('should request password reset and reset password', async () => {
      const testEmail = generateTestEmail('reset-test');
      const oldPassword = 'OldPass@123';
      const newPassword = 'NewPass@456';

      // Create test user
      const user = await createTestAccountant(app, {
        email: testEmail,
        password: oldPassword,
        name: 'Reset Test User',
        companyName: 'Test Company',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-123456',
      });

      // Request password reset
      await request(app.getHttpServer())
        .post('/api/auth/request-password-reset')
        .send({ email: testEmail })
        .expect(200);

      // Get reset token from database (in real app, this would be from email)
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          used: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(resetToken).toBeDefined();

      // Reset password using token
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword,
        })
        .expect(200);

      // Verify old password doesn't work
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password: oldPassword })
        .expect(401);

      // Verify new password works
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password: newPassword })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Verify token is marked as used
      const usedToken = await prisma.passwordResetToken.findUnique({
        where: { id: resetToken!.id },
      });
      expect(usedToken?.used).toBe(true);
    });

    it('should reject password reset with expired token', async () => {
      const testEmail = generateTestEmail('expired-token');

      // Create test user
      const user = await createTestAccountant(app, {
        email: testEmail,
        password: 'Test@123456',
        name: 'Expired Token User',
        companyName: 'Test Company',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-123456',
      });

      // Create expired token
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago

      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: 'expired-token-123',
          expiresAt: expiredDate,
          used: false,
        },
      });

      // Try to reset with expired token
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken.token,
          newPassword: 'NewPass@456',
        })
        .expect(400);
    });
  });

  /**
   * Additional Test: Verify JWT token validation
   */
  describe('JWT Token Validation', () => {
    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-123')
        .expect(401);
    });

    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should accept valid token and return user info', async () => {
      const testEmail = generateTestEmail('token-test');
      const user = await createTestAccountant(app, {
        email: testEmail,
        password: 'Test@123456',
        name: 'Token Test User',
        companyName: 'Test Company',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-123456',
      });

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testEmail);
      expect(response.body.role).toBe('ACCOUNTANT');
    });
  });
});
