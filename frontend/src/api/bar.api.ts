import api from './axios'
import type { BarProduct, BarOrder, BarOrderStatus } from '../types/bar'

// Products
export async function listProducts(active?: boolean): Promise<BarProduct[]> {
  const res = await api.get<BarProduct[]>('/bar/products', {
    params: active !== undefined ? { active } : undefined,
  })
  return res.data
}

export async function createProduct(data: {
  name: string
  description?: string
  price: number
  costPrice?: number
  category?: string
}): Promise<BarProduct> {
  const res = await api.post<BarProduct>('/bar/products', data)
  return res.data
}

export async function updateProduct(id: string, data: Partial<{
  name: string
  description: string
  price: number
  costPrice: number
  category: string
}>): Promise<BarProduct> {
  const res = await api.put<BarProduct>(`/bar/products/${id}`, data)
  return res.data
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/bar/products/${id}`)
}

// Orders
export async function listOrders(status?: BarOrderStatus): Promise<BarOrder[]> {
  const res = await api.get<BarOrder[]>('/bar/orders', {
    params: status ? { status } : undefined,
  })
  return res.data
}

export async function getOrder(id: string): Promise<BarOrder> {
  const res = await api.get<BarOrder>(`/bar/orders/${id}`)
  return res.data
}

export async function createOrder(data: {
  number: number
  customerName: string
  notes?: string
}): Promise<BarOrder> {
  const res = await api.post<BarOrder>('/bar/orders', data)
  return res.data
}

export async function updateOrder(id: string, data: {
  customerName?: string
  notes?: string
}): Promise<BarOrder> {
  const res = await api.put<BarOrder>(`/bar/orders/${id}`, data)
  return res.data
}

export async function updateOrderStatus(id: string, status: BarOrderStatus, paymentMethod?: string): Promise<BarOrder> {
  const res = await api.patch<BarOrder>(`/bar/orders/${id}/status`, { status, paymentMethod })
  return res.data
}

export async function addItem(orderId: string, data: {
  productId: string
  quantity: number
}): Promise<BarOrder> {
  const res = await api.post<BarOrder>(`/bar/orders/${orderId}/items`, data)
  return res.data
}

export interface BarTopProduct {
  productId: string
  name: string
  quantity: number
  revenue: number
  costPrice: number
  salePrice: number
  margin: number
}

export interface BarPaymentMethod {
  method: string
  count: number
  total: number
}

export interface BarStats {
  revenue: number
  orderCount: number
  itemCount: number
  avgTicket: number
  daily: { date: string; revenue: number; count: number }[]
  topProducts: BarTopProduct[]
  byMargin: BarTopProduct[]
  byPaymentMethod: BarPaymentMethod[]
}

export async function getBarStats(startDate: string, endDate: string): Promise<BarStats> {
  const res = await api.get<BarStats>('/bar/stats', { params: { startDate, endDate } })
  return res.data
}

export async function getTopClients(): Promise<{ customerName: string; total: number; orderCount: number }[]> {
  const res = await api.get('/bar/top-clients')
  return res.data
}

export async function removeItem(orderId: string, itemId: string): Promise<BarOrder> {
  const res = await api.delete<BarOrder>(`/bar/orders/${orderId}/items/${itemId}`)
  return res.data
}

export async function getOrderByNumber(number: number): Promise<BarOrder | null> {
  const res = await api.get<BarOrder | null>(`/bar/orders/by-number/${number}`)
  return res.data
}

export async function reopenOrder(id: string, clearItems: boolean): Promise<BarOrder> {
  const res = await api.patch<BarOrder>(`/bar/orders/${id}/reopen`, { clearItems })
  return res.data
}
