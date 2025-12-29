# E2E Tests - ContaSync API

## 📋 Overview

End-to-End tests for the ContaSync API, covering critical user flows and business logic.

## 🚀 Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e-spec

# Run with coverage
npm run test:e2e -- --coverage

# Run in watch mode
npm run test:e2e -- --watch
```

## 📁 Test Structure

```
test/
├── e2e/                          # E2E test files
│   ├── auth.e2e-spec.ts         # Authentication & Onboarding (E2E-001, E2E-002)
│   ├── multi-tenancy.e2e-spec.ts # Data Isolation (E2E-020)
│   └── [future tests...]
├── utils/                        # Test utilities
│   └── test-helpers.ts          # Helper functions for tests
├── fixtures/                     # Test data fixtures (future)
│   └── [fixtures...]
├── app.e2e-spec.ts              # Basic app test
└── jest-e2e.json                # Jest E2E configuration
```

## ✅ Implemented Tests

### 🔴 Critical Priority

#### E2E-001: Complete Accountant Signup Flow
**File:** `e2e/auth.e2e-spec.ts`
**Status:** ✅ Implemented

Tests:
- ✅ Complete signup with trial creation (14 days)
- ✅ Onboarding completion
- ✅ Onboarding persistence (modal doesn't reappear)
- ✅ Invalid CNPJ rejection
- ✅ Duplicate email rejection

**Coverage:**
- Signup endpoint
- Trial subscription creation
- Onboarding flow
- Validation rules

---

#### E2E-002: Login and Password Reset
**File:** `e2e/auth.e2e-spec.ts`
**Status:** ✅ Implemented

Tests:
- ✅ Login with valid credentials
- ✅ Login rejection with invalid credentials
- ✅ Password reset request
- ✅ Password reset with token
- ✅ Login with new password
- ✅ Expired token rejection
- ✅ JWT token validation

**Coverage:**
- Login endpoint
- Password reset flow
- Token generation and validation
- JWT authentication

---

#### E2E-020: Data Isolation Between Accountants
**File:** `e2e/multi-tenancy.e2e-spec.ts`
**Status:** ✅ Implemented

Tests:
- ✅ Complete data isolation (payments, expenses, documents)
- ✅ Cross-tenant access prevention
- ✅ Cross-tenant modification prevention
- ✅ Financial transaction isolation
- ✅ Hierarchical access (accountant → client)

**Coverage:**
- Multi-tenancy enforcement
- Row-level security
- Accountant isolation
- Client isolation
- Hierarchical access control

---

## 📊 Test Coverage

| Priority | Tests Implemented | Tests Planned | Coverage |
|----------|-------------------|---------------|----------|
| 🔴 Critical | 3 | 9 | 33% |
| 🟡 High | 0 | 6 | 0% |
| 🟢 Medium | 0 | 5 | 0% |
| **Total** | **3** | **20** | **15%** |

## 🎯 Next Tests to Implement

### High Priority (Next Sprint)

#### E2E-003: Trial Expiration Flow
- Trial expiration detection
- Upgrade modal blocking
- Resource access restriction
- Checkout flow

#### E2E-005: Complete Checkout Flow
- Subscription checkout
- Stripe integration (mocked)
- Webhook processing
- Subscription activation

#### E2E-017: Plan Limits Enforcement
- Payment limit enforcement
- Expense limit enforcement
- Document limit enforcement
- Storage limit enforcement
- Upgrade suggestion

### Medium Priority

#### E2E-008: Client Invitation Flow
- Send invitation
- Email delivery (mocked)
- Invitation acceptance
- Client portal access
- Accountant data visibility

#### E2E-010: Transaction Lifecycle
- Create transaction with receipt
- Edit transaction
- Delete transaction (soft)
- Dashboard update verification

## 🛠️ Test Utilities

### Helper Functions

Located in `utils/test-helpers.ts`:

- `cleanDatabase()` - Clean all test data
- `createTestAccountant()` - Create test accountant user
- `loginUser()` - Login and get access token
- `createTestClient()` - Create client for accountant
- `inviteClient()` - Send client invitation
- `acceptInvitation()` - Accept client invitation
- `getCurrentUser()` - Get authenticated user info
- `generateTestEmail()` - Generate unique test email
- `generateTestCNPJ()` - Generate unique CNPJ
- `generateTestCPF()` - Generate unique CPF
- `expireTrial()` - Simulate trial expiration
- `advanceTime()` - Simulate time passage

### Database Setup

Each test suite:
1. Cleans database before each test (`beforeEach`)
2. Runs in isolated environment
3. Uses test database (configured in `.env.test`)

## 📝 Writing New Tests

### Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanDatabase, /* other helpers */ } from '../utils/test-helpers';

describe('Feature Name (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
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

  describe('E2E-XXX: Test Name', () => {
    it('should do something', async () => {
      // Test implementation
    });
  });
});
```

### Best Practices

1. **Clean State**: Always clean database before each test
2. **Unique Data**: Use helper functions to generate unique emails, CPF, CNPJ
3. **Complete Flows**: Test entire user flows, not just individual endpoints
4. **Assertions**: Verify both success and error cases
5. **Isolation**: Tests should not depend on each other
6. **Descriptive Names**: Use clear test descriptions
7. **Comments**: Document complex flows with step-by-step comments

## 🔧 Configuration

### Jest E2E Config (`jest-e2e.json`)

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### Environment Variables

Create `.env.test` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/contasync_test"
JWT_SECRET="test-jwt-secret"
JWT_EXPIRES_IN="24h"
ENABLE_RLS=false  # Disable RLS in tests for direct database access
```

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: contasync_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: Run E2E tests
        run: npm run test:e2e
```

## 🐛 Troubleshooting

### Common Issues

**Database connection errors:**
- Verify PostgreSQL is running
- Check `.env.test` DATABASE_URL
- Ensure test database exists

**Tests timing out:**
- Increase Jest timeout in test file:
  ```typescript
  jest.setTimeout(30000); // 30 seconds
  ```

**Flaky tests:**
- Ensure proper database cleanup
- Use unique test data
- Avoid time-dependent assertions

**Port already in use:**
- Stop other instances of the app
- Use different port for tests

## 📚 Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

**Last Updated:** 2024-12-28
**Coverage Goal:** 80% of critical flows by end of sprint
**Status:** Active Development
