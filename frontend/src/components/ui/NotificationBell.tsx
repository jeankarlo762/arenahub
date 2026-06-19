import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import * as bookingsApi from '../../api/bookings.api'
import type { Booking } from '../../types/booking'
import { formatDate } from '../../utils/date'

const STORAGE_KEY = 'notif_last_seen'

export function NotificationBell() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString())
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await bookingsApi.getNotifications()
      setBookings(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  // Marca tudo como visto — só é chamado ao FECHAR o dropdown, para que as
  // notificações não-vistas continuem destacadas enquanto o painel está aberto.
  const markSeen = useCallback(() => {
    const now = new Date().toISOString()
    setLastSeen(now)
    localStorage.setItem(STORAGE_KEY, now)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen((wasOpen) => {
          if (wasOpen) markSeen()
          return false
        })
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [markSeen])

  const unread = bookings.filter((b) => new Date(b.createdAt) > new Date(lastSeen)).length

  function handleOpen() {
    setOpen((v) => {
      if (v) markSeen() // estava aberto → fechando: marca como visto
      return !v
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Novos agendamentos</p>
              <p className="text-xs text-gray-400">Últimas 24 horas</p>
            </div>
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full whitespace-nowrap">
                {unread} {unread === 1 ? 'nova' : 'novas'}
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento recente</p>
            ) : (
              bookings.map((b) => {
                const isNew = new Date(b.createdAt) > new Date(lastSeen)
                return (
                  <div key={b.id} className={`px-4 py-3 flex gap-3 items-start ${isNew ? 'bg-orange-50' : ''}`}>
                    {isNew && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.customerName}</p>
                      <p className="text-xs text-gray-500">{b.court?.name} · {formatDate(b.date)} {b.startTime}–{b.endTime}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
