import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { UserRound, Plus, Shield, User as UserIcon, Search, Pencil } from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import type { Tenant, GlobalUser } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { SuperAdminLayout } from './SuperAdminLayout'

const createSchema = z.object({
  tenantId: z.string().min(1, 'Selecione a arena'),
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'OPERATOR']),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  role: z.enum(['ADMIN', 'OPERATOR']),
  password: z.string().optional().refine((v) => !v || v.length >= 6, 'Mínimo 6 caracteres'),
})
type EditForm = z.infer<typeof editSchema>

export default function TenantUsersPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<GlobalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [editUser, setEditUser] = useState<GlobalUser | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'OPERATOR' } })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  async function load() {
    setLoading(true)
    try {
      const [u, t] = await Promise.all([superAdminApi.listAllUsers(), superAdminApi.listTenants()])
      setUsers(u)
      setTenants(t)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Show ALL users by default; filter by tenant name (or user name/email) on
  // search. Always grouped/ordered by tenant first (orphans without arena last).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = !q ? users : users.filter((u) =>
      u.tenantName.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    )
    return [...base].sort((a, b) => {
      const an = a.tenantId ? a.tenantName : '￿'
      const bn = b.tenantId ? b.tenantName : '￿'
      return an.localeCompare(bn, 'pt') || a.name.localeCompare(b.name, 'pt')
    })
  }, [users, search])

  async function onCreate(data: CreateForm) {
    try {
      await superAdminApi.createTenantUser(data.tenantId, {
        name: data.name, email: data.email, password: data.password, role: data.role,
      })
      toast.success('Usuário criado — login já está ativo')
      setOpenCreate(false)
      createForm.reset({ role: 'OPERATOR' })
      load()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      toast.error(msg ?? 'Erro ao criar usuário')
    }
  }

  function openEdit(user: GlobalUser) {
    setEditUser(user)
    editForm.reset({ name: user.name, role: user.role, password: '' })
  }

  async function onEdit(data: EditForm) {
    if (!editUser) return
    try {
      await superAdminApi.updateUser(editUser.id, {
        name: data.name, role: data.role, ...(data.password ? { password: data.password } : {}),
      })
      toast.success('Usuário atualizado')
      setEditUser(null)
      load()
    } catch {
      toast.error('Erro ao atualizar usuário')
    }
  }

  async function handleToggle(user: GlobalUser) {
    setActionId(user.id)
    try {
      await superAdminApi.updateUser(user.id, { active: !user.active })
      load()
    } catch {
      toast.error('Erro ao alterar status')
    } finally {
      setActionId(null)
    }
  }

  return (
    <SuperAdminLayout
      title="Usuários dos Tenants"
      subtitle="Todos os usuários de todas as arenas"
      action={<Button onClick={() => setOpenCreate(true)} disabled={tenants.length === 0}><Plus size={16} />Novo Usuário</Button>}
    >
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar pelo nome do tenant (ou usuário/email)..."
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Spinner size="md" />
            <span className="text-sm text-gray-400">Carregando usuários...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <UserRound size={40} className="opacity-30" />
            <p className="text-sm">{search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado ainda'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Arena', 'Usuário', 'Email', 'Função', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">{user.tenantName}</span>
                  </td>
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                      >
                        <Pencil size={12} />Editar
                      </button>
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={actionId === user.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          user.active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {actionId === user.id ? <Spinner size="sm" /> : user.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create user modal */}
      <Modal
        open={openCreate}
        onClose={() => { setOpenCreate(false); createForm.reset({ role: 'OPERATOR' }) }}
        title="Novo Usuário"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpenCreate(false); createForm.reset({ role: 'OPERATOR' }) }}>Cancelar</Button>
            <Button onClick={createForm.handleSubmit(onCreate)} loading={createForm.formState.isSubmitting}>Criar Usuário</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Arena</label>
            <select {...createForm.register('tenantId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white">
              <option value="">Selecione...</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {createForm.formState.errors.tenantId && <p className="text-xs text-red-500">{createForm.formState.errors.tenantId.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nome</label>
            <input {...createForm.register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="Maria Silva" />
            {createForm.formState.errors.name && <p className="text-xs text-red-500">{createForm.formState.errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email de Login</label>
            <input {...createForm.register('email')} type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="usuario@arena.com" />
            {createForm.formState.errors.email && <p className="text-xs text-red-500">{createForm.formState.errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Senha de Login</label>
            <input {...createForm.register('password')} type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="••••••" />
            {createForm.formState.errors.password && <p className="text-xs text-red-500">{createForm.formState.errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Função</label>
            <select {...createForm.register('role')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white">
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit user modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Editar — ${editUser?.name ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={editForm.handleSubmit(onEdit)} loading={editForm.formState.isSubmitting}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-400">Arena: <span className="font-medium text-gray-600">{editUser?.tenantName}</span> · {editUser?.email}</p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nome</label>
            <input {...editForm.register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
            {editForm.formState.errors.name && <p className="text-xs text-red-500">{editForm.formState.errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Função</label>
            <select {...editForm.register('role')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white">
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nova Senha (opcional)</label>
            <input {...editForm.register('password')} type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" placeholder="Deixe em branco para manter" />
            {editForm.formState.errors.password && <p className="text-xs text-red-500">{editForm.formState.errors.password.message}</p>}
          </div>
        </div>
      </Modal>
    </SuperAdminLayout>
  )
}
