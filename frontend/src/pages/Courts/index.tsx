import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { CourtSlotsPanel } from './CourtSlotsPanel'
import { CourtOccupancyBanner } from './CourtOccupancyBanner'
import { BookingForm } from '../Bookings/BookingForm'
import type { Court, AvailabilitySlot } from '../../types/court'
import * as courtsApi from '../../api/courts.api'

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingPreSelect, setBookingPreSelect] = useState<{ courtId: string; date: string; startTime: string } | undefined>()
  const [slotsRefreshKey, setSlotsRefreshKey] = useState(0)

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
        </div>

        {!loading && visibleCourts.length > 0 && (
          <p className="text-xs text-gray-400">{visibleCourts.length} quadra{visibleCourts.length !== 1 ? 's' : ''}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-orange-500" />
          </div>
        ) : visibleCourts.length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} />}
            title={search ? 'Nenhuma quadra encontrada' : 'Nenhuma quadra ativa'}
            description="Crie ou ative quadras em Configurações → Quadras"
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
                <CourtSlotsPanel court={court} onBookSlot={handleBookSlot} refreshKey={slotsRefreshKey} />
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingForm
        open={bookingFormOpen}
        onClose={() => { setBookingFormOpen(false); setSlotsRefreshKey((k) => k + 1) }}
        onSuccess={() => { setBookingFormOpen(false); setSlotsRefreshKey((k) => k + 1) }}
        courts={courts}
        preSelect={bookingPreSelect}
      />
    </Layout>
  )
}
