import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://contasync:contasync123@localhost:5432/contasync?schema=public';
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});
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
] as const;

async function main() {
  console.log('🌱 Starting seed: create default folders for all clients...');

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      user: { select: { name: true, email: true } },
    },
  });

  console.log(`Found ${clients.length} clients`);

  for (const client of clients) {
    // Check if client already has folders
    const existingFolders = await prisma.documentFolder.count({
      where: { clientId: client.id },
    });

    if (existingFolders > 0) {
      console.log(
        `⏭️  Skipping client ${client.user.email} (already has ${existingFolders} folders)`,
      );
      continue;
    }

    // Create default folders for this client
    await prisma.documentFolder.createMany({
      data: DEFAULT_FOLDERS.map((folder) => ({
        ...folder,
        clientId: client.id,
      })),
    });

    console.log(`✅ Created 6 default folders for client: ${client.user.email}`);
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
