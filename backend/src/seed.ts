import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Decimal } from '@prisma/client/runtime/library'

export async function initSeedIfNeeded(prisma: PrismaClient): Promise<void> {
  const userCount = await prisma.user.count()
  if (userCount > 0) return // already seeded

  console.log('🌱 First boot — seeding initial data...')

  // Super Admin
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

  // Demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { email: 'demo@arenahub.com' },
    update: {},
    create: { name: 'Arena Demonstração', email: 'demo@arenahub.com', mrrValue: 199, setupFee: 500 },
  })
  const tenantId = demoTenant.id

  await prisma.user.upsert({
    where: { email: 'admin@quadras.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@quadras.com',
      passwordHash: await bcrypt.hash('admin123', 8),
      role: 'ADMIN',
      tenantId,
    },
  })

  // Courts with schedules (bulk)
  const courtsData = [
    { id: 'court-1', name: 'Quadra Society A', type: 'Futebol Society', pricePerSlot: 120, slotMinutes: 60 },
    { id: 'court-2', name: 'Quadra Beach Tennis 1', type: 'Beach Tennis', pricePerSlot: 80, slotMinutes: 60 },
    { id: 'court-3', name: 'Ginásio Poliesportivo', type: 'Vôlei', pricePerSlot: 60, slotMinutes: 60 },
  ]

  for (const c of courtsData) {
    await prisma.court.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, tenantId, active: true },
    })
    await prisma.schedule.createMany({
      data: Array.from({ length: 7 }, (_, day) => ({
        tenantId, courtId: c.id, dayOfWeek: day, openTime: '08:00', closeTime: '22:00', active: true,
      })),
      skipDuplicates: true,
    })
  }

  // Bar products
  const products = [
    { name: 'Água Mineral 500ml', category: 'Bebidas', price: 4 },
    { name: 'Refrigerante Lata', category: 'Bebidas', price: 7 },
    { name: 'Isotônico 500ml', category: 'Bebidas', price: 8 },
    { name: 'Cerveja Lata 350ml', category: 'Bebidas', price: 10 },
    { name: 'Coxinha', category: 'Petiscos', price: 6 },
    { name: 'Pão de Queijo', category: 'Petiscos', price: 5 },
    { name: 'Sanduíche Natural', category: 'Petiscos', price: 18 },
  ]
  await prisma.barProduct.createMany({
    data: products.map(p => ({ ...p, tenantId, price: new Decimal(p.price) })),
    skipDuplicates: true,
  })

  console.log('✅ Initial seed complete.')
}
