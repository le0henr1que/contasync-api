-- Script para popular dados financeiros de exemplo
-- Execute este script no banco de dados de produção

-- Variável para armazenar o client_id (substitua pelo ID do cliente real)
-- Você pode obter o ID executando: SELECT id FROM clients LIMIT 1;

-- ==================================================
-- IMPORTANTE: Execute esta query primeiro para obter o client_id:
-- SELECT c.id, u.email FROM clients c JOIN users u ON c.user_id = u.id;
-- ==================================================

-- Exemplo de inserção de pagamentos recorrentes
-- Substitua 'SEU_CLIENT_ID_AQUI' pelo ID real do cliente

-- 1. Pagamentos Recorrentes
INSERT INTO recurring_payments (
  id, client_id, title, description, amount, category, frequency,
  day_of_month, start_date, next_due_date, is_active, created_at, updated_at
) VALUES
  -- Aluguel
  (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Aluguel',
    'Aluguel mensal do apartamento',
    1500.00,
    'HOUSING',
    'MONTHLY',
    5,
    '2024-01-01',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '4 days',
    true,
    NOW(),
    NOW()
  ),
  -- Internet
  (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Internet',
    'Internet fibra 300MB',
    99.90,
    'UTILITIES',
    'MONTHLY',
    10,
    '2024-01-01',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '9 days',
    true,
    NOW(),
    NOW()
  ),
  -- Academia
  (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Academia',
    'Mensalidade da academia',
    89.90,
    'HEALTH',
    'MONTHLY',
    15,
    '2024-01-01',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '14 days',
    true,
    NOW(),
    NOW()
  ),
  -- Netflix
  (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Netflix',
    'Assinatura Netflix Premium',
    59.90,
    'SUBSCRIPTION',
    'MONTHLY',
    20,
    '2024-01-01',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '19 days',
    true,
    NOW(),
    NOW()
  ),
  -- Spotify
  (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Spotify',
    'Assinatura Spotify Premium',
    21.90,
    'SUBSCRIPTION',
    'MONTHLY',
    25,
    '2024-01-01',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '24 days',
    true,
    NOW(),
    NOW()
  ),
  -- Plano de Saúde
  (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Plano de Saúde',
    'Plano de saúde individual',
    450.00,
    'HEALTH',
    'MONTHLY',
    1,
    '2024-01-01',
    DATE_TRUNC('month', CURRENT_DATE),
    true,
    NOW(),
    NOW()
  );

-- 2. Parcelamentos (Installments)

-- 2.1 Notebook (12 parcelas)
WITH new_installment AS (
  INSERT INTO installments (
    id, client_id, title, description, total_amount, installment_count,
    installment_amount, category, first_due_date, paid_count, status,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Notebook Dell',
    'Compra de notebook para trabalho',
    3600.00,
    12,
    300.00,
    'EQUIPMENT',
    '2024-12-15',
    0,
    'ACTIVE',
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO installment_payments (
  id, installment_id, installment_number, amount, due_date, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  new_installment.id,
  n,
  300.00,
  DATE '2024-12-15' + (n - 1 || ' months')::interval,
  'PENDING',
  NOW(),
  NOW()
FROM new_installment, generate_series(1, 12) AS n;

-- 2.2 Curso Online (6 parcelas)
WITH new_installment AS (
  INSERT INTO installments (
    id, client_id, title, description, total_amount, installment_count,
    installment_amount, category, first_due_date, paid_count, status,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Curso de Programação',
    'Curso online de desenvolvimento web',
    1200.00,
    6,
    200.00,
    'EDUCATION',
    '2025-01-10',
    0,
    'ACTIVE',
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO installment_payments (
  id, installment_id, installment_number, amount, due_date, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  new_installment.id,
  n,
  200.00,
  DATE '2025-01-10' + (n - 1 || ' months')::interval,
  'PENDING',
  NOW(),
  NOW()
FROM new_installment, generate_series(1, 6) AS n;

-- 2.3 Sofá (10 parcelas)
WITH new_installment AS (
  INSERT INTO installments (
    id, client_id, title, description, total_amount, installment_count,
    installment_amount, category, first_due_date, paid_count, status,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM clients LIMIT 1),
    'Sofá',
    'Sofá 3 lugares para sala',
    2500.00,
    10,
    250.00,
    'FURNITURE',
    '2024-11-05',
    0,
    'ACTIVE',
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO installment_payments (
  id, installment_id, installment_number, amount, due_date, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  new_installment.id,
  n,
  250.00,
  DATE '2024-11-05' + (n - 1 || ' months')::interval,
  'PENDING',
  NOW(),
  NOW()
FROM new_installment, generate_series(1, 10) AS n;

-- Verificar os dados inseridos
SELECT 'Pagamentos Recorrentes:' AS info, COUNT(*) AS total FROM recurring_payments
WHERE client_id = (SELECT id FROM clients LIMIT 1)
UNION ALL
SELECT 'Parcelamentos:', COUNT(*) FROM installments
WHERE client_id = (SELECT id FROM clients LIMIT 1)
UNION ALL
SELECT 'Parcelas Pendentes:', COUNT(*) FROM installment_payments ip
JOIN installments i ON ip.installment_id = i.id
WHERE i.client_id = (SELECT id FROM clients LIMIT 1);
