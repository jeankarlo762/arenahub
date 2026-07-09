import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Clock, Loader2 } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import * as settingsApi from '../../api/settings.api'
import type { DayHours } from '../../api/settings.api'

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export function EstablishmentTab() {
  const [hours, setHours] = useState<DayHours[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.getBusinessHours()
      .then(setHours)
      .catch(() => toast.error('Erro ao carregar horários'))
      .finally(() => setLoading(false))
  }, [])

  function update<K extends keyof DayHours>(day: number, key: K, value: DayHours[K]) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === day ? { ...h, [key]: value } : h)))
  }

  // Aplica o horário de um dia a todos os outros dias ativos (atalho útil).
  function applyToAll(day: number) {
    const src = hours.find((h) => h.dayOfWeek === day)
    if (!src) return
    setHours((prev) => prev.map((h) => (h.active ? { ...h, openTime: src.openTime, closeTime: src.closeTime } : h)))
    toast.success('Horário replicado para os dias ativos')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await settingsApi.saveBusinessHours(hours)
      setHours(saved)
      toast.success('Horário de funcionamento salvo')
    } catch {
      toast.error('Erro ao salvar horário')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
  }

  return (
    <div className="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
          <Clock size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Horário de funcionamento</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Vale para todas as quadras da arena</p>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-2">
        {hours.map((h) => (
          <div
            key={h.dayOfWeek}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors flex-wrap ${
              h.active ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
            }`}
          >
            <label className="flex items-center gap-2 w-40 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={h.active}
                onChange={(e) => update(h.dayOfWeek, 'active', e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500"
              />
              <span className={`text-sm font-medium ${h.active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {DAY_NAMES[h.dayOfWeek]}
              </span>
            </label>

            {h.active ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="time"
                  value={h.openTime}
                  onChange={(e) => update(h.dayOfWeek, 'openTime', e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
                <span className="text-gray-400 dark:text-gray-500 text-sm">até</span>
                <input
                  type="time"
                  value={h.closeTime}
                  onChange={(e) => update(h.dayOfWeek, 'closeTime', e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
                <button
                  onClick={() => applyToAll(h.dayOfWeek)}
                  className="ml-auto text-xs text-gray-400 hover:text-orange-600 underline transition-colors whitespace-nowrap"
                  title="Aplicar este horário a todos os dias ativos"
                >
                  aplicar a todos
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">Fechado</span>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            Salvar horário
          </button>
        </div>
      </div>
    </div>
  )
}
