export type BarOrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'

export interface BarProduct {
  id: string
  name: string
  description?: string
  price: number
  costPrice: number
  category?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface BarOrderItem {
  id: string
  orderId: string
  productId: string
  product: BarProduct
  quantity: number
  unitPrice: number
  subtotal: number
  createdAt: string
}

export interface BarOrder {
  id: string
  number: number
  customerName: string
  status: BarOrderStatus
  total: number
  notes?: string
  paymentMethod?: string
  items: BarOrderItem[]
  createdAt: string
  updatedAt: string
}
