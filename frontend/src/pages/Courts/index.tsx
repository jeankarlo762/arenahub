import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Settings2, MapPin, Search } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { CourtForm } from './CourtForm'
import { CourtSettingsModal } from './CourtSettingsModal'
import { CourtManageModal } from './CourtManageModal'
import { CourtSlotsPanel } from './CourtSlotsPanel'
import { CourtOccupancyBanner } from './CourtOccupancyBanner'
import { BookingForm } from '../Bookings/BookingForm'
import type { Court, AvailabilitySlot } from '../../types/court'
import * as courtsApi from '../../api/courts.api'

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [manageOpen, setManageOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [selected, setSelected] = useState<Court | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingPreSelect, setBookingPreSelect] = useState<{ courtId: string; date: string; startTime: string } | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await courtsApi.listCourts()
      setCourts(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleBookSlot(court: Court, date: string, slot: AvailabilitySlot) {
    setBookingPreSelect({ courtId: court.id, date, startTime: slot.startTime })
    setBookingFormOpen(true)
  }

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

  const visibleCourts = courts.filter((c) => c.active && (!search || c.name.toLowerCase().includes(search.toLowerCase())))

  return (
    <Layout title="Quadras">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar quadra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
            />
          </div>
          <Button variant="secondary" onClick={() => setManageOpen(true)}>
            <Settings2 size={16} /> Configurar Quadras
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-orange-500" />
          </div>
        ) : visibleCourts.length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} />}
            title={search ? 'Nenhuma quadra encontrada' : 'Nenhuma quadra ativa'}
            description="Use “Configurar Quadras” para criar ou ativar uma quadra"
            action={{ label: 'Configurar Quadras', onClick: () => setManageOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleCourts.map((court) => (
              <div
                key={court.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-lg">{court.name}</h3>
                  <Badge label="Ativa" status="active" />
                </div>

                <CourtOccupancyBanner courtId={court.id} />
                <CourtSlotsPanel court={court} onBookSlot={handleBookSlot} />
              </div>
            ))}
          </div>
        )}
      </div>

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

      <BookingForm
        open={bookingFormOpen}
        onClose={() => setBookingFormOpen(false)}
        onSuccess={() => { setBookingFormOpen(false); load() }}
        courts={courts}
        preSelect={bookingPreSelect}
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
    </Layout>
  )
}
