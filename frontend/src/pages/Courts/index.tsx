import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Settings2, PowerOff, Power, MapPin, Search } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { CourtForm } from './CourtForm'
import { CourtSettingsModal } from './CourtSettingsModal'
import { CourtSlotsPanel } from './CourtSlotsPanel'
import { CourtOccupancyBanner } from './CourtOccupancyBanner'
import { BookingForm } from '../Bookings/BookingForm'
import type { Court, AvailabilitySlot } from '../../types/court'
import * as courtsApi from '../../api/courts.api'

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [selected, setSelected] = useState<Court | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingPreSelect, setBookingPreSelect] = useState<{ courtId: string; date: string; startTime: string } | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterActive === 'all' ? {} : { active: filterActive === 'active' }
      const data = await courtsApi.listCourts(params)
      setCourts(data)
    } finally {
      setLoading(false)
    }
  }, [filterActive])

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

  return (
    <Layout title="Quadras">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterActive === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
              </button>
            ))}
          </div>
          <Button onClick={() => { setSelected(null); setFormOpen(true) }}>
            <Plus size={16} /> Nova Quadra
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar quadra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-orange-500" />
          </div>
        ) : courts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} />}
            title="Nenhuma quadra cadastrada"
            description="Adicione a primeira quadra para começar"
            action={{ label: 'Nova Quadra', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map((court) => (
              <div
                key={court.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-lg">{court.name}</h3>
                  <Badge
                    label={court.active ? 'Ativa' : 'Inativa'}
                    status={court.active ? 'active' : 'inactive'}
                  />
                </div>

                {court.active && <CourtOccupancyBanner courtId={court.id} />}
                {court.active && <CourtSlotsPanel court={court} onBookSlot={handleBookSlot} />}

                <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setSelected(court); setFormOpen(true) }}
                  >
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setSelected(court); setSettingsOpen(true) }}
                    title="Configurações da quadra"
                  >
                    <Settings2 size={14} /> Configurar
                  </Button>
                  {court.active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelected(court); setDeactivateOpen(true) }}
                      title="Desativar quadra"
                    >
                      <PowerOff size={14} className="text-red-500" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleActivate(court)}
                      loading={activating === court.id}
                      title="Ativar quadra"
                    >
                      <Power size={14} className="text-green-600" />
                      <span className="text-green-600 text-xs font-medium">Ativar</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
