import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import type { Booking } from '../../types/booking'
import type { Court } from '../../types/court'
import * as bookingsApi from '../../api/bookings.api'
import { toInputDate } from '../../utils/date'

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 60   // px per hour
const START_HOUR = 7
const END_HOUR = 23
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT

const DAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const COURT_COLORS = [
  { bg: '#FEF9EA', border: '#F2B705', text: '#7a5b02' },  // amarelo
  { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },  // blue
  { bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },  // green
  { bg: '#faf5ff', border: '#a855f7', text: '#581c87' },  // purple
  { bg: '#fdf2f8', border: '#ec4899', text: '#831843' },  // pink
  { bg: '#fefce8', border: '#eab308', text: '#713f12' },  // yellow
]

const COURT_COLORS_DARK = [
  { bg: 'rgba(242,183,5,0.15)', border: '#F2B705', text: '#F4C918' },  // amarelo
  { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#60a5fa' },  // blue
  { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#4ade80' },   // green
  { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', text: '#c084fc' },  // purple
  { bg: 'rgba(236,72,153,0.15)', border: '#ec4899', text: '#f472b6' },  // pink
  { bg: 'rgba(234,179,8,0.15)', border: '#eab308', text: '#facc15' },   // yellow
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function doOverlap(a: Booking, b: Booking): boolean {
  return (
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(a.endTime) > timeToMinutes(b.startTime)
  )
}

// Assign column lanes to avoid visual overlap
function layoutDay(bookings: Booking[]): { booking: Booking; col: number; cols: number }[] {
  const sorted = [...bookings].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )
  const lanes: Booking[][] = []
  const assigned: { booking: Booking; col: number }[] = []

  for (const b of sorted) {
    let col = 0
    while (lanes[col]?.some((lb) => doOverlap(lb, b))) col++
    if (!lanes[col]) lanes[col] = []
    lanes[col].push(b)
    assigned.push({ booking: b, col })
  }

  return assigned.map(({ booking, col }) => {
    const maxCols = assigned
      .filter(({ booking: b2 }) => doOverlap(booking, b2))
      .reduce((m, { col: c }) => Math.max(m, c + 1), 1)
    return { booking, col, cols: maxCols }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  courts: Court[]
  onBookingClick: (booking: Booking) => void
}

export function BookingsCalendar({ courts, onBookingClick }: Props) {
  const [monday, setMonday] = useState(() => getMonday(new Date()))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setIsDark(document.documentElement.classList.contains('dark') || mq.matches)
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    mq.addEventListener('change', update)
    return () => { observer.disconnect(); mq.removeEventListener('change', update) }
  }, [])

  const courtColorMap = useMemo(
    () => new Map(courts.map((c, i) => [
      c.id,
      {
        light: COURT_COLORS[i % COURT_COLORS.length],
        dark: COURT_COLORS_DARK[i % COURT_COLORS_DARK.length],
      },
    ])),
    [courts],
  )

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const todayStr = toInputDate(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await bookingsApi.listBookings({
        startDate: toInputDate(monday),
        endDate: toInputDate(addDays(monday, 6)),
      })
      setBookings(data)
    } finally {
      setLoading(false)
    }
  }, [monday])

  useEffect(() => { load() }, [load])

  function bookingsForDay(day: Date): Booking[] {
    const key = toInputDate(day)
    return bookings.filter((b) => {
      // b.date is an ISO string; just compare the date portion
      const bDate = b.date.slice(0, 10)
      return bDate === key
    })
  }

  const weekLabel = `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-wrap">
        <button
          onClick={() => setMonday(getMonday(new Date()))}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Hoje
        </button>
        <div className="flex items-center">
          <button
            onClick={() => setMonday((m) => addDays(m, -7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setMonday((m) => addDays(m, 7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{weekLabel}</span>
        {loading && <Spinner size="sm" className="text-orange-500 ml-1" />}

        {/* Court legend */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {courts.map((court) => {
            const colorSet = courtColorMap.get(court.id)
            const borderColor = colorSet?.light.border
            return (
              <div key={court.id} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: borderColor }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{court.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="overflow-auto">
        <div className="min-w-[640px]">

          {/* Day headers */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-20">
            {/* Gutter */}
            <div className="w-14 shrink-0 border-r border-gray-100 dark:border-gray-800" />
            {days.map((day, i) => {
              const isToday = toInputDate(day) === todayStr
              return (
                <div
                  key={i}
                  className={`flex-1 py-2 text-center border-r border-gray-100 dark:border-gray-800 last:border-0 ${isToday ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                >
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">{DAY_NAMES_SHORT[i]}</p>
                  <p
                    className={`text-xl font-bold leading-tight mt-0.5 mx-auto w-9 h-9 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-orange-500 text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Time + day body */}
          <div className="flex" style={{ height: TOTAL_HEIGHT }}>

            {/* Hour labels gutter */}
            <div className="w-14 shrink-0 border-r border-gray-100 dark:border-gray-800 relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 8 }}
                >
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-none">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, di) => {
              const isToday = toInputDate(day) === todayStr
              const laid = layoutDay(bookingsForDay(day))

              return (
                <div
                  key={di}
                  className={`flex-1 relative border-r border-gray-100 dark:border-gray-800 last:border-0 ${isToday ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                >
                  {/* Hour dividers */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}
                  {/* Half-hour dividers */}
                  {HOURS.map((hour) => (
                    <div
                      key={`h-${hour}`}
                      className="absolute left-0 right-0 border-t border-dashed border-gray-100 dark:border-gray-800"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Bookings */}
                  {laid.map(({ booking, col, cols }) => {
                    const startMin = timeToMinutes(booking.startTime)
                    const endMin = timeToMinutes(booking.endTime)
                    const top = Math.max(0, (startMin - START_HOUR * 60) / 60 * HOUR_HEIGHT) + 1
                    const height = Math.max((endMin - startMin) / 60 * HOUR_HEIGHT - 2, 20)
                    const left = `calc(${(col / cols) * 100}% + 2px)`
                    const width = `calc(${100 / cols}% - 4px)`
                    const colorSet = courtColorMap.get(booking.courtId)
                    const color = isDark
                      ? (colorSet?.dark ?? COURT_COLORS_DARK[0])
                      : (colorSet?.light ?? COURT_COLORS[0])
                    const isShort = height < 38

                    return (
                      <button
                        key={booking.id}
                        onClick={() => onBookingClick(booking)}
                        className="absolute rounded-md overflow-hidden text-left transition-opacity hover:opacity-80 focus:outline-none"
                        style={{
                          top,
                          height,
                          left,
                          width,
                          backgroundColor: color.bg,
                          borderLeft: `3px solid ${color.border}`,
                        }}
                      >
                        <div className="px-1.5 py-0.5 h-full flex flex-col justify-center">
                          <p
                            className="text-[11px] font-semibold leading-tight truncate"
                            style={{ color: color.text }}
                          >
                            {isShort
                              ? `${booking.startTime} ${booking.customerName}`
                              : booking.customerName}
                          </p>
                          {!isShort && (
                            <p
                              className="text-[10px] leading-tight truncate opacity-80"
                              style={{ color: color.text }}
                            >
                              {booking.startTime}–{booking.endTime} · {booking.court?.name ?? '—'}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}