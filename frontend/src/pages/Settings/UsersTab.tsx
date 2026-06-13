import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { UserForm } from './UserForm'
import api from '../../api/axios'
import type { User } from '../../types/auth'
import { formatDateTime } from '../../utils/date'

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<User[]>('/users')
      setUsers(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActive(user: User) {
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active })
      load()
    } catch {
      // ignore
    }
  }

  const columns = [
    { key: 'name', header: 'Nome', cell: (u: User) => <span className="font-medium">{u.name}</span> },
    { key: 'email', header: 'Email', cell: (u: User) => u.email },
    {
      key: 'role',
      header: 'Perfil',
      cell: (u: User) => (
        <Badge label={u.role === 'ADMIN' ? 'Admin' : 'Operador'} status={u.role === 'ADMIN' ? 'CONFIRMED' : 'COMPLETED'} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u: User) => (
        <Badge label={u.active ? 'Ativo' : 'Inativo'} status={u.active ? 'active' : 'inactive'} />
      ),
    },
    { key: 'created', header: 'Criado em', cell: (u: User) => formatDateTime(u.createdAt) },
    {
      key: 'actions',
      header: '',
      cell: (u: User) => (
        <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
          {u.active ? 'Desativar' : 'Ativar'}
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={14} /> Novo Usuário
        </Button>
      </div>
      <Table columns={columns} data={users} keyExtractor={(u) => u.id} loading={loading} />
      <UserForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={load} />
    </div>
  )
}
