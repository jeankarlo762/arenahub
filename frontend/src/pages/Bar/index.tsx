import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Package, BarChart2, Download, Medal, Tag, Plus, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { DatePicker } from '../../components/ui/DatePicker'
import { ProductForm } from './ProductForm'
import type { BarProduct } from '../../types/bar'
import type { BarStats, BarCategory } from '../../api/bar.api'
import * as barApi from '../../api/bar.api'
import { formatCurrency } from '../../utils/format'
import { formatDate } from '../../utils/date'

type Tab = 'products' | 'stats'
type StatsPeriod = 'today' | 'week' | 'month' | 'custom'

function getPeriodDates(period: StatsPeriod): { start: string; end: string } {
  const today = new Date().toISOString().slice(0, 10)
  if (period === 'today') return { start: today, end: today }
  if (period === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return { start: d.toISOString().slice(0, 10), end: today }
  }
  return { start: `${today.slice(0, 7)}-01`, end: today }
}

function exportCSV(stats: BarStats, startDate: string, endDate: string) {
  const rows = [
    ['Data', 'Faturamento (R$)', 'Comandas'],
    ...stats.daily.map((d) => [d.date, d.revenue.toFixed(2), String(d.count)]),
    [],
    ['Período', `${startDate} - ${endDate}`],
    ['Faturamento Total', stats.revenue.toFixed(2)],
    ['Comandas pagas', String(stats.orderCount)],
    ['Itens vendidos', String(stats.itemCount)],
    ['Ticket médio', stats.avgTicket.toFixed(2)],
    [],
    ['Ranking de produtos'],
    ['#', 'Produto', 'Quantidade', 'Receita (R$)'],
    ...stats.topProducts.map((p, i) => [String(i + 1), p.name, String(p.quantity), p.revenue.toFixed(2)]),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-bar-${startDate}-${endDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BarPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab] = useState<Tab>('products')

  // Categories state
  const [categories, setCategories] = useState<BarCategory[]>([])
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  // Products state
  const [products, setProducts] = useState<BarProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BarProduct | undefined>()
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Stats state
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('week')
  const [statsStartDate, setStatsStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })
  const [statsEndDate, setStatsEndDate] = useState(today)
  const [stats, setStats] = useState<BarStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    try { setCategories(await barApi.listCategories()) } catch { /* ignore */ }
  }, [])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    try { setProducts(await barApi.listProducts()) }
    finally { setProductsLoading(false) }
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try { setStats(await barApi.getBarStats(statsStartDate, statsEndDate)) }
    finally { setStatsLoading(false) }
  }, [statsStartDate, statsEndDate])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { if (tab === 'stats') loadStats() }, [tab, loadStats])

  function applyPeriod(p: StatsPeriod) {
    setStatsPeriod(p)
    if (p !== 'custom') {
      const { start, end } = getPeriodDates(p)
      setStatsStartDate(start)
      setStatsEndDate(end)
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    try {
      await barApi.createCategory(newCategoryName.trim())
      setNewCategoryName('')
      toast.success('Categoria criada')
      loadCategories()
      loadProducts()
    } catch {
      toast.error('Erro ao criar categoria')
    } finally {
      setAddingCategory(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCategoryId(id)
    try {
      await barApi.deleteCategory(id)
      toast.success('Categoria removida')
      loadCategories()
      loadProducts()
    } catch {
      toast.error('Erro ao remover categoria')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  async function handleDeleteProduct() {
    if (!deleteProductId) return
    setDeleting(true)
    try {
      await barApi.deleteProduct(deleteProductId)
      toast.success('Produto removido')
      setDeleteProductId(null)
      loadProducts()
    } catch {
      toast.error('Erro ao remover produto')
    } finally {
      setDeleting(false)
    }
  }

  const productsByCategory = products.reduce<Record<string, BarProduct[]>>((acc, p) => {
    const cat = p.category || 'Sem categoria'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const sortedCategories = Object.entries(productsByCategory).sort(([a], [b]) => {
    if (a === 'Sem categoria') return 1
    if (b === 'Sem categoria') return -1
    return a.localeCompare(b, 'pt-BR')
  })

  const periodLabels: Record<StatsPeriod, string> = { today: 'Hoje', week: 'Semana', month: 'Mês', custom: 'Personalizado' }

  return (
    <Layout title="Bar">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTab('products')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'products' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <Package size={15} /> Cardápio
            </button>
            <button
              onClick={() => setTab('stats')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'stats' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <BarChart2 size={15} /> Relatório
            </button>
          </div>

          {tab === 'products' && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCategoriesModalOpen(true)}>
                <Tag size={15} /> Categorias
              </Button>
              <Button onClick={() => { setEditingProduct(undefined); setProductFormOpen(true) }}>
                <Package size={16} /> Novo Produto
              </Button>
            </div>
          )}
          {tab === 'stats' && stats && (
            <Button variant="secondary" onClick={() => exportCSV(stats, statsStartDate, statsEndDate)}>
              <Download size={15} /> Exportar CSV
            </Button>
          )}
        </div>

        {/* ── CARDÁPIO ── */}
        {tab === 'products' && (
          productsLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum produto cadastrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedCategories.map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map((product) => (
                      <div key={product.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 flex items-center justify-between gap-3 ${product.active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                            {!product.active && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">Inativo</span>}
                          </div>
                          {product.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{product.description}</p>}
                          <p className="text-base font-bold text-orange-600 mt-1">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditingProduct(product); setProductFormOpen(true) }} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setDeleteProductId(product.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── RELATÓRIO ── */}
        {tab === 'stats' && (
          <div className="flex flex-col gap-6">
            {/* Period filter */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                {(['today', 'week', 'month', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statsPeriod === p ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <DatePicker label="De" value={statsStartDate} onChange={(e) => { setStatsStartDate(e.target.value); setStatsPeriod('custom') }} className="w-36" />
                <DatePicker label="Até" value={statsEndDate} onChange={(e) => { setStatsEndDate(e.target.value); setStatsPeriod('custom') }} className="w-36" />
                <Button variant="secondary" onClick={loadStats}>Filtrar</Button>
              </div>
            </div>

            {statsLoading || !stats ? (
              <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Faturamento</p><p className="text-xl sm:text-2xl font-bold text-orange-600">{formatCurrency(stats.revenue)}</p></Card>
                  <Card><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Comandas pagas</p><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.orderCount}</p></Card>
                  <Card><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Itens vendidos</p><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.itemCount}</p></Card>
                  <Card><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ticket médio</p><p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(stats.avgTicket)}</p></Card>
                </div>

                {/* Bar chart */}
                <Card>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Faturamento diário</h2>
                  {stats.daily.every((d) => d.revenue === 0) ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Nenhuma comanda paga neste período</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.daily}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'dd/MM')} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} width={55} />
                        <Tooltip formatter={(v, _n, p) => [formatCurrency(Number(v)), `${p.payload?.count ?? 0} comanda(s)`]} labelFormatter={(l) => formatDate(l as string)} />
                        <Bar dataKey="revenue" fill="#F2B705" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                {/* Top products ranking */}
                {stats.topProducts.length > 0 && (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <Medal size={18} className="text-orange-500" />
                      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Produtos mais vendidos</h2>
                    </div>
                    <div className="flex flex-col gap-2">
                      {stats.topProducts.map((p, i) => (
                        <div key={p.productId} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                            i === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.quantity} un. vendidas</p>
                          </div>
                          <p className="text-sm font-bold text-orange-600 shrink-0">{formatCurrency(p.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ProductForm open={productFormOpen} onClose={() => setProductFormOpen(false)} onSuccess={loadProducts} product={editingProduct} categories={categories} />

      {/* Categories modal */}
      <Modal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        title="Gerenciar Categorias"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Nome da categoria..."
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
            />
            <Button onClick={handleAddCategory} loading={addingCategory} disabled={!newCategoryName.trim()}>
              <Plus size={15} />
            </Button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhuma categoria cadastrada</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deletingCategoryId === cat.id}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deletingCategoryId === cat.id ? <Spinner size="sm" /> : <X size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleDeleteProduct}
        title="Remover produto"
        message="Deseja remover este produto do cardápio?"
        confirmLabel="Remover"
        loading={deleting}
      />
    </Layout>
  )
}
