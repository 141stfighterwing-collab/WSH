import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@wsh.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const username = process.env.ADMIN_USERNAME || 'Admin';
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('Admin user already exists');
      return;
    }
    
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: 'super-admin',
        permission: 'edit',
        status: 'active',
      }
    });
    
    console.log(`Admin user created: ${user.email}`);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
