import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Building2, CheckCircle, XCircle, Plus, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import * as superAdminApi from '../../api/superadmin.api'
import type { Tenant } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

const planLabels: Record<string, string> = { BASIC: 'Basic', PRO: 'Pro', ENTERPRISE: 'Enterprise' }
const planColors: Record<string, string> = {
  BASIC: 'bg-gray-100 text-gray-600',
  PRO: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
}

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
  adminName: z.string().min(1, 'Nome do admin obrigatório'),
  adminEmail: z.string().email('Email do admin inválido'),
  adminPassword: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function SuperAdminPage() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'BASIC' },
  })

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

  async function onSubmit(data: FormData) {
    try {
      await superAdminApi.createTenant(data)
      toast.success('Tenant criado com sucesso')
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

  async function handlePlanChange(tenant: Tenant, plan: Tenant['plan']) {
    try {
      await superAdminApi.updateTenantPlan(tenant.id, plan)
      toast.success('Plano atualizado')
      load()
    } catch {
      toast.error('Erro ao atualizar plano')
    }
  }

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const total = tenants.length
  const active = tenants.filter((t) => t.active).length
  const inactive = total - active

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900">ArenaHub</span>
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Tenants</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie todas as arenas cadastradas na plataforma</p>
          </div>
          <Button onClick={() => setOpenModal(true)}>
            <Plus size={16} />
            Novo Tenant
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
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

        {/* Tenant list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Spinner size="md" />
              <span className="text-sm text-gray-400">Carregando tenants...</span>
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Building2 size={40} className="opacity-30" />
              <p className="text-sm">Nenhum tenant cadastrado ainda</p>
              <Button variant="secondary" onClick={() => setOpenModal(true)}>Criar primeiro tenant</Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Arena', 'Email', 'Telefone', 'Plano', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Building2 size={14} className="text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                          <p className="text-xs text-gray-400">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{tenant.email}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{tenant.phone || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="relative group inline-block">
                        <button className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${planColors[tenant.plan]}`}>
                          {planLabels[tenant.plan]}
                          <ChevronDown size={11} />
                        </button>
                        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-28">
                          {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => handlePlanChange(tenant, p)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${tenant.plan === p ? 'font-semibold text-orange-600' : 'text-gray-700'}`}
                            >
                              {planLabels[p]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tenant.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.active ? 'bg-green-500' : 'bg-red-400'}`} />
                        {tenant.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggle(tenant)}
                        disabled={actionId === tenant.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          tenant.active
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {actionId === tenant.id ? <Spinner size="sm" /> : tenant.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                <label className="text-sm font-medium text-gray-700">Plano</label>
                <select {...register('plan')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white">
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Admin da Arena</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nome do Administrador</label>
                <input {...register('adminName')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="João Silva" />
                {errors.adminName && <p className="text-xs text-red-500">{errors.adminName.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email do Admin</label>
                <input {...register('adminEmail')} type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="admin@arena.com" />
                {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Senha do Admin</label>
                <input {...register('adminPassword')} type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="••••••" />
                {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword.message}</p>}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
