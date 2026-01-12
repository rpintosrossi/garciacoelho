const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLocalities() {
  try {
    const count = await prisma.locality.count();
    console.log(`Total localities: ${count}`);
    
    const localities = await prisma.locality.findMany({ take: 5 });
    console.log('Sample localities:', localities);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLocalities();