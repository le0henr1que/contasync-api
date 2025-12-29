import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  cleanDatabase,
  createTestAccountant,
  createTestClient,
  inviteClient,
  acceptInvitation,
  generateTestEmail,
  generateTestCNPJ,
  generateTestCPF,
} from '../utils/test-helpers';

/**
 * E2E Tests for Multi-Tenancy & Data Isolation
 *
 * Tests:
 * - E2E-020: Complete data isolation between accountants
 */
describe('Multi-Tenancy & Data Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
   * E2E-020: Data Isolation Between Accountants
   *
   * Priority: CRITICAL
   *
   * Flow:
   * 1. Create Accountant A with Client A1
   * 2. Create Accountant B with Client B1
   * 3. Accountant A creates payment for Client A1
   * 4. Login as Accountant B
   * 5. Verify Accountant B cannot access Payment A (via API)
   * 6. Verify Accountant B's payment list is empty
   * 7. Client A1 creates expense
   * 8. Login as Client B1
   * 9. Verify Client B1 cannot see Client A1's expense
   * 10. Verify queries enforce accountantId filter
   */
  describe('E2E-020: Data Isolation Between Accountants', () => {
    it('should enforce complete data isolation between accountants', async () => {
      // ===== STEP 1: Create Accountant A with Client A1 =====
      const accountantA = await createTestAccountant(app, {
        email: generateTestEmail('accountant-a'),
        password: 'TestA@123456',
        name: 'Accountant A',
        companyName: 'Firm A',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-AAA111',
      });

      const invitationA = await inviteClient(app, accountantA.accessToken!, {
        email: generateTestEmail('client-a1'),
        name: 'Client A1',
        cpfCnpj: generateTestCPF(),
      });

      const clientA1 = await acceptInvitation(
        app,
        invitationA.token,
        'ClientA1@123',
      );

      // ===== STEP 2: Create Accountant B with Client B1 =====
      const accountantB = await createTestAccountant(app, {
        email: generateTestEmail('accountant-b'),
        password: 'TestB@123456',
        name: 'Accountant B',
        companyName: 'Firm B',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-BBB222',
      });

      const invitationB = await inviteClient(app, accountantB.accessToken!, {
        email: generateTestEmail('client-b1'),
        name: 'Client B1',
        cpfCnpj: generateTestCPF(),
      });

      const clientB1 = await acceptInvitation(
        app,
        invitationB.token,
        'ClientB1@123',
      );

      // ===== STEP 3: Accountant A creates payment for Client A1 =====
      const paymentA = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${accountantA.accessToken}`)
        .send({
          clientId: clientA1.clientId,
          paymentType: 'CLIENT',
          title: 'Payment from A for A1',
          amount: 1000.0,
          dueDate: new Date().toISOString(),
        })
        .expect(201);

      const paymentAId = paymentA.body.id;

      // ===== STEP 4-5: Verify Accountant B cannot access Payment A =====

      // Try to get Payment A by ID as Accountant B
      await request(app.getHttpServer())
        .get(`/api/payments/${paymentAId}`)
        .set('Authorization', `Bearer ${accountantB.accessToken}`)
        .expect(404); // Should not find it (filtered by accountantId)

      // ===== STEP 6: Verify Accountant B's payment list is empty =====
      const paymentsB = await request(app.getHttpServer())
        .get('/api/payments')
        .set('Authorization', `Bearer ${accountantB.accessToken}`)
        .expect(200);

      expect(paymentsB.body.payments).toHaveLength(0);
      expect(paymentsB.body.total).toBe(0);

      // ===== Verify Accountant A can see their own payment =====
      const paymentsA = await request(app.getHttpServer())
        .get('/api/payments')
        .set('Authorization', `Bearer ${accountantA.accessToken}`)
        .expect(200);

      expect(paymentsA.body.payments).toHaveLength(1);
      expect(paymentsA.body.payments[0].id).toBe(paymentAId);

      // ===== STEP 7: Client A1 creates expense =====
      const expenseA1 = await request(app.getHttpServer())
        .post('/api/expenses')
        .set('Authorization', `Bearer ${clientA1.accessToken}`)
        .send({
          category: 'FOOD',
          description: 'Expense from Client A1',
          amount: 150.0,
          date: new Date().toISOString(),
        })
        .expect(201);

      const expenseA1Id = expenseA1.body.id;

      // ===== STEP 8-9: Verify Client B1 cannot see Client A1's expense =====

      // Try to get Expense A1 by ID as Client B1
      await request(app.getHttpServer())
        .get(`/api/expenses/${expenseA1Id}`)
        .set('Authorization', `Bearer ${clientB1.accessToken}`)
        .expect(404); // Should not find it

      // Verify Client B1's expense list is empty
      const expensesB1 = await request(app.getHttpServer())
        .get('/api/expenses/me')
        .set('Authorization', `Bearer ${clientB1.accessToken}`)
        .expect(200);

      expect(expensesB1.body).toHaveLength(0);

      // Verify Client A1 can see their own expense
      const expensesA1 = await request(app.getHttpServer())
        .get('/api/expenses/me')
        .set('Authorization', `Bearer ${clientA1.accessToken}`)
        .expect(200);

      expect(expensesA1.body).toHaveLength(1);
      expect(expensesA1.body[0].id).toBe(expenseA1Id);
    });

    it('should isolate documents between accountants', async () => {
      // Create two accountants with clients
      const accountantA = await createTestAccountant(app, {
        email: generateTestEmail('doc-accountant-a'),
        password: 'TestA@123456',
        name: 'Doc Accountant A',
        companyName: 'Doc Firm A',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-DOC-A',
      });

      const invitationA = await inviteClient(app, accountantA.accessToken!, {
        email: generateTestEmail('doc-client-a'),
        name: 'Doc Client A',
        cpfCnpj: generateTestCPF(),
      });

      const clientA = await acceptInvitation(
        app,
        invitationA.token,
        'DocClientA@123',
      );

      const accountantB = await createTestAccountant(app, {
        email: generateTestEmail('doc-accountant-b'),
        password: 'TestB@123456',
        name: 'Doc Accountant B',
        companyName: 'Doc Firm B',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-DOC-B',
      });

      // Accountant A uploads document for Client A
      // Note: In real test, would upload actual file
      // For now, testing the isolation logic

      // Create a document via database (simulating upload)
      const documentA = await prisma.document.create({
        data: {
          clientId: clientA.clientId,
          type: 'NFE',
          title: 'Document from A',
          description: 'Test document',
          filePath: '/uploads/test-doc-a.pdf',
          fileName: 'test-doc-a.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          createdById: accountantA.id,
        },
      });

      // Verify Accountant A can see the document
      const docsA = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${accountantA.accessToken}`)
        .expect(200);

      expect(docsA.body.documents.length).toBeGreaterThan(0);

      // Verify Accountant B cannot see Accountant A's documents
      const docsB = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${accountantB.accessToken}`)
        .expect(200);

      expect(docsB.body.documents).toHaveLength(0);

      // Try to access Document A by ID as Accountant B
      await request(app.getHttpServer())
        .get(`/api/documents/${documentA.id}`)
        .set('Authorization', `Bearer ${accountantB.accessToken}`)
        .expect(404);
    });

    it('should isolate financial transactions between clients', async () => {
      // Create accountant with two different clients
      const accountant = await createTestAccountant(app, {
        email: generateTestEmail('fin-accountant'),
        password: 'Test@123456',
        name: 'Finance Accountant',
        companyName: 'Finance Firm',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-FIN-001',
      });

      // Create Client 1
      const invitation1 = await inviteClient(app, accountant.accessToken!, {
        email: generateTestEmail('fin-client-1'),
        name: 'Finance Client 1',
        cpfCnpj: generateTestCPF(),
      });

      const client1 = await acceptInvitation(
        app,
        invitation1.token,
        'FinClient1@123',
      );

      // Create Client 2
      const invitation2 = await inviteClient(app, accountant.accessToken!, {
        email: generateTestEmail('fin-client-2'),
        name: 'Finance Client 2',
        cpfCnpj: generateTestCPF(),
      });

      const client2 = await acceptInvitation(
        app,
        invitation2.token,
        'FinClient2@123',
      );

      // Client 1 creates transaction
      const transaction1 = await request(app.getHttpServer())
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${client1.accessToken}`)
        .send({
          type: 'EXPENSE',
          category: 'FOOD',
          description: 'Transaction from Client 1',
          amount: 200.0,
          date: new Date().toISOString(),
        })
        .expect(201);

      // Client 2 creates transaction
      const transaction2 = await request(app.getHttpServer())
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${client2.accessToken}`)
        .send({
          type: 'INCOME',
          category: 'SALARY',
          description: 'Transaction from Client 2',
          amount: 5000.0,
          date: new Date().toISOString(),
        })
        .expect(201);

      // Verify Client 1 only sees their own transaction
      const client1Transactions = await request(app.getHttpServer())
        .get('/api/financial/transactions')
        .set('Authorization', `Bearer ${client1.accessToken}`)
        .expect(200);

      expect(client1Transactions.body.transactions).toHaveLength(1);
      expect(client1Transactions.body.transactions[0].id).toBe(transaction1.body.id);

      // Verify Client 2 only sees their own transaction
      const client2Transactions = await request(app.getHttpServer())
        .get('/api/financial/transactions')
        .set('Authorization', `Bearer ${client2.accessToken}`)
        .expect(200);

      expect(client2Transactions.body.transactions).toHaveLength(1);
      expect(client2Transactions.body.transactions[0].id).toBe(transaction2.body.id);

      // Verify Client 1 cannot access Client 2's transaction by ID
      await request(app.getHttpServer())
        .get(`/api/financial/transactions/${transaction2.body.id}`)
        .set('Authorization', `Bearer ${client1.accessToken}`)
        .expect(404);

      // Verify Client 2 cannot access Client 1's transaction by ID
      await request(app.getHttpServer())
        .get(`/api/financial/transactions/${transaction1.body.id}`)
        .set('Authorization', `Bearer ${client2.accessToken}`)
        .expect(404);
    });

    it('should prevent cross-tenant data modification', async () => {
      // Create two accountants
      const accountantA = await createTestAccountant(app, {
        email: generateTestEmail('modify-a'),
        password: 'TestA@123456',
        name: 'Modify Accountant A',
        companyName: 'Modify Firm A',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-MOD-A',
      });

      const accountantB = await createTestAccountant(app, {
        email: generateTestEmail('modify-b'),
        password: 'TestB@123456',
        name: 'Modify Accountant B',
        companyName: 'Modify Firm B',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-MOD-B',
      });

      // Accountant A creates payment
      const paymentA = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${accountantA.accessToken}`)
        .send({
          paymentType: 'OFFICE',
          title: 'Payment from A',
          amount: 500.0,
          dueDate: new Date().toISOString(),
        })
        .expect(201);

      // Accountant B tries to modify Accountant A's payment
      await request(app.getHttpServer())
        .patch(`/api/payments/${paymentA.body.id}`)
        .set('Authorization', `Bearer ${accountantB.accessToken}`)
        .send({
          amount: 999999.99, // Try to change amount
        })
        .expect(404); // Should not find the payment

      // Verify payment amount unchanged
      const verifyPayment = await prisma.payment.findUnique({
        where: { id: paymentA.body.id },
      });

      expect(verifyPayment?.amount.toString()).toBe('500');

      // Accountant B tries to delete Accountant A's payment
      await request(app.getHttpServer())
        .delete(`/api/payments/${paymentA.body.id}`)
        .set('Authorization', `Bearer ${accountantB.accessToken}`)
        .expect(404); // Should not find the payment

      // Verify payment still exists
      const stillExists = await prisma.payment.findUnique({
        where: { id: paymentA.body.id },
      });

      expect(stillExists).toBeDefined();
    });
  });

  /**
   * Additional Test: Hierarchical Access (Accountant → Client)
   */
  describe('Hierarchical Access Control', () => {
    it('should allow accountant to access their client data', async () => {
      // Create accountant with client
      const accountant = await createTestAccountant(app, {
        email: generateTestEmail('hierarchical-test'),
        password: 'Test@123456',
        name: 'Hierarchical Accountant',
        companyName: 'Hierarchical Firm',
        cnpj: generateTestCNPJ(),
        crc: 'CRC-HIER-001',
      });

      const invitation = await inviteClient(app, accountant.accessToken!, {
        email: generateTestEmail('hierarchical-client'),
        name: 'Hierarchical Client',
        cpfCnpj: generateTestCPF(),
      });

      const client = await acceptInvitation(app, invitation.token, 'Client@123');

      // Client creates expense
      const expense = await request(app.getHttpServer())
        .post('/api/expenses')
        .set('Authorization', `Bearer ${client.accessToken}`)
        .send({
          category: 'TRANSPORT',
          description: 'Client Expense',
          amount: 75.5,
          date: new Date().toISOString(),
        })
        .expect(201);

      // Accountant should be able to see client's expense
      const accountantExpenses = await request(app.getHttpServer())
        .get('/api/expenses')
        .set('Authorization', `Bearer ${accountant.accessToken}`)
        .expect(200);

      expect(accountantExpenses.body.length).toBeGreaterThan(0);

      const clientExpense = accountantExpenses.body.find(
        (e: any) => e.id === expense.body.id,
      );
      expect(clientExpense).toBeDefined();
      expect(clientExpense.clientId).toBe(client.clientId);
    });
  });
});
