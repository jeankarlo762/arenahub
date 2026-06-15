import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@arenahub.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@arenahub.com',
      passwordHash: await bcrypt.hash('superadmin123', 10),
      role: 'SUPERADMIN',
    },
  })

  // Users
  await prisma.user.upsert({
    where: { email: 'admin@quadras.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@quadras.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email: 'operador@quadras.com' },
    update: {},
    create: {
      name: 'Operador Padrão',
      email: 'operador@quadras.com',
      passwordHash: await bcrypt.hash('op123456', 10),
      role: 'OPERATOR',
    },
  })

  // Courts
  const court1 = await prisma.court.upsert({
    where: { id: 'court-1' },
    update: {},
    create: {
      id: 'court-1',
      name: 'Quadra Society A',
      type: 'Futebol Society',
      description: 'Quadra de futebol society com gramado sintético e iluminação LED',
      capacity: 14,
      pricePerSlot: 120,
      slotMinutes: 60,
    },
  })

  const court2 = await prisma.court.upsert({
    where: { id: 'court-2' },
    update: {},
    create: {
      id: 'court-2',
      name: 'Quadra Beach Tennis 1',
      type: 'Beach Tennis',
      description: 'Quadra de beach tennis com areia fina importada',
      capacity: 4,
      pricePerSlot: 80,
      slotMinutes: 60,
    },
  })

  const court3 = await prisma.court.upsert({
    where: { id: 'court-3' },
    update: {},
    create: {
      id: 'court-3',
      name: 'Ginásio Poliesportivo',
      type: 'Vôlei',
      description: 'Ginásio coberto com piso de madeira',
      capacity: 12,
      pricePerSlot: 60,
      slotMinutes: 60,
    },
  })

  // Schedules
  for (const court of [court1, court2, court3]) {
    for (let day = 0; day <= 6; day++) {
      const existing = await prisma.schedule.findFirst({
        where: { courtId: court.id, dayOfWeek: day },
      })
      if (!existing) {
        await prisma.schedule.create({
          data: { courtId: court.id, dayOfWeek: day, openTime: '08:00', closeTime: '22:00', active: true },
        })
      }
    }
  }

  // Bookings
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const day1 = new Date(today); day1.setDate(today.getDate() + 1)
  const day2 = new Date(today); day2.setDate(today.getDate() + 2)

  const existingBookings = await prisma.booking.count()
  if (existingBookings === 0) {
    const b1 = await prisma.booking.create({
      data: {
        courtId: court1.id,
        customerName: 'Carlos Mendes',
        customerPhone: '(11) 99999-0001',
        customerEmail: 'carlos@email.com',
        date: today,
        startTime: '10:00',
        endTime: '11:00',
        totalPrice: 120,
        status: 'CONFIRMED',
      },
    })
    await prisma.payment.create({
      data: { bookingId: b1.id, amount: 120, method: 'PIX', status: 'PAID', paidAt: new Date() },
    })

    await prisma.booking.create({
      data: {
        courtId: court2.id,
        customerName: 'Ana Souza',
        customerPhone: '(11) 99999-0002',
        date: today,
        startTime: '14:00',
        endTime: '15:00',
        totalPrice: 80,
        status: 'CONFIRMED',
      },
    })

    const b3 = await prisma.booking.create({
      data: {
        courtId: court1.id,
        customerName: 'Pedro Alves',
        customerPhone: '(11) 99999-0003',
        date: day1,
        startTime: '19:00',
        endTime: '20:00',
        totalPrice: 120,
        status: 'CONFIRMED',
      },
    })
    await prisma.payment.create({
      data: { bookingId: b3.id, amount: 120, method: 'CASH', status: 'PENDING' },
    })

    await prisma.booking.create({
      data: {
        courtId: court2.id,
        customerName: 'Ricardo Costa',
        customerPhone: '(11) 99999-0005',
        date: day2,
        startTime: '16:00',
        endTime: '17:00',
        totalPrice: 80,
        status: 'CONFIRMED',
      },
    })
  }

  // Tournament
  const existingTournament = await prisma.tournament.count()
  if (existingTournament === 0) {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 7)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 2)

    const tournament = await prisma.tournament.create({
      data: {
        name: 'Torneio de Beach Tennis - Verão 2026',
        description: 'Campeonato interno de beach tennis com premiação',
        sport: 'Beach Tennis',
        startDate,
        endDate,
        status: 'OPEN',
        matchType: 'DOUBLES',
        maxTeams: 8,
        prizeInfo: '1º lugar: R$500 | 2º lugar: R$250 | 3º lugar: R$100',
      },
    })

    const teams = [
      { name: 'Areia Quente', players: ['João Silva', 'Maria Oliveira'] },
      { name: 'Raquete Dourada', players: ['Pedro Costa', 'Ana Lima'] },
      { name: 'Smash Bros', players: ['Carlos Rocha', 'Fernanda Dias'] },
      { name: 'Net Hunters', players: ['Rafael Souza', 'Camila Santos'] },
    ]

    for (const team of teams) {
      await prisma.tournamentTeam.create({
        data: {
          tournamentId: tournament.id,
          name: team.name,
          players: JSON.stringify(team.players),
        },
      })
    }
  }

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
