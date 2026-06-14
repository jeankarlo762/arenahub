import { prisma } from '../config/database'
import {
  CreateProductInput,
  UpdateProductInput,
  CreateOrderInput,
  UpdateOrderInput,
  AddItemInput,
} from '../schemas/bar.schema'

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
  // Check if used in any order item
  const used = await prisma.barOrderItem.findFirst({ where: { productId: id } })
  if (used) {
    // Soft-delete instead
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
  const exists = await prisma.barOrder.findUnique({ where: { number: input.number } })
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
  await getOrder(id)
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
  return prisma.barOrder.update({
    where: { id },
    data: { status, ...(paymentMethod ? { paymentMethod } : {}) },
    include: { items: { include: { product: true } } },
  })
}

export async function addItem(orderId: string, input: AddItemInput) {
  const order = await getOrder(orderId)
  if (order.status === 'CANCELLED') {
    throw Object.assign(new Error('Comanda cancelada não pode ser editada'), { statusCode: 409 })
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

  const orders = await prisma.barOrder.findMany({
    where: { status: 'CLOSED', createdAt: { gte: start, lte: end } },
    select: { total: true, createdAt: true, items: { select: { quantity: true } } },
  })

  const revenue = orders.reduce((s, o) => s + Number(o.total), 0)
  const orderCount = orders.length
  const itemCount = orders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0)
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0

  const byDay: Record<string, { revenue: number; count: number }> = {}
  for (const o of orders) {
    const d = o.createdAt.toISOString().slice(0, 10)
    if (!byDay[d]) byDay[d] = { revenue: 0, count: 0 }
    byDay[d].revenue += Number(o.total)
    byDay[d].count += 1
  }

  // Fill gaps between start and end
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

  const paymentMethodRaw = await prisma.barOrder.groupBy({
    by: ['paymentMethod'],
    where: { status: 'CLOSED', createdAt: { gte: start, lte: end }, paymentMethod: { not: null } },
    _sum: { total: true },
    _count: { id: true },
  })
  const byPaymentMethod = paymentMethodRaw.map((r) => ({
    method: r.paymentMethod ?? 'UNKNOWN',
    count: r._count.id,
    total: Number(r._sum.total ?? 0),
  }))

  return { revenue, orderCount, itemCount, avgTicket, daily, topProducts, byMargin, byPaymentMethod }
}

export async function getOrderByNumber(number: number) {
  return prisma.barOrder.findUnique({
    where: { number },
    include: {
      items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function reopenOrder(id: string, clearItems: boolean) {
  await getOrder(id)
  if (clearItems) {
    await prisma.$transaction([
      prisma.barOrderItem.deleteMany({ where: { orderId: id } }),
      prisma.barOrder.update({
        where: { id },
        data: { status: 'OPEN', total: 0, paymentMethod: null },
      }),
    ])
  } else {
    await prisma.barOrder.update({
      where: { id },
      data: { status: 'OPEN', paymentMethod: null },
    })
  }
  return getOrder(id)
}

export async function removeItem(orderId: string, itemId: string) {
  const order = await getOrder(orderId)
  if (order.status === 'CANCELLED') {
    throw Object.assign(new Error('Comanda cancelada não pode ser editada'), { statusCode: 409 })
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
