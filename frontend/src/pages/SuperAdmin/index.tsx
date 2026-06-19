import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Building2, CheckCircle, XCircle, Plus, Search, Pencil, Users, Shield, User as UserIcon, Mail } from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import type { Tenant, TenantUser } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../utils/format'
import { SuperAdminLayout } from './SuperAdminLayout'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  mrrValue: z.coerce.number().min(0, 'Valor inválido'),
  setupFee: z.coerce.number().min(0, 'Valor inválido'),
  adminName: z.string().min(1, 'Nome do admin obrigatório'),
  adminEmail: z.string().email('Email do admin inválido'),
  adminPassword: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

const editSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().optional(),
  mrrValue: z.coerce.number().min(0, 'Valor inválido'),
  setupFee: z.coerce.number().min(0, 'Valor inválido'),
})
type EditForm = z.infer<typeof editSchema>

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Users popup (per tenant)
  const [usersTenant, setUsersTenant] = useState<Tenant | null>(null)
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mrrValue: 0, setupFee: 0 },
  })

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  function openEdit(tenant: Tenant) {
    setEditTenant(tenant)
    editForm.reset({ name: tenant.name, phone: tenant.phone ?? '', mrrValue: tenant.mrrValue, setupFee: tenant.setupFee })
  }

  async function onEdit(data: EditForm) {
    if (!editTenant) return
    try {
      await superAdminApi.updateTenant(editTenant.id, data)
      toast.success('Tenant atualizado')
      setEditTenant(null)
      load()
    } catch {
      toast.error('Erro ao atualizar tenant')
    }
  }

  async function load() {
    try {
      setTenants(await superAdminApi.listTenants())
    } catch {
      toast.error('Erro ao carregar tenants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tenants
    return tenants.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
  }, [tenants, search])

  async function onSubmit(data: FormData) {
    try {
      await superAdminApi.createTenant(data)
      toast.success('Tenant criado — login do admin já está ativo')
      setOpenModal(false)
      reset()
      load()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(msg ?? 'Erro ao criar tenant')
    }
  }

  async function handleToggle(tenant: Tenant) {
    setActionId(tenant.id)
    try {
      await superAdminApi.toggleTenant(tenant.id, !tenant.active)
      toast.success(tenant.active ? 'Tenant desativado' : 'Tenant ativado')
      load()
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setActionId(null)
    }
  }

  async function openUsers(tenant: Tenant) {
    setUsersTenant(tenant)
    setTenantUsers([])
    setUsersLoading(true)
    try {
      setTenantUsers(await superAdminApi.listTenantUsers(tenant.id))
    } catch {
      toast.error('Erro ao carregar usuários da arena')
    } finally {
      setUsersLoading(false)
    }
  }

  const total = tenants.length
  const active = tenants.filter((t) => t.active).length
  const inactive = total - active

  const activeTenants = useMemo(() => filtered.filter((t) => t.active), [filtered])
  const inactiveTenants = useMemo(() => filtered.filter((t) => !t.active), [filtered])

  return (
    <SuperAdminLayout
      title="Gestão de Tenants"
      subtitle="Gerencie todas as arenas cadastradas na plataforma"
      action={<Button onClick={() => setOpenModal(true)}><Plus size={16} />Novo Tenant</Button>}
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total de Tenants', value: total, icon: Building2, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tenants Ativos', value: active, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Tenants Inativos', value: inactive, icon: XCircle, color: 'text-red-500 bg-red-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar arena por nome ou email..."
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
        />
      </div>

      {/* Tenant columns: Ativos | Inativos */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 bg-white rounded-xl border border-gray-200">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando tenants...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Building2 size={40} className="opacity-30" />
          <p className="text-sm">{search ? 'Nenhuma arena encontrada' : 'Nenhum tenant cadastrado ainda'}</p>
          {!search && <Button variant="secondary" onClick={() => setOpenModal(true)}>Criar primeiro tenant</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Coluna: Ativos */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-600" />
              <h2 className="text-sm font-semibold text-gray-700">Ativos</h2>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{activeTenants.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {activeTenants.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-6 text-center">Nenhuma arena ativa</p>
              ) : (
                activeTenants.map((tenant) => (
                  <TenantCard
                    key={tenant.id}
                    tenant={tenant}
                    busy={actionId === tenant.id}
                    onOpenUsers={() => openUsers(tenant)}
                    onEdit={() => openEdit(tenant)}
                    onToggle={() => handleToggle(tenant)}
                  />
                ))
              )}
            </div>
          </section>

          {/* Coluna: Inativos */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold text-gray-700">Inativos</h2>
              <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{inactiveTenants.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {inactiveTenants.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-6 text-center">Nenhuma arena inativa</p>
              ) : (
                inactiveTenants.map((tenant) => (
                  <TenantCard
                    key={tenant.id}
                    tenant={tenant}
                    busy={actionId === tenant.id}
                    onOpenUsers={() => openUsers(tenant)}
                    onEdit={() => openEdit(tenant)}
                    onToggle={() => handleToggle(tenant)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* Create tenant modal */}
      <Modal
        open={openModal}
        onClose={() => { setOpenModal(false); reset() }}
        title="Novo Tenant"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpenModal(false); reset() }}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Criar Tenant</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Dados da Arena</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nome da Arena</label>
                <input {...register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="Arena XYZ" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email da Arena</label>
                <input {...register('email')} type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="arena@email.com" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Telefone (opcional)</label>
                <input {...register('phone')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="(11) 99999-9999" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Valor MRR (mensal R$)</label>
                <input {...register('mrrValue')} type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="199.00" />
                {errors.mrrValue && <p className="text-xs text-red-500">{errors.mrrValue.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Valor de Implantação (R$)</label>
                <input {...register('setupFee')} type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="500.00" />
                {errors.setupFee && <p className="text-xs text-red-500">{errors.setupFee.message}</p>}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Admin da Arena</p>
            <p className="text-xs text-gray-400 mb-3">Este será o login de acesso da arena ao sistema</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nome do Administrador</label>
                <input {...register('adminName')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="João Silva" />
                {errors.adminName && <p className="text-xs text-red-500">{errors.adminName.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email de Login</label>
                <input {...register('adminEmail')} type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="admin@arena.com" />
                {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Senha de Login</label>
                <input {...register('adminPassword')} type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="••••••" />
                {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword.message}</p>}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit tenant modal */}
      <Modal
        open={!!editTenant}
        onClose={() => setEditTenant(null)}
        title={`Editar — ${editTenant?.name ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTenant(null)}>Cancelar</Button>
            <Button onClick={editForm.handleSubmit(onEdit)} loading={editForm.formState.isSubmitting}>Salvar</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Nome da Arena</label>
            <input {...editForm.register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
            {editForm.formState.errors.name && <p className="text-xs text-red-500">{editForm.formState.errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Telefone</label>
            <input {...editForm.register('phone')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="(11) 99999-9999" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Valor MRR (mensal R$)</label>
            <input {...editForm.register('mrrValue')} type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
            {editForm.formState.errors.mrrValue && <p className="text-xs text-red-500">{editForm.formState.errors.mrrValue.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Valor de Implantação (R$)</label>
            <input {...editForm.register('setupFee')} type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
            {editForm.formState.errors.setupFee && <p className="text-xs text-red-500">{editForm.formState.errors.setupFee.message}</p>}
          </div>
        </div>
      </Modal>

      {/* Tenant users popup */}
      <Modal
        open={!!usersTenant}
        onClose={() => setUsersTenant(null)}
        title={`Usuários — ${usersTenant?.name ?? ''}`}
        size="md"
        footer={<Button variant="secondary" onClick={() => setUsersTenant(null)}>Fechar</Button>}
      >
        {usersLoading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Spinner size="md" />
            <span className="text-sm text-gray-400">Carregando usuários...</span>
          </div>
        ) : tenantUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
            <Users size={36} className="opacity-30" />
            <p className="text-sm">Nenhum usuário cadastrado nesta arena</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tenantUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  {u.role === 'ADMIN' ? <Shield size={15} className="text-blue-600" /> : <UserIcon size={15} className="text-gray-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate"><Mail size={11} /> {u.email}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {u.role === 'ADMIN' ? 'Admin' : 'Operador'}
                </span>
                <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-400'}`} />
                  {u.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </SuperAdminLayout>
  )
}

interface TenantCardProps {
  tenant: Tenant
  busy: boolean
  onOpenUsers: () => void
  onEdit: () => void
  onToggle: () => void
}

function TenantCard({ tenant, busy, onOpenUsers, onEdit, onToggle }: TenantCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenUsers}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenUsers() } }}
      className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{tenant.name}</p>
          <p className="text-xs text-gray-400 truncate">{tenant.email}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tenant.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tenant.active ? 'bg-green-500' : 'bg-red-400'}`} />
          {tenant.active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><Users size={12} /> {tenant._count?.users ?? 0} usuário(s)</span>
        <span className="font-medium text-green-600">{formatCurrency(tenant.mrrValue)}/mês</span>
        <span>{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</span>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
        >
          <Pencil size={12} />Editar
        </button>
        <button
          onClick={onToggle}
          disabled={busy}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            tenant.active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
          }`}
        >
          {busy ? <Spinner size="sm" /> : tenant.active ? 'Desativar' : 'Ativar'}
        </button>
        <span className="ml-auto text-xs text-orange-500 font-medium">Ver usuários →</span>
      </div>
    </div>
  )
}
