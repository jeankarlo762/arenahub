/**
 * One-time cleanup: remove all tenants and their data.
 * Run with: npx tsx prisma/clear-tenants.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Removing all tenants and associated data...')

  // Order matters due to FK constraints
  await prisma.auditLog.deleteMany()
  await prisma.barTransaction.deleteMany()
  await prisma.barOrderItem.deleteMany()
  await prisma.barOrder.deleteMany()
  await prisma.barProduct.deleteMany()
  await prisma.barCategory.deleteMany()
  await prisma.rentalPayment.deleteMany()
  await prisma.rental.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.tournamentTeam.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.court.deleteMany()
  await prisma.client.deleteMany()
  await prisma.player.deleteMany()
  await prisma.paymentFee.deleteMany()

  // Delete tenant users (exclude SUPERADMIN)
  await prisma.user.deleteMany({ where: { role: { not: 'SUPERADMIN' } } })

  // Delete tenants
  const { count } = await prisma.tenant.deleteMany()
  console.log(`✅ Removed ${count} tenant(s). SUPERADMIN users preserved.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
