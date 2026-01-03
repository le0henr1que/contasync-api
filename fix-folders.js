const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const DEFAULT_FOLDERS = [
  {
    name: 'Notas Fiscais',
    type: 'NOTAS_FISCAIS',
    icon: '🧾',
    color: '#3b82f6',
    description: 'Notas fiscais de entrada e saída',
    isDefault: true,
    sortOrder: 1,
  },
  {
    name: 'Contratos',
    type: 'CONTRATOS',
    icon: '📄',
    color: '#8b5cf6',
    description: 'Contratos e acordos',
    isDefault: true,
    sortOrder: 2,
  },
  {
    name: 'Declarações',
    type: 'DECLARACOES',
    icon: '📋',
    color: '#10b981',
    description: 'Declarações fiscais e contábeis',
    isDefault: true,
    sortOrder: 3,
  },
  {
    name: 'Comprovantes',
    type: 'COMPROVANTES',
    icon: '🧾',
    color: '#f59e0b',
    description: 'Comprovantes de pagamento',
    isDefault: true,
    sortOrder: 4,
  },
  {
    name: 'Balancetes',
    type: 'BALANCETES',
    icon: '📊',
    color: '#06b6d4',
    description: 'Balancetes e demonstrativos contábeis',
    isDefault: true,
    sortOrder: 5,
  },
  {
    name: 'Outros',
    type: 'OUTROS',
    icon: '📁',
    color: '#64748b',
    description: 'Outros documentos diversos',
    isDefault: true,
    sortOrder: 6,
  },
];

async function main() {
  console.log('🔍 Buscando todos os clientes...\n');

  const clients = await prisma.client.findMany({
    include: {
      user: { select: { email: true, name: true } },
      documentFolders: true,
    },
  });

  console.log(`✅ Encontrados ${clients.length} clientes\n`);

  for (const client of clients) {
    console.log(`📋 Cliente: ${client.user.name} (${client.user.email})`);
    console.log(`   Pastas existentes: ${client.documentFolders.length}`);

    if (client.documentFolders.length === 0) {
      console.log('   📁 Criando pastas padrões...');

      await prisma.documentFolder.createMany({
        data: DEFAULT_FOLDERS.map(folder => ({
          ...folder,
          clientId: client.id,
        })),
      });

      console.log('   ✅ 6 pastas criadas com sucesso!\n');
    } else {
      console.log('   ⏭️  Cliente já tem pastas, pulando...\n');
    }
  }

  console.log('🎉 Processo concluído!');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Erro:', error);
  prisma.$disconnect();
  process.exit(1);
});
