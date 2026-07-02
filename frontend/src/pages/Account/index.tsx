import { useEffect, useState } from 'react'
import { User as UserIcon, Mail, Phone, ShieldCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout } from '../../components/layout/Layout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { formatPhone } from '../../utils/format'
import { useAuthStore } from '../../store/auth.store'
import * as authApi from '../../api/auth.api'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  SUPERADMIN: 'Super Administrador',
}

export default function AccountPage() {
  const setUser = useAuthStore((s) => s.setUser)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    authApi.getMe()
      .then((u) => {
        const parts = (u.name ?? '').trim().split(/\s+/)
        setFirstName(parts[0] ?? '')
        setLastName(parts.slice(1).join(' '))
        setPhone(u.phone ?? '')
        setEmail(u.email)
        setRole(u.role)
      })
      .catch(() => toast.error('Erro ao carregar dados da conta'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!firstName.trim()) {
      toast.error('Informe seu nome')
      return
    }
    setSaving(true)
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim()
      const updated = await authApi.updateMe({ name, phone: phone.trim() })
      setUser({ id: updated.id, name: updated.name, email: updated.email, role: updated.role })
      toast.success('Conta atualizada')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Minha Conta">
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
      ) : (
        <div className="max-w-xl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {(firstName[0] ?? '') + (lastName[0] ?? '')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {firstName} {lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</p>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nome *"
                  placeholder="João"
                  icon={<UserIcon size={15} />}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  label="Sobrenome (opcional)"
                  placeholder="Silva"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                inputMode="tel"
                icon={<Phone size={15} />}
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />

              <Input
                label="Email"
                icon={<Mail size={15} />}
                value={email}
                disabled
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Permissão</label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <ShieldCheck size={15} className="text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ROLE_LABELS[role] ?? role}</span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                  Salvar alterações
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
