import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { UserRound, Plus, Shield, User as UserIcon } from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import type { Tenant, TenantUser } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { SuperAdminLayout } from './SuperAdminLayout'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'OPERATOR']),
})

type FormData = z.infer<typeof schema>

export default function TenantUsersPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'OPERATOR' },
  })

  useEffect(() => {
    superAdminApi.listTenants()
      .then((t) => {
        setTenants(t)
        if (t.length > 0) setSelectedTenant(t[0].id)
      })
      .catch(() => toast.error('Erro ao carregar tenants'))
      .finally(() => setLoadingTenants(false))
  }, [])

  async function loadUsers(tenantId: string) {
    if (!tenantId) return
    setLoadingUsers(true)
    try {
      setUsers(await superAdminApi.listTenantUsers(tenantId))
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => { loadUsers(selectedTenant) }, [selectedTenant])

  async function onSubmit(data: FormData) {
    try {
      await superAdminApi.createTenantUser(selectedTenant, data)
      toast.success('Usuário criado — login já está ativo')
      setOpenModal(false)
      reset()
      loadUsers(selectedTenant)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(msg ?? 'Erro ao criar usuário')
    }
  }

  async function handleToggle(user: TenantUser) {
    setActionId(user.id)
    try {
      await superAdminApi.toggleTenantUser(selectedTenant, user.id, !user.active)
      loadUsers(selectedTenant)
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setActionId(null)
    }
  }

  const currentTenant = tenants.find((t) => t.id === selectedTenant)

  return (
    <SuperAdminLayout
      title="Usuários dos Tenants"
      subtitle="Crie e gerencie os usuários de cada arena"
      action={
        <Button onClick={() => setOpenModal(true)} disabled={!selectedTenant}>
          <Plus size={16} />Novo Usuário
        </Button>
      }
    >
      {loadingTenants ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <UserRound size={40} className="opacity-30" />
          <p className="text-sm">Nenhum tenant cadastrado. Crie um tenant primeiro.</p>
        </div>
      ) : (
        <>
          {/* Tenant selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">Arena:</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white min-w-64"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{!t.active ? ' (inativo)' : ''}</option>
              ))}
            </select>
            {currentTenant && (
              <span className="text-xs text-gray-400 ml-auto">{currentTenant.email}</span>
            )}
          </div>

          {/* Users list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Spinner size="md" />
                <span className="text-sm text-gray-400">Carregando usuários...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <UserRound size={40} className="opacity-30" />
                <p className="text-sm">Nenhum usuário nesta arena ainda</p>
                <Button variant="secondary" onClick={() => setOpenModal(true)}>Criar primeiro usuário</Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Usuário', 'Email', 'Função', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserIcon size={14} className="text-gray-500" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role === 'ADMIN' ? <Shield size={11} /> : <UserIcon size={11} />}
                          {user.role === 'ADMIN' ? 'Admin' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-400'}`} />
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={actionId === user.id}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            user.active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          {actionId === user.id ? <Spinner size="sm" /> : user.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Create user modal */}
      <Modal
        open={openModal}
        onClose={() => { setOpenModal(false); reset() }}
        title={`Novo Usuário — ${currentTenant?.name ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpenModal(false); reset() }}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Criar Usuário</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nome</label>
            <input {...register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="Maria Silva" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email de Login</label>
            <input {...register('email')} type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="usuario@arena.com" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Senha de Login</label>
            <input {...register('password')} type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="••••••" />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Função</label>
            <select {...register('role')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white">
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </SuperAdminLayout>
  )
}
