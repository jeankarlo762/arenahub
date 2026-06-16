import { prisma } from '../config/database'
import {
  CreateProductInput,
  UpdateProductInput,
  CreateOrderInput,
  UpdateOrderInput,
  AddItemInput,
} from '../schemas/bar.schema'

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listCategories() {
  return prisma.barCategory.findMany({ orderBy: { name: 'asc' } })
}

export async function createCategory(name: string) {
  return prisma.barCategory.create({ data: { name } })
}

export async function deleteCategory(id: string) {
  const cat = await prisma.barCategory.findUnique({ where: { id } })
  if (!cat) throw Object.assign(new Error('Categoria não encontrada'), { statusCode: 404 })
  // Remove category from products that use it
  await prisma.barProduct.updateMany({ where: { category: cat.name }, data: { category: null } })
  return prisma.barCategory.delete({ where: { id } })
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function listProducts(activeOnly?: boolean) {
  return prisma.barProduct.findMany({
    where: activeOnly !== undefined ? { active: activeOnly } : undefined,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function getProduct(id: string) {
  const p = await prisma.barProduct.findUnique({ where: { id } })
  if (!p) throw Object.assign(new Error('Produto não encontrado'), { statusCode: 404 })
  return p
}

export async function createProduct(input: CreateProductInput) {
  return prisma.barProduct.create({ data: { ...input } })
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProduct(id)
  return prisma.barProduct.update({ where: { id }, data: input })
}

export async function toggleProduct(id: string) {
  const p = await getProduct(id)
  return prisma.barProduct.update({ where: { id }, data: { active: !p.active } })
}

export async function deleteProduct(id: string) {
  await getProduct(id)
  const used = await prisma.barOrderItem.findFirst({ where: { productId: id } })
  if (used) {
    return prisma.barProduct.update({ where: { id }, data: { active: false } })
  }
  return prisma.barProduct.delete({ where: { id } })
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function listOrders(status?: string) {
  return prisma.barOrder.findMany({
    where: status ? { status } : undefined,
    include: {
      items: {
        include: { product: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ status: 'asc' }, { number: 'desc' }],
  })
}

export async function getOrder(id: string) {
  const order = await prisma.barOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!order) throw Object.assign(new Error('Comanda não encontrada'), { statusCode: 404 })
  return order
}

export async function createOrder(input: CreateOrderInput) {
  const exists = await prisma.barOrder.findFirst({ where: { number: input.number } })
  if (exists) {
    throw Object.assign(new Error(`Comanda #${input.number} já existe`), { statusCode: 409 })
  }
  return prisma.barOrder.create({
    data: {
      number: input.number,
      customerName: input.customerName,
      notes: input.notes,
    },
    include: { items: { include: { product: true } } },
  })
}

export async function updateOrder(id: string, input: UpdateOrderInput) {
  const order = await getOrder(id)
  if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
    throw Object.assign(new Error('Comanda encerrada não pode ser alterada'), { statusCode: 409 })
  }
  return prisma.barOrder.update({
    where: { id },
    data: input,
    include: { items: { include: { product: true } } },
  })
}

export async function updateOrderStatus(id: string, status: string, paymentMethod?: string) {
  const order = await getOrder(id)
  if (order.status === 'CANCELLED') {
    throw Object.assign(new Error('Comanda cancelada não pode ser alterada'), { statusCode: 409 })
  }

  // When closing (paying), create a BarTransaction for the unpaid remainder
  if (status === 'CLOSED' && paymentMethod) {
    const alreadyPaid = Number(order.paidAmount)
    const total = Number(order.total)
    const payingNow = total - alreadyPaid

    if (payingNow > 0) {
      const tenantId = (order as { tenantId?: string }).tenantId ?? null
      await prisma.barTransaction.create({
        data: {
          orderId: id,
          amount: payingNow,
          paymentMethod,
          ...(tenantId ? { tenantId } : {}),
        },
      })
    }

    return prisma.barOrder.update({
      where: { id },
      data: { status, paymentMethod, paidAmount: order.total },
      include: { items: { include: { product: true } } },
    })
  }

  return prisma.barOrder.update({
    where: { id },
    data: { status, ...(paymentMethod ? { paymentMethod } : {}) },
    include: { items: { include: { product: true } } },
  })
}

export async function addItem(orderId: string, input: AddItemInput) {
  const order = await getOrder(orderId)
  if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
    throw Object.assign(new Error('Comanda encerrada não pode ser editada'), { statusCode: 409 })
  }

  const product = await getProduct(input.productId)
  if (!product.active) {
    throw Object.assign(new Error('Produto inativo'), { statusCode: 409 })
  }

  const unitPrice = Number(product.price)
  const subtotal = unitPrice * input.quantity

  await prisma.$transaction([
    prisma.barOrderItem.create({
      data: {
        orderId,
        productId: input.productId,
        quantity: input.quantity,
        unitPrice,
        subtotal,
      },
    }),
    prisma.barOrder.update({
      where: { id: orderId },
      data: { total: { increment: subtotal } },
    }),
  ])

  return getOrder(orderId)
}

export async function getTopClients() {
  const rows = await prisma.barOrder.groupBy({
    by: ['customerName'],
    where: { status: 'CLOSED' },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 10,
  })
  return rows.map((r) => ({
    customerName: r.customerName,
    total: Number(r._sum.total ?? 0),
    orderCount: r._count.id,
  }))
}

export async function getBarStats(startDate: string, endDate: string) {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T23:59:59')

  // Use BarTransaction for accurate per-payment stats
  const transactions = await prisma.barTransaction.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { amount: true, paymentMethod: true, createdAt: true, orderId: true },
  })

  // Fall back to CLOSED orders without transactions (legacy data)
  const ordersWithTx = new Set(transactions.map((t) => t.orderId))
  const legacyOrders = await prisma.barOrder.findMany({
    where: {
      status: 'CLOSED',
      createdAt: { gte: start, lte: end },
      id: { notIn: [...ordersWithTx] },
    },
    select: { id: true, total: true, createdAt: true, paymentMethod: true, items: { select: { quantity: true } } },
  })

  const revenue =
    transactions.reduce((s, t) => s + Number(t.amount), 0) +
    legacyOrders.reduce((s, o) => s + Number(o.total), 0)

  const orderCount = new Set([...transactions.map((t) => t.orderId), ...legacyOrders.map((o) => o.id)]).size

  const orders = await prisma.barOrder.findMany({
    where: { status: 'CLOSED', createdAt: { gte: start, lte: end } },
    select: { items: { select: { quantity: true } } },
  })
  const itemCount = orders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0)
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0

  const byDay: Record<string, { revenue: number; count: number }> = {}
  for (const t of transactions) {
    const d = t.createdAt.toISOString().slice(0, 10)
    if (!byDay[d]) byDay[d] = { revenue: 0, count: 0 }
    byDay[d].revenue += Number(t.amount)
    byDay[d].count += 1
  }
  for (const o of legacyOrders) {
    const d = o.createdAt.toISOString().slice(0, 10)
    if (!byDay[d]) byDay[d] = { revenue: 0, count: 0 }
    byDay[d].revenue += Number(o.total)
    byDay[d].count += 1
  }

  const daily: { date: string; revenue: number; count: number }[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    daily.push({ date: key, ...(byDay[key] ?? { revenue: 0, count: 0 }) })
    cursor.setDate(cursor.getDate() + 1)
  }

  const topProductsRaw = await prisma.barOrderItem.groupBy({
    by: ['productId'],
    where: { order: { status: 'CLOSED', createdAt: { gte: start, lte: end } } },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  })
  const productIds = topProductsRaw.map((p) => p.productId)
  const products = productIds.length
    ? await prisma.barProduct.findMany({ where: { id: { in: productIds } } })
    : []
  const topProducts = topProductsRaw.map((p) => {
    const prod = products.find((pr) => pr.id === p.productId)
    const salePrice = Number(prod?.price ?? 0)
    const costPrice = Number(prod?.costPrice ?? 0)
    const margin = salePrice > 0 ? ((salePrice - costPrice) / salePrice) * 100 : 0
    return {
      productId: p.productId,
      name: prod?.name ?? '',
      quantity: p._sum.quantity ?? 0,
      revenue: Number(p._sum.subtotal ?? 0),
      costPrice,
      salePrice,
      margin,
    }
  })

  const byMargin = [...topProducts].sort((a, b) => b.margin - a.margin)

  // Payment methods: combine transactions + legacy orders
  const methodMap: Record<string, { count: number; total: number }> = {}
  for (const t of transactions) {
    const m = t.paymentMethod
    if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 }
    methodMap[m].count += 1
    methodMap[m].total += Number(t.amount)
  }
  for (const o of legacyOrders) {
    const m = o.paymentMethod ?? 'UNKNOWN'
    if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 }
    methodMap[m].count += 1
    methodMap[m].total += Number(o.total)
  }
  const byPaymentMethod = Object.entries(methodMap).map(([method, data]) => ({
    method,
    count: data.count,
    total: data.total,
  }))

  return { revenue, orderCount, itemCount, avgTicket, daily, topProducts, byMargin, byPaymentMethod }
}

