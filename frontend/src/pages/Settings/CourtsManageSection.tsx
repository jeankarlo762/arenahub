import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Settings2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CourtForm } from '../Courts/CourtForm'
import { CourtSettingsModal } from '../Courts/CourtSettingsModal'
import { CourtManageModal } from '../Courts/CourtManageModal'
import type { Court } from '../../types/court'
import * as courtsApi from '../../api/courts.api'

/**
 * Full court management (create, edit, schedules, activate/deactivate).
 * Lives in Configurações — the Quadras page is now operational-only.
 */
export function CourtsManageSection() {
  const [courts, setCourts] = useState<Court[]>([])
  const [manageOpen, setManageOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [selected, setSelected] = useState<Court | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setCourts(await courtsApi.listCourts())
    } catch {
      toast.error('Erro ao carregar quadras')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleActivate(court: Court) {
    setActivating(court.id)
    try {
      await courtsApi.activateCourt(court.id)
      toast.success(`${court.name} ativada`)
      load()
    } catch {
      toast.error('Erro ao ativar quadra')
    } finally {
      setActivating(null)
    }
  }

  async function handleDeactivate() {
    if (!selected) return
    setDeactivating(true)
    try {
      await courtsApi.deactivateCourt(selected.id)
      toast.success('Quadra desativada')
      setDeactivateOpen(false)
      load()
    } catch {
      toast.error('Erro ao desativar')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">Gerenciar quadras</p>
        <p className="text-xs text-gray-500 mt-0.5">Crie, edite, configure horários e ative/desative suas quadras.</p>
      </div>
      <Button variant="secondary" onClick={() => setManageOpen(true)}>
        <Settings2 size={16} /> Configurar Quadras
      </Button>

      <CourtManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        courts={courts}
        activatingId={activating}
        onNew={() => { setSelected(null); setFormOpen(true) }}
        onEdit={(court) => { setSelected(court); setFormOpen(true) }}
        onConfigure={(court) => { setSelected(court); setSettingsOpen(true) }}
        onActivate={handleActivate}
        onDeactivate={(court) => { setSelected(court); setDeactivateOpen(true) }}
      />

      <CourtForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        court={selected ?? undefined}
      />

      {selected && (
        <CourtSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          court={selected}
          onSuccess={load}
        />
      )}

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Desativar quadra"
        message={`Deseja desativar "${selected?.name}"? Agendamentos existentes não serão cancelados.`}
        confirmLabel="Desativar"
        loading={deactivating}
      />
    </div>
  )
}
