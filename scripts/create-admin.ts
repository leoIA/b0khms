import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Define DATABASE_URL explicitly
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_tmkOFa4qvi8g@ep-tiny-hall-anp7j5un-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Criando empresa e usuário admin...');

  // Verificar se já existe
  const existingAdmin = await prisma.users.findUnique({
    where: { email: 'admin@construtorpro.com.br' }
  });

  if (existingAdmin) {
    console.log('⚠️  Usuário admin já existe!');
    return;
  }

  // Criar empresa
  const company = await prisma.companies.create({
    data: {
      name: 'ConstrutorPro Admin',
      tradingName: 'ConstrutorPro',
      cnpj: '00.000.000/0001-00',
      email: 'admin@construtorpro.com.br',
      phone: '(11) 99999-9999',
      plan: 'enterprise',
      isActive: true,
      subscriptionStatus: 'active',
    },
  });

  console.log('✅ Empresa criada:', company.id);

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('Admin@123456', 10);
  
  const admin = await prisma.users.create({
    data: {
      email: 'admin@construtorpro.com.br',
      name: 'Administrador',
      password: hashedPassword,
      role: 'admin',
      companyId: company.id,
      isActive: true,
    },
  });

  console.log('✅ Usuário admin criado:', admin.id);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 CREDENCIAIS DE ACESSO:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Email: admin@construtorpro.com.br');
  console.log('   Senha: Admin@123456');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro acesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