export async function getOrderByNumber(number: number) {
  return prisma.barOrder.findFirst({
    where: { number },
    include: {
      items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function reopenOrder(id: string, clearItems: boolean) {
  const order = await getOrder(id)
  if (clearItems) {
    await prisma.$transaction([
      prisma.barOrderItem.deleteMany({ where: { orderId: id } }),
      prisma.barOrder.update({
        where: { id },
        // paidAmount keeps the previously paid amount so next payment only covers new items
        data: { status: 'OPEN', total: 0, paymentMethod: null, paidAmount: order.total },
      }),
    ])
  } else {
    await prisma.barOrder.update({
      where: { id },
      // paidAmount = current total (already paid), new items will increase total beyond this
      data: { status: 'OPEN', paymentMethod: null, paidAmount: order.total },
    })
  }
  return getOrder(id)
}

export async function removeItem(orderId: string, itemId: string) {
  const order = await getOrder(orderId)
  if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
    throw Object.assign(new Error('Comanda encerrada não pode ser editada'), { statusCode: 409 })
  }

  const item = await prisma.barOrderItem.findFirst({ where: { id: itemId, orderId } })
  if (!item) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404 })

  await prisma.$transaction([
    prisma.barOrderItem.delete({ where: { id: itemId } }),
    prisma.barOrder.update({
      where: { id: orderId },
      data: { total: { decrement: Number(item.subtotal) } },
    }),
  ])

  return getOrder(orderId)
}

export async function listBarTransactions(startDate?: string, endDate?: string) {
  const where: Record<string, unknown> = {}
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate + 'T00:00:00') } : {}),
      ...(endDate ? { lte: new Date(endDate + 'T23:59:59') } : {}),
    }
  }
  return prisma.barTransaction.findMany({
    where,
    include: { order: { select: { number: true, customerName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
