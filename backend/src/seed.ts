import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

const COURT_IDS: string[] = []
const CLIENT_IDS: string[] = []
const PRODUCT_IDS: string[] = []

async function main() {
  console.log('🌱 Seeding database...')

  // ── Limpar dados existentes de seed ──────────────────────────────────────────
  await prisma.barOrderItem.deleteMany()
  await prisma.barOrder.deleteMany()
  await prisma.rental.deleteMany()
  await prisma.client.deleteMany()
  await prisma.barProduct.deleteMany()
  await prisma.tournamentTeam.deleteMany()
  await prisma.tournament.deleteMany()
  console.log('✓ Cleaned existing seed data')

  // ── Quadras (garantir 3 ativas) ───────────────────────────────────────────────
  const existingCourts = await prisma.court.findMany({ where: { active: true }, take: 3 })
  for (const c of existingCourts) COURT_IDS.push(c.id)

  if (COURT_IDS.length < 3) {
    const names = ['Quadra Society A', 'Quadra Beach Tennis 1', 'Quadra Futsal']
    for (let i = COURT_IDS.length; i < 3; i++) {
      const court = await prisma.court.create({
        data: { name: names[i], type: 'Society', pricePerSlot: 80, slotMinutes: 60, active: true },
      })
      COURT_IDS.push(court.id)
      // Add schedule
      for (let d = 0; d <= 6; d++) {
        await prisma.schedule.create({ data: { courtId: court.id, dayOfWeek: d, openTime: '08:00', closeTime: '22:00' } })
      }
    }
  }
  console.log(`✓ Courts: ${COURT_IDS.length}`)

  // ── 20 Clientes ───────────────────────────────────────────────────────────────
  const clientData = [
    { firstName: 'João', lastName: 'Silva', phone: '(11) 99001-0001' },
    { firstName: 'Maria', lastName: 'Santos', phone: '(11) 99001-0002' },
    { firstName: 'Pedro', lastName: 'Oliveira', phone: '(11) 99001-0003' },
    { firstName: 'Ana', lastName: 'Costa', phone: '(11) 99001-0004' },
    { firstName: 'Carlos', lastName: 'Ferreira', phone: '(11) 99001-0005' },
    { firstName: 'Juliana', lastName: 'Rodrigues', phone: '(11) 99001-0006' },
    { firstName: 'Rafael', lastName: 'Almeida', phone: '(11) 99001-0007' },
    { firstName: 'Fernanda', lastName: 'Lima', phone: '(11) 99001-0008' },
    { firstName: 'Lucas', lastName: 'Pereira', phone: '(11) 99001-0009' },
    { firstName: 'Beatriz', lastName: 'Gomes', phone: '(11) 99001-0010' },
    { firstName: 'Thiago', lastName: 'Martins', phone: '(21) 98002-0001' },
    { firstName: 'Camila', lastName: 'Araújo', phone: '(21) 98002-0002' },
    { firstName: 'Diego', lastName: 'Carvalho', phone: '(21) 98002-0003' },
    { firstName: 'Larissa', lastName: 'Melo', phone: '(21) 98002-0004' },
    { firstName: 'Bruno', lastName: 'Nascimento', phone: '(31) 97003-0001' },
    { firstName: 'Priscila', lastName: 'Barbosa', phone: '(31) 97003-0002' },
    { firstName: 'Rodrigo', lastName: 'Mendes' },
    { firstName: 'Amanda', lastName: 'Freitas', phone: '(41) 96004-0001' },
    { firstName: 'Felipe', lastName: 'Dias', phone: '(41) 96004-0002' },
    { firstName: 'Gabriela', lastName: 'Rocha', phone: '(51) 95005-0001' },
  ]

  for (const data of clientData) {
    const client = await prisma.client.create({ data })
    CLIENT_IDS.push(client.id)
  }
  console.log(`✓ Clients: ${CLIENT_IDS.length}`)

  // ── Produtos do Bar ───────────────────────────────────────────────────────────
  const products = [
    // Bebidas
    { name: 'Água Mineral 500ml', category: 'Bebidas', price: 4 },
    { name: 'Água com Gás 500ml', category: 'Bebidas', price: 5 },
    { name: 'Refrigerante Lata', category: 'Bebidas', price: 7 },
    { name: 'Suco Natural 300ml', category: 'Bebidas', price: 9 },
    { name: 'Isotônico 500ml', category: 'Bebidas', price: 8 },
    { name: 'Energético 250ml', category: 'Bebidas', price: 12 },
    { name: 'Cerveja Lata 350ml', category: 'Bebidas', price: 10 },
    { name: 'Água de Coco 330ml', category: 'Bebidas', price: 8 },
    // Petiscos
    { name: 'Coxinha', category: 'Petiscos', price: 6 },
    { name: 'Pão de Queijo', category: 'Petiscos', price: 5 },
    { name: 'Pastel de Carne', category: 'Petiscos', price: 7 },
    { name: 'Empada de Frango', category: 'Petiscos', price: 7 },
    { name: 'Chips Batata 50g', category: 'Petiscos', price: 6 },
    { name: 'Mix de Castanhas', category: 'Petiscos', price: 14 },
    { name: 'Barrinha de Cereal', category: 'Petiscos', price: 5 },
    { name: 'Sanduíche Natural', category: 'Petiscos', price: 18 },
  ]

  for (const p of products) {
    const prod = await prisma.barProduct.create({ data: { ...p, price: new Decimal(p.price) } })
    PRODUCT_IDS.push(prod.id)
  }
  console.log(`✓ Products: ${PRODUCT_IDS.length}`)

  // ── 3 Torneios em status diferentes ──────────────────────────────────────────
  const now = new Date()
  const tournaments = [
    {
      name: 'Torneio Open de Beach Tennis 2026',
      description: 'Grande torneio aberto de beach tennis com categorias A, B e C. Premiação especial para os 3 primeiros lugares.',
      sport: 'Beach Tennis',
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9),
      status: 'OPEN',
      matchType: 'DOUBLES',
      maxTeams: 16,
      prizeInfo: '1º R$ 1.000 · 2º R$ 500 · 3º R$ 250',
      courtId: COURT_IDS[0],
    },
    {
      name: 'Copa Interclub Society 2026',
      description: 'Campeonato de futebol society entre times amadores da região. Fase de grupos e eliminatórias.',
      sport: 'Society',
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      status: 'IN_PROGRESS',
      matchType: 'TEAM',
      maxTeams: 8,
      prizeInfo: 'Troféu + medalhas para todos os jogadores',
      courtId: COURT_IDS[0],
    },
    {
      name: 'Torneio de Futsal Misto — Verão 2026',
      description: 'Edição especial misto de futsal. Competição encerrada com sucesso.',
      sport: 'Futsal',
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      status: 'FINISHED',
      matchType: 'TEAM',
      maxTeams: 12,
      prizeInfo: '1º R$ 800 + troféu',
      courtId: COURT_IDS[0],
    },
  ]

  for (const t of tournaments) {
    const tournament = await prisma.tournament.create({ data: t })
    // Add some teams
    const teamNames = ['Leões FC', 'Falcões', 'Águias', 'Onças', 'Lobos', 'Tigres']
    for (let i = 0; i < Math.min(4, t.maxTeams); i++) {
      await prisma.tournamentTeam.create({
        data: {
          tournamentId: tournament.id,
          name: teamNames[i % teamNames.length],
          players: 'João, Pedro, Carlos, Rafael',
          groupNumber: 1,
        },
      })
    }
  }
  console.log('✓ Tournaments: 3')

  // ── 30 Comandas ABERTAS ───────────────────────────────────────────────────────
  const paymentMethods = ['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER']
  const clientNames = clientData.map(c => `${c.firstName} ${c.lastName}`)

  for (let i = 1; i <= 30; i++) {
    const clientName = clientNames[(i - 1) % clientNames.length]
    const order = await prisma.barOrder.create({
      data: {
        number: i,
        customerName: clientName,
        status: 'OPEN',
        notes: i % 3 === 0 ? `Mesa ${Math.ceil(i / 3)} · Não usar gelo` : i % 5 === 0 ? 'Sem lactose' : undefined,
      },
    })

    // Add 1-4 items
    const itemCount = (i % 4) + 1
    let total = 0
    for (let j = 0; j < itemCount; j++) {
      const prodIdx = (i + j) % PRODUCT_IDS.length
      const prod = products[prodIdx]
      const qty = (j % 3) + 1
      const subtotal = prod.price * qty
      total += subtotal
      await prisma.barOrderItem.create({
        data: {
          orderId: order.id,
          productId: PRODUCT_IDS[prodIdx],
          quantity: qty,
          unitPrice: new Decimal(prod.price),
          subtotal: new Decimal(subtotal),
        },
      })
    }
    await prisma.barOrder.update({ where: { id: order.id }, data: { total: new Decimal(total) } })
  }
  console.log('✓ Open orders: 30')

  // ── 30 Comandas FECHADAS (histórico) ─────────────────────────────────────────
  for (let i = 31; i <= 60; i++) {
    const clientName = clientNames[(i - 1) % clientNames.length]
    const payMethod = paymentMethods[(i - 31) % paymentMethods.length]
    const order = await prisma.barOrder.create({
      data: {
        number: i,
        customerName: clientName,
        status: 'CLOSED',
        paymentMethod: payMethod,
        notes: i % 7 === 0 ? 'Cliente VIP · Desconto 10%' : undefined,
      },
    })

    const itemCount = (i % 5) + 1
    let total = 0
    for (let j = 0; j < itemCount; j++) {
      const prodIdx = (i + j * 3) % PRODUCT_IDS.length
      const prod = products[prodIdx]
      const qty = (j % 4) + 1
      const subtotal = prod.price * qty
      total += subtotal
      await prisma.barOrderItem.create({
        data: {
          orderId: order.id,
          productId: PRODUCT_IDS[prodIdx],
          quantity: qty,
          unitPrice: new Decimal(prod.price),
          subtotal: new Decimal(subtotal),
        },
      })
    }
    await prisma.barOrder.update({ where: { id: order.id }, data: { total: new Decimal(total) } })
  }
  console.log('✓ Closed orders: 30')

  // ── 3 Aluguéis de exemplo ────────────────────────────────────────────────────
  const rentals = [
    {
      courtId: COURT_IDS[0],
      clientId: CLIENT_IDS[0],
      clientName: 'João Silva',
      weekdays: JSON.stringify([1, 3, 5]),
      slots: JSON.stringify([{ startTime: '08:00', endTime: '09:00' }, { startTime: '10:00', endTime: '11:00' }]),
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      notes: 'Professor de Beach Tennis',
      active: true,
    },
    {
      courtId: COURT_IDS[0],
      clientId: CLIENT_IDS[2],
      clientName: 'Pedro Oliveira',
      weekdays: JSON.stringify([2, 4]),
      slots: JSON.stringify([{ startTime: '19:00', endTime: '21:00' }]),
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      notes: 'Treino de futsal',
      active: true,
    },
    {
      courtId: COURT_IDS[0],
      clientId: CLIENT_IDS[4],
      clientName: 'Carlos Ferreira',
      weekdays: JSON.stringify([0, 6]),
      slots: JSON.stringify([{ startTime: '09:00', endTime: '11:00' }]),
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 2, 28),
      notes: 'Campeonato semanal',
      active: true,
    },
  ]

  for (const r of rentals) {
    await prisma.rental.create({ data: r })
  }
  console.log('✓ Rentals: 3')

  console.log('\n✅ Seed concluído!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
