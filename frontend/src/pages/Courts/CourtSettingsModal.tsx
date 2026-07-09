import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Info } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Court } from '../../types/court'
import * as courtsApi from '../../api/courts.api'
import { formatCurrency } from '../../utils/format'

interface CourtSettingsModalProps {
  open: boolean
  onClose: () => void
  court: Court
  onSuccess: () => void
}

export function CourtSettingsModal({ open, onClose, court, onSuccess }: CourtSettingsModalProps) {
  const [pricePerSlot, setPricePerSlot] = useState(String(Number(court.pricePerSlot)))
  const [slotMinutes, setSlotMinutes] = useState(String(court.slotMinutes))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPricePerSlot(String(Number(court.pricePerSlot)))
    setSlotMinutes(String(court.slotMinutes))
  }, [open, court.pricePerSlot, court.slotMinutes])

  async function handleSave() {
    const price = Number(pricePerSlot)
    const minutes = Number(slotMinutes)
    if (isNaN(price) || price < 0) { toast.error('Valor inválido'); return }
    if (!minutes || minutes <= 0 || !Number.isInteger(minutes)) { toast.error('Intervalo inválido'); return }

    setSaving(true)
    try {
      await courtsApi.updateCourt(court.id, { pricePerSlot: price, slotMinutes: minutes })
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
      size="md"
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
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Preço e intervalo</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Valor por slot (R$)</label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400 dark:text-gray-500">R$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={pricePerSlot}
                  onChange={(e) => setPricePerSlot(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800 outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatCurrency(Number(pricePerSlot) || 0)} / slot</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Duração do slot</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-800 outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
                />
                <span className="text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horário agora é do estabelecimento */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
          <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            O horário de funcionamento agora é definido em <strong>Configurações → Estabelecimento</strong> e vale para todas as quadras.
          </p>
        </div>
      </div>
    </Modal>
  )
}
