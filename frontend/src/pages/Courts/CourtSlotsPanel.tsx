import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, RefreshCw, X, Phone, User } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { DatePicker } from '../../components/ui/DatePicker'
import type { Court, AvailabilitySlot, SlotBookingInfo } from '../../types/court'
import * as courtsApi from '../../api/courts.api'
import { toInputDate } from '../../utils/date'
import { formatCurrency } from '../../utils/format'

interface CourtSlotsPanelProps {
  court: Court
  onBookSlot?: (court: Court, date: string, slot: AvailabilitySlot) => void
}

export function CourtSlotsPanel({ court, onBookSlot }: CourtSlotsPanelProps) {
  const [open, setOpen] = useState(true)
  const [date, setDate] = useState(toInputDate(new Date()))
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(false)
  const [quickLoading, setQuickLoading] = useState(false)
  const [closed, setClosed] = useState(false)

  const [quickAvailable, setQuickAvailable] = useState<number | null>(null)
  const [quickTotal, setQuickTotal] = useState<number | null>(null)

  const [popup, setPopup] = useState<{ booking: SlotBookingInfo; slot: AvailabilitySlot } | null>(null)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popup) return
    function handler(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popup])

  // Quick badge only fetched separately when the panel starts collapsed.
  // When open (default), counts are derived from the loaded slots — avoids a
  // duplicate availability request per court card.
  useEffect(() => {
    if (open) return
    const today = toInputDate(new Date())
    setQuickLoading(true)
    courtsApi
      .getCourtAvailability(court.id, today)
      .then((av) => {
        if (!av.available) {
          setQuickAvailable(0)
          setQuickTotal(0)
        } else {
          const s = av.slots ?? []
          setQuickAvailable(s.filter((sl) => sl.available).length)
          setQuickTotal(s.length)
        }
      })
      .catch(() => {})
      .finally(() => setQuickLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court.id])

  useEffect(() => {
    if (!open || !date) return
    loadSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date])

  async function loadSlots() {
    setLoading(true)
    setClosed(false)
    setPopup(null)
    try {
      const av = await courtsApi.getCourtAvailability(court.id, date)
      if (!av.available) {
        setClosed(true)
        setSlots([])
        setQuickAvailable(0)
        setQuickTotal(0)
      } else {
        const s = av.slots ?? []
        setSlots(s)
        // Keep the collapsed badge in sync without a second request
        if (date === toInputDate(new Date())) {
          setQuickAvailable(s.filter((sl) => sl.available).length)
          setQuickTotal(s.length)
        }
      }
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  function handleSlotClick(slot: AvailabilitySlot, e: React.MouseEvent<HTMLButtonElement>) {
    if (slot.available) {
      onBookSlot?.(court, date, slot)
      return
    }
    if (!slot.booking) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: Math.max(8, rect.left + rect.width / 2 - 120),
      zIndex: 9999,
    })
    setPopup({ booking: slot.booking, slot })
  }

  const available = slots.filter((s) => s.available).length
  const total = slots.length

  const quickBadge = () => {
    if (quickLoading) return <Spinner size="sm" className="text-gray-400" />
    if (quickAvailable === null || quickTotal === null) return null
    if (quickTotal === 0) return <span className="text-xs text-gray-400">Fechada hoje</span>
    if (quickAvailable === 0)
      return <span className="text-xs font-semibold text-red-500">Lotada hoje</span>
    return (
      <span className="text-xs font-semibold text-green-600">
        {quickAvailable}/{quickTotal} livres hoje
      </span>
    )
  }

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="font-medium">Horários disponíveis</span>
        <div className="flex items-center gap-2">
          {!open && quickBadge()}
          {open && !loading && !closed && total > 0 && (
            <span className={`text-xs font-semibold ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {available}/{total} livres
            </span>
          )}
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <DatePicker
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={toInputDate(new Date())}
              className="flex-1 text-xs py-1.5"
            />
            <button
              onClick={loadSlots}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <p className="text-xs text-gray-400">
            {court.slotMinutes} min por slot · {formatCurrency(Number(court.pricePerSlot))} / slot
          </p>

          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" className="text-orange-500" />
            </div>
          ) : closed ? (
            <p className="text-xs text-center text-gray-400 py-3 bg-gray-50 rounded-lg">
              Quadra fechada neste dia
            </p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-center text-gray-400 py-3 bg-gray-50 rounded-lg">
              Nenhum horário configurado
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {slots.map((slot) => {
                const isRented = !slot.available && !!(slot as { rental?: { clientName: string } }).rental
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={(e) => handleSlotClick(slot, e)}
                    title={isRented ? `Alugado: ${(slot as { rental?: { clientName: string } }).rental?.clientName}` : undefined}
                    className={`rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                      slot.available
                        ? 'bg-green-50 text-green-700 border border-green-200 cursor-pointer hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700'
                        : isRented
                          ? 'bg-blue-50 text-blue-600 border border-blue-200 cursor-default'
                          : 'bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:bg-red-100 line-through'
                    }`}
                  >
                    {slot.startTime}
                  </button>
                )
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            {slots.some((s) => s.available) ? 'Verde: disponível · ' : ''}
            {slots.some((s) => !s.available && !(s as {rental?:unknown}).rental && s.booking) ? 'Vermelho: agendado · ' : ''}
            {slots.some((s) => !s.available && !!(s as {rental?:{clientName:string}}).rental) ? 'Azul: alugado' : ''}
          </p>
        </div>
      )}

      {popup && (
        <div
          ref={popupRef}
          style={popupStyle}
          className="w-60 bg-white rounded-xl border border-gray-200 shadow-xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {popup.slot.startTime} – {popup.slot.endTime}
            </p>
            <button
              onClick={() => setPopup(null)}
              className="p-0.5 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <User size={13} className="text-orange-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{popup.booking.customerName}</p>
            </div>

            <a
              href={`tel:${popup.booking.customerPhone}`}
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={13} />
              {popup.booking.customerPhone}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
