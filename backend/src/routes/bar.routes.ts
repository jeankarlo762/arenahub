import { FastifyInstance } from 'fastify'
import * as barController from '../controllers/bar.controller'
import { authenticate } from '../middlewares/auth'

export async function barRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // Categories
  app.get('/categories', barController.listCategories)
  app.post('/categories', barController.createCategory)
  app.delete('/categories/:id', barController.deleteCategory)

  // Products
  app.get('/products', barController.listProducts)
  app.post('/products', barController.createProduct)
  app.put('/products/:id', barController.updateProduct)
  app.delete('/products/:id', barController.deleteProduct)

  // Stats
  app.get('/stats', barController.getBarStats)
  app.get('/top-clients', barController.getTopClients)

  // Orders
  app.get('/orders', barController.listOrders)
  app.post('/orders', barController.createOrder)
  app.get('/orders/by-number/:number', barController.getOrderByNumber)
  app.get('/orders/:id', barController.getOrder)
  app.put('/orders/:id', barController.updateOrder)
  app.patch('/orders/:id/status', barController.updateOrderStatus)
  app.patch('/orders/:id/reopen', barController.reopenOrder)
  app.post('/orders/:id/items', barController.addItem)
  app.delete('/orders/:id/items/:itemId', barController.removeItem)
}
