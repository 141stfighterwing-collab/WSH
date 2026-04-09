import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';

  console.log('[seed] Checking for default admin user...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log(`[seed] Admin user "${adminUsername}" already exists — skipping creation.`);
    console.log(`[seed]   ID: ${existingAdmin.id}`);
    console.log(`[seed]   Role: ${existingAdmin.role}`);
    console.log(`[seed]   Status: ${existingAdmin.status}`);
    return;
  }

  // Check if admin email is already taken by a different user
  const existingEmail = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingEmail) {
    console.log(`[seed] Email "${adminEmail}" is already in use by user "${existingEmail.username}" — skipping creation.`);
    return;
  }

  // Create the default admin user
  const hashedPassword = await hashPassword(adminPassword);

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: 'super-admin',
      status: 'active',
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  console.log(`[seed] Default admin user created successfully:`);
  console.log(`[seed]   Username: ${admin.username}`);
  console.log(`[seed]   Email: ${admin.email}`);
  console.log(`[seed]   Role: ${admin.role}`);
  console.log(`[seed]   ID: ${admin.id}`);
  console.log(`[seed]`);
  console.log(`[seed] ⚠️  IMPORTANT: Change the default admin password immediately after first login!`);
  console.log(`[seed]   Default credentials: ${adminUsername} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('[seed] Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
