# Stripe Setup Guide

Este guia explica como configurar produtos e preços no Stripe para o ContaSync.

## Pré-requisitos

1. Conta Stripe criada (https://dashboard.stripe.com/register)
2. Stripe Secret Key configurada no `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_your_test_key_here
   ```
3. Planos já criados no banco de dados (executar `npx tsx prisma/seed-plans.ts`)

## Opção 1: Setup Automatizado (Recomendado)

Execute o script automatizado que cria todos os produtos e preços no Stripe:

```bash
npx tsx scripts/stripe-setup.ts
```

Este script irá:
- ✅ Criar 7 produtos no Stripe (um para cada plano)
- ✅ Criar 2 preços para cada produto (mensal e anual)
- ✅ Salvar os IDs no banco de dados automaticamente
- ✅ Detectar produtos/preços já existentes (idempotente)

### Exemplo de saída:

```
🚀 Starting Stripe product and price setup...

📦 Found 7 active plans in database

📍 Processing: Free Trial (individual-trial)
   Type: INDIVIDUAL
   Monthly: R$ 0
   Yearly: R$ 0
   ✓ Created product: prod_ABC123
   ✓ Created monthly price: price_DEF456
   ✓ Created yearly price: price_GHI789
   ✅ Complete!

...

✅ All products and prices created successfully!

📊 Summary:

┌─────────────────────────────────────┬──────────────────────┬──────────────────────┐
│ Plan                                │ Monthly Price ID     │ Yearly Price ID      │
├─────────────────────────────────────┼──────────────────────┼──────────────────────┤
│ Free Trial                          │ price_ABC123         │ price_DEF456         │
│ Starter                             │ price_GHI789         │ price_JKL012         │
│ Professional                        │ price_MNO345         │ price_PQR678         │
│ Firm Trial                          │ price_STU901         │ price_VWX234         │
│ Firm Starter                        │ price_YZA567         │ price_BCD890         │
│ Firm Professional                   │ price_EFG123         │ price_HIJ456         │
│ Firm Enterprise                     │ price_KLM789         │ price_NOP012         │
└─────────────────────────────────────┴──────────────────────┴──────────────────────┘

🎉 Setup complete! You can now use these price IDs in your checkout flows.
```

## Opção 2: Setup Manual (Dashboard)

Se preferir criar manualmente no Stripe Dashboard:

### 1. Criar Produtos

Acesse: https://dashboard.stripe.com/test/products

Para cada plano, crie um produto com:
- **Name**: Nome do plano (ex: "Starter - INDIVIDUAL")
- **Description**: Descrição do plano
- **Metadata**:
  - `planId`: ID do plano no banco de dados
  - `planSlug`: Slug do plano (ex: "individual-starter")
  - `tenantType`: INDIVIDUAL ou ACCOUNTANT_FIRM

### 2. Criar Preços

Para cada produto, crie 2 preços:

#### Preço Mensal:
- **Price**: Valor em centavos (ex: R$ 29,90 = 2990)
- **Billing period**: Monthly
- **Currency**: BRL
- **Metadata**:
  - `planId`: ID do plano
  - `interval`: "monthly"

#### Preço Anual:
- **Price**: Valor em centavos (ex: R$ 299,00 = 29900)
- **Billing period**: Yearly
- **Currency**: BRL
- **Metadata**:
  - `planId`: ID do plano
  - `interval`: "yearly"

### 3. Atualizar Banco de Dados

Execute o SQL para cada plano:

```sql
UPDATE plans
SET
  "stripeProductId" = 'prod_ABC123',
  "stripePriceIdMonthly" = 'price_DEF456',
  "stripePriceIdYearly" = 'price_GHI789'
WHERE slug = 'individual-starter';
```

## Verificação

Para verificar se tudo está configurado corretamente:

```bash
# Verificar planos no banco de dados
npx prisma studio

# Ou via SQL:
psql -U contasync -d contasync -c "
SELECT
  name,
  slug,
  \"stripeProductId\",
  \"stripePriceIdMonthly\",
  \"stripePriceIdYearly\"
FROM plans
WHERE \"isActive\" = true;
"
```

## Planos Criados

### Individual (3 planos)

1. **Free Trial**
   - Slug: `individual-trial`
   - Monthly: R$ 0
   - Yearly: R$ 0
   - Trial: 14 dias

2. **Starter**
   - Slug: `individual-starter`
   - Monthly: R$ 29,90
   - Yearly: R$ 299,00 (17% desconto)
   - Limites: 50 payments, 100 expenses, 20 documents, 2GB storage

3. **Professional**
   - Slug: `individual-professional`
   - Monthly: R$ 59,90
   - Yearly: R$ 599,00 (17% desconto)
   - Limites: ilimitado

### Firm (4 planos)

1. **Firm Trial**
   - Slug: `firm-trial`
   - Monthly: R$ 0
   - Yearly: R$ 0
   - Trial: 14 dias

2. **Firm Starter**
   - Slug: `firm-starter`
   - Monthly: R$ 99,90
   - Yearly: R$ 999,00 (17% desconto)
   - Limites: 10 clients, 200 payments, 500 expenses, 5GB storage

3. **Firm Professional**
   - Slug: `firm-professional`
   - Monthly: R$ 299,90
   - Yearly: R$ 2.999,00 (17% desconto)
   - Limites: 50 clients, ilimitado

4. **Firm Enterprise**
   - Slug: `firm-enterprise`
   - Monthly: R$ 699,90
   - Yearly: R$ 6.999,00 (17% desconto)
   - Limites: ilimitado + recursos premium

## Ambientes

### Test Mode (Desenvolvimento)

- Use chaves de teste: `sk_test_...` e `pk_test_...`
- Produtos criados no test mode
- Pagamentos com cartões de teste: https://stripe.com/docs/testing

### Live Mode (Produção)

- Use chaves de produção: `sk_live_...` e `pk_live_...`
- Execute o script novamente em produção
- Produtos e preços serão recriados no ambiente live

## Troubleshooting

### Erro: "STRIPE_SECRET_KEY not found"

Verifique se o arquivo `.env` contém:
```
STRIPE_SECRET_KEY=sk_test_your_test_key_here
```

### Erro: "No plans found in database"

Execute o seed de planos primeiro:
```bash
npx tsx prisma/seed-plans.ts
```

### Produtos duplicados

O script é idempotente. Se executar múltiplas vezes, ele detecta produtos/preços existentes e não cria duplicados.

## Próximos Passos

Após configurar os produtos e preços:

1. ✅ US-12.3: Implementar Checkout Session
2. ✅ US-12.4: Implementar Webhook Handlers
3. ✅ US-12.5: Configurar Customer Portal

## Links Úteis

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe Products](https://dashboard.stripe.com/test/products)
- [Stripe Prices](https://dashboard.stripe.com/test/prices)
- [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

## Webhook Secret

Para testar webhooks localmente:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks para localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

O CLI irá exibir o webhook secret. Copie e adicione ao `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```
