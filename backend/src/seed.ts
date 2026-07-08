import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function initSeedIfNeeded(prisma: PrismaClient): Promise<void> {
  const userCount = await prisma.user.count()
  if (userCount > 0) return // already seeded

  console.log('🌱 First boot — seeding super admin...')

  // Super Admin — único registro criado no primeiro boot.
  // NENHUM tenant/arena é criado automaticamente: as arenas são cadastradas
  // manualmente pelo super admin. O sistema pode operar com zero tenants.
  await prisma.user.upsert({
    where: { email: 'superadmin@quadras.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@quadras.com',
      passwordHash: await bcrypt.hash('superadmin123', 8),
      role: 'SUPERADMIN',
      active: true,
    },
  })

  console.log('✅ Seed concluído — apenas super admin, nenhum tenant criado.')
}
