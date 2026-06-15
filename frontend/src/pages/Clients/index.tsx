import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { Client } from '../../types/client'
import * as clientsApi from '../../api/clients.api'
import { ClientDetailModal } from './ClientDetailModal'

const schema = z.object({
  firstName: z.string().min(1, 'Nome obrigatório'),
  lastName: z.string().min(1, 'Sobrenome obrigatório'),
  phone: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const load = useCallback(async () => {
    setLoading(true)
    try { setClients(await clientsApi.listClients(search || undefined)) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  function openCreate() { setSelected(null); reset({ firstName: '', lastName: '', phone: '' }); setFormOpen(true) }
  function openEdit(c: Client) { setSelected(c); reset({ firstName: c.firstName, lastName: c.lastName, phone: c.phone ?? '' }); setFormOpen(true) }
  function openDetail(c: Client) { setDetailClient(c); setDetailOpen(true) }

  async function onSubmit(data: FormData) {
    try {
      if (selected) {
        await clientsApi.updateClient(selected.id, data)
        toast.success('Cliente atualizado')
      } else {
        await clientsApi.createClient(data)
        toast.success('Cliente cadastrado')
      }
      setFormOpen(false)
      load()
    } catch { toast.error('Erro ao salvar cliente') }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await clientsApi.deleteClient(selected.id)
      toast.success('Cliente removido')
      setDeleteOpen(false)
      load()
    } catch { toast.error('Erro ao remover cliente') }
    finally { setDeleting(false) }
  }

  return (
    <Layout title="Clientes">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
            />
          </div>
          <Button onClick={openCreate}><Plus size={16} /> Novo Cliente</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="Nenhum cliente cadastrado" description="Adicione clientes para gerenciá-los aqui" action={{ label: 'Novo Cliente', onClick: openCreate }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group">
                {/* Clicking the row (not actions) opens detail */}
                <button
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  onClick={() => openDetail(c)}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-orange-700">{c.firstName[0]}{c.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </div>
                </button>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(c) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(c); setDeleteOpen(true) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && clients.length > 0 && (
          <p className="text-xs text-gray-400 text-right">{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Cliente' : 'Novo Cliente'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{selected ? 'Salvar' : 'Cadastrar'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome *" placeholder="João" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Sobrenome *" placeholder="Silva" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Input label="Telefone" placeholder="(11) 99999-9999" {...register('phone')} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remover cliente"
        message={`Deseja remover "${selected?.firstName} ${selected?.lastName}"?`}
        confirmLabel="Remover"
        loading={deleting}
      />

      {detailClient && (
        <ClientDetailModal
          client={detailClient}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </Layout>
  )
}
