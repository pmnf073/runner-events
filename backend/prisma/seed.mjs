import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const seed = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running the seed.');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists, updating password...');
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { password: hashed } });
    console.log('Password updated for', email);
  } else {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name: 'Admin AUR', password: hashed, role: 'admin', provider: 'local', status: 'active' },
    });
    console.log('Admin created: ' + user.email);
  }
};
await seed().catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
