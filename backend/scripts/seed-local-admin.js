const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@local.test' },
    update: { password: hash, role: 'ADMIN', name: 'Admin Local' },
    create: {
      email: 'admin@local.test',
      password: hash,
      role: 'ADMIN',
      name: 'Admin Local'
    }
  });
  console.log('user ok', user.email, user.role);

  const setting = await prisma.appSetting.upsert({
    where: { key: 'afip.modoHomologacion' },
    update: { value: 'true' },
    create: { key: 'afip.modoHomologacion', value: 'true' }
  });
  console.log('afip setting', setting.key, setting.value);

  const users = await prisma.user.findMany({ select: { email: true, role: true, name: true } });
  console.log('users:', users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
