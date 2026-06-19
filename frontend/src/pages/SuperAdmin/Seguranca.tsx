import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, ShieldAlert, Eye, EyeOff, Trash2, Check } from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { SuperAdminLayout } from './SuperAdminLayout'

export default function SegurancaPage() {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const [key, setKey] = useState('')
  const [confirmKey, setConfirmKey] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const s = await superAdminApi.getMasterKeyStatus()
      setConfigured(s.configured)
      setUpdatedAt(s.updatedAt)
    } catch {
      toast.error('Erro ao carregar status da master key')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (key.length < 8) { toast.error('A senha mestra deve ter no mínimo 8 caracteres'); return }
    if (key !== confirmKey) { toast.error('As senhas não coincidem'); return }
    setSaving(true)
    try {
      await superAdminApi.setMasterKey(key)
      toast.success('Master key salva')
      setKey(''); setConfirmKey('')
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao salvar master key')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Remover a master key? O acesso de suporte por senha mestra deixará de funcionar.')) return
    setRemoving(true)
    try {
      await superAdminApi.removeMasterKey()
      toast.success('Master key removida')
      load()
    } catch {
      toast.error('Erro ao remover master key')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <SuperAdminLayout title="Segurança" subtitle="Senha mestra de acesso (master key)">
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl">
          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Acesso poderoso — use com cuidado</p>
              <p>
                A master key é uma senha única que permite entrar em <strong>qualquer conta</strong> do sistema
                (informando o email do usuário e esta senha no lugar da senha dele). É destinada a suporte.
                Todo acesso via master key fica registrado na <strong>auditoria</strong>.
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${configured ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <KeyRound size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {configured ? 'Master key configurada' : 'Nenhuma master key configurada'}
              </p>
              {configured && updatedAt && (
                <p className="text-xs text-gray-400">Atualizada em {new Date(updatedAt).toLocaleString('pt-BR')}</p>
              )}
            </div>
            {configured && (
              <Button variant="ghost" onClick={handleRemove} loading={removing}>
                <Trash2 size={15} className="text-red-500" /> Remover
              </Button>
            )}
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-900">{configured ? 'Atualizar master key' : 'Definir master key'}</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Senha mestra</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Confirmar senha mestra</label>
              <input
                type={show ? 'text' : 'password'}
                value={confirmKey}
                onChange={(e) => setConfirmKey(e.target.value)}
                placeholder="Repita a senha"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
              />
            </div>

            <div>
              <Button onClick={handleSave} loading={saving} disabled={!key || !confirmKey}>
                <Check size={15} /> {configured ? 'Atualizar master key' : 'Salvar master key'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
