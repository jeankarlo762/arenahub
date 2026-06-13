import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Court, Schedule } from '../../types/court'
import * as courtsApi from '../../api/courts.api'
import { DAY_NAMES } from '../../utils/date'
import { formatCurrency } from '../../utils/format'

interface CourtSettingsModalProps {
  open: boolean
  onClose: () => void
  court: Court
  onSuccess: () => void
}

type ScheduleRow = {
  dayOfWeek: number
  openTime: string
  closeTime: string
  active: boolean
}

function defaultSchedules(): ScheduleRow[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: '08:00',
    closeTime: '22:00',
    active: i > 0 && i < 7,
  }))
}

export function CourtSettingsModal({ open, onClose, court, onSuccess }: CourtSettingsModalProps) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>(defaultSchedules())
  const [pricePerSlot, setPricePerSlot] = useState(String(Number(court.pricePerSlot)))
  const [slotMinutes, setSlotMinutes] = useState(String(court.slotMinutes))
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPricePerSlot(String(Number(court.pricePerSlot)))
    setSlotMinutes(String(court.slotMinutes))
    setLoadingSchedule(true)
    courtsApi
      .getCourtSchedule(court.id)
      .then((data: Schedule[]) => {
        if (data.length === 0) {
          setSchedules(defaultSchedules())
          return
        }
        const rows = defaultSchedules().map((def) => {
          const existing = data.find((s) => s.dayOfWeek === def.dayOfWeek)
          return existing
            ? { dayOfWeek: existing.dayOfWeek, openTime: existing.openTime, closeTime: existing.closeTime, active: existing.active }
            : def
        })
        setSchedules(rows)
      })
      .finally(() => setLoadingSchedule(false))
  }, [open, court.id, court.pricePerSlot, court.slotMinutes])

  function updateSchedule<K extends keyof ScheduleRow>(day: number, key: K, value: ScheduleRow[K]) {
    setSchedules((prev) => prev.map((s) => (s.dayOfWeek === day ? { ...s, [key]: value } : s)))
  }

  async function handleSave() {
    const price = Number(pricePerSlot)
    const minutes = Number(slotMinutes)
    if (isNaN(price) || price < 0) { toast.error('Valor inválido'); return }
    if (!minutes || minutes <= 0 || !Number.isInteger(minutes)) { toast.error('Intervalo inválido'); return }

    setSaving(true)
    try {
      await Promise.all([
        courtsApi.updateCourt(court.id, { pricePerSlot: price, slotMinutes: minutes }),
        courtsApi.updateCourtSchedule(court.id, schedules),
      ])
      toast.success('Configurações salvas')
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configurações — ${court.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Price & interval */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Preço e intervalo</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor por slot (R$)</label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={pricePerSlot}
                  onChange={(e) => setPricePerSlot(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{formatCurrency(Number(pricePerSlot) || 0)} / slot</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duração do slot</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Horários de funcionamento</p>
          {loadingSchedule ? (
            <p className="text-sm text-gray-400 py-4 text-center">Carregando...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {schedules.map((s) => (
                <div key={s.dayOfWeek} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg flex-wrap">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <input
                      type="checkbox"
                      checked={s.active}
                      onChange={(e) => updateSchedule(s.dayOfWeek, 'active', e.target.checked)}
                      className="rounded accent-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{DAY_NAMES[s.dayOfWeek]}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      type="time"
                      value={s.openTime}
                      onChange={(e) => updateSchedule(s.dayOfWeek, 'openTime', e.target.value)}
                      disabled={!s.active}
                      className="w-28 min-w-0"
                    />
                    <span className="text-gray-400 text-sm shrink-0">até</span>
                    <Input
                      type="time"
                      value={s.closeTime}
                      onChange={(e) => updateSchedule(s.dayOfWeek, 'closeTime', e.target.value)}
                      disabled={!s.active}
                      className="w-28 min-w-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
