import { useState, useEffect, useCallback } from 'react'
import { Clock, User } from 'lucide-react'
import api from '../../api/axios'

interface CurrentBooking {
  id: string
  customerName: string
  startTime: string
  endTime: string
}

interface CourtOccupancyBannerProps {
  courtId: string
}

function timeToSeconds(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 3600 + m * 60
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

export function CourtOccupancyBanner({ courtId }: CourtOccupancyBannerProps) {
  const [booking, setBooking] = useState<CurrentBooking | null>(null)
  const [remaining, setRemaining] = useState(0)

  const fetchBooking = useCallback(async () => {
    try {
      const res = await api.get<{ booking: CurrentBooking | null }>(`/courts/${courtId}/current-booking`)
      setBooking(res.data.booking)
      if (res.data.booking) {
        const now = new Date()
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
        const endSec = timeToSeconds(res.data.booking.endTime)
        setRemaining(Math.max(0, endSec - nowSec))
      }
    } catch {
      setBooking(null)
    }
  }, [courtId])

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchBooking()
    const pollId = setInterval(fetchBooking, 60_000)
    return () => clearInterval(pollId)
  }, [fetchBooking])

  // Countdown tick every second
  useEffect(() => {
    if (!booking) return
    const tickId = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Rebuscar para ver se ainda está ocupada
          fetchBooking()
          return 0
        }
        return prev - 1
      })
    }, 1_000)
    return () => clearInterval(tickId)
  }, [booking, fetchBooking])

  if (!booking) return null

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold uppercase tracking-wide mb-0.5">
          <span>Ocupada agora</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-sm text-gray-800 font-medium">
            <User size={13} className="text-gray-500" />
            <span className="truncate">{booking.customerName}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-red-600 font-semibold tabular-nums">
            <Clock size={13} />
            <span>{formatCountdown(remaining)} restante</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-400 shrink-0">
        {booking.startTime} – {booking.endTime}
      </div>
    </div>
  )
}
