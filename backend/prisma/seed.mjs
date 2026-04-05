import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const seed = async () => {
  const email = 'alvercaurbanrunners@gmail.com';
  const password = 'Testing!123';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists, updating password...');
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { password: hashed } });
    console.log('Password updated for', email);
  } else {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name: 'Admin AUR', password: hashed, role: 'admin', provider: 'local' },
    });
    console.log('Admin created: ' + user.email);
  }
};
await seed().catch(console.error).finally(() => prisma.$disconnect());
