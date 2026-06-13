import { useState, useEffect, useCallback } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import * as settingsApi from '../../api/settings.api'
import type { PaymentFee } from '../../api/settings.api'

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
  TRANSFER: 'Transferência',
}

export function PaymentFeesTab() {
  const [fees, setFees] = useState<PaymentFee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Record<string, boolean>>({})

  const hasDirty = Object.values(dirty).some(Boolean)

  // Warn on browser tab close / refresh
  useBeforeUnload(
    useCallback((e) => {
      if (hasDirty) e.preventDefault()
    }, [hasDirty]),
  )

  // Block React Router navigation if there are unsaved changes
  const blocker = useBlocker(hasDirty)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm('Você tem alterações não salvas nas taxas. Deseja sair mesmo assim?')
      if (confirmed) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  useEffect(() => {
    settingsApi.getPaymentFees().then((data) => {
      setFees(data)
      setValues(Object.fromEntries(data.map((f) => [f.method, String(f.feePercent)])))
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave(method: string) {
    const raw = values[method]
    const num = parseFloat(raw)
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error('Taxa deve ser entre 0 e 100')
      return
    }
    setSaving(method)
    try {
      await settingsApi.upsertPaymentFee(method, num)
      toast.success('Taxa atualizada')
      setFees((prev) => prev.map((f) => f.method === method ? { ...f, feePercent: num } : f))
      setDirty((prev) => ({ ...prev, [method]: false }))
    } catch {
      toast.error('Erro ao salvar taxa')
    } finally {
      setSaving(null)
    }
  }

  function handleChange(method: string, val: string) {
    setValues((prev) => ({ ...prev, [method]: val }))
    setDirty((prev) => ({ ...prev, [method]: true }))
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" className="text-orange-500" /></div>

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      {hasDirty && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertTriangle size={15} className="shrink-0" />
          Você tem alterações não salvas. Salve antes de sair.
        </div>
      )}

      <p className="text-sm text-gray-500">Configure a taxa (%) cobrada em cada forma de pagamento. Esse percentual é aplicado nas análises financeiras.</p>

      {fees.map((fee) => {
        const isDirty = dirty[fee.method]
        return (
          <div
            key={fee.method}
            className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${isDirty ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{METHOD_LABELS[fee.method] ?? fee.method}</p>
              <p className="text-xs text-gray-400">
                {isDirty ? (
                  <span className="text-amber-600 font-medium">Não salvo</span>
                ) : (
                  `Taxa atual: ${fee.feePercent}%`
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={values[fee.method] ?? '0'}
                  onChange={(e) => handleChange(fee.method, e.target.value)}
                  className={`w-24 pr-6 py-2 pl-3 text-sm rounded-lg border focus:ring-1 outline-none text-right transition-colors ${
                    isDirty
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-200 bg-white'
                      : 'border-gray-300 focus:border-orange-400 focus:ring-orange-200'
                  }`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
              </div>
              <Button
                size="sm"
                loading={saving === fee.method}
                onClick={() => handleSave(fee.method)}
                variant={isDirty ? 'primary' : 'secondary'}
              >
                Salvar
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
