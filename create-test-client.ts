import { PrismaClient, FolderType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_FOLDERS = [
  {
    name: 'Notas Fiscais',
    type: FolderType.NOTAS_FISCAIS,
    icon: '🧾',
    color: '#3b82f6',
    description: 'Notas fiscais de entrada e saída',
    isDefault: true,
    sortOrder: 1,
  },
  {
    name: 'Contratos',
    type: FolderType.CONTRATOS,
    icon: '📄',
    color: '#8b5cf6',
    description: 'Contratos e acordos',
    isDefault: true,
    sortOrder: 2,
  },
  {
    name: 'Declarações',
    type: FolderType.DECLARACOES,
    icon: '📋',
    color: '#10b981',
    description: 'Declarações fiscais e contábeis',
    isDefault: true,
    sortOrder: 3,
  },
  {
    name: 'Comprovantes',
    type: FolderType.COMPROVANTES,
    icon: '🧾',
    color: '#f59e0b',
    description: 'Comprovantes de pagamento',
    isDefault: true,
    sortOrder: 4,
  },
  {
    name: 'Balancetes',
    type: FolderType.BALANCETES,
    icon: '📊',
    color: '#06b6d4',
    description: 'Balancetes e demonstrativos contábeis',
    isDefault: true,
    sortOrder: 5,
  },
  {
    name: 'Outros',
    type: FolderType.OUTROS,
    icon: '📁',
    color: '#64748b',
    description: 'Outros documentos diversos',
    isDefault: true,
    sortOrder: 6,
  },
];

async function main() {
  console.log('🌱 Creating test client with folders...\n');

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'cliente.teste@contasync.com' },
  });

  if (existingUser) {
    console.log('✅ User already exists:', existingUser.email);

    const client = await prisma.client.findUnique({
      where: { userId: existingUser.id },
      include: { folders: true },
    });

    if (client) {
      console.log('✅ Client already exists');
      console.log(`   Folders: ${client.folders.length}`);

      if (client.folders.length === 0) {
        console.log('\n📁 Creating default folders...');
        await prisma.documentFolder.createMany({
          data: DEFAULT_FOLDERS.map(folder => ({
            ...folder,
            clientId: client.id,
          })),
        });
        console.log('✅ Created 6 default folders!');
      }
    }

    await prisma.$disconnect();
    return;
  }

  // Hash password
  const password = await bcrypt.hash('senha123', 10);

  // Create user + client + folders in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create User
    const user = await tx.user.create({
      data: {
        email: 'cliente.teste@contasync.com',
        name: 'Cliente Teste',
        passwordHash: password,
        role: 'CLIENT',
        isActive: true,
      },
    });

    console.log('✅ User created:', user.email);

    // 2. Create Client
    const client = await tx.client.create({
      data: {
        userId: user.id,
        cpfCnpj: '12345678900',
        financialModuleEnabled: true,
        expenseModuleEnabled: false,
      },
    });

    console.log('✅ Client created:', client.id);

    // 3. Create default folders
    await tx.documentFolder.createMany({
      data: DEFAULT_FOLDERS.map(folder => ({
        ...folder,
        clientId: client.id,
      })),
    });

    console.log('✅ Created 6 default folders!');

    return { user, client };
  });

  console.log('\n🎉 Test client setup complete!');
  console.log('   Email: cliente.teste@contasync.com');
  console.log('   Password: senha123');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
