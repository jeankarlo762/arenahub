import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Court, Schedule } from '../../types/court'
import * as courtsApi from '../../api/courts.api'
import { DAY_NAMES } from '../../utils/date'

interface CourtScheduleProps {
  open: boolean
  onClose: () => void
  court: Court
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

export function CourtSchedule({ open, onClose, court }: CourtScheduleProps) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>(defaultSchedules())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    courtsApi.getCourtSchedule(court.id)
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
      .finally(() => setLoading(false))
  }, [open, court.id])

  function update<K extends keyof ScheduleRow>(day: number, key: K, value: ScheduleRow[K]) {
    setSchedules((prev) => prev.map((s) => (s.dayOfWeek === day ? { ...s, [key]: value } : s)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await courtsApi.updateCourtSchedule(court.id, schedules)
      toast.success('Horários atualizados')
      onClose()
    } catch {
      toast.error('Erro ao salvar horários')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Horários — ${court.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((s) => (
            <div
              key={s.dayOfWeek}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2 w-28 shrink-0">
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={(e) => update(s.dayOfWeek, 'active', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">{DAY_NAMES[s.dayOfWeek]}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={s.openTime}
                  onChange={(e) => update(s.dayOfWeek, 'openTime', e.target.value)}
                  disabled={!s.active}
                  className="w-32"
                />
                <span className="text-gray-400 text-sm">até</span>
                <Input
                  type="time"
                  value={s.closeTime}
                  onChange={(e) => update(s.dayOfWeek, 'closeTime', e.target.value)}
                  disabled={!s.active}
                  className="w-32"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
