import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Clock, ChevronLeft, CalendarDays, CheckCircle } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast, { Toaster } from 'react-hot-toast'
import axios from 'axios'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
})

interface PublicCourt {
  id: string
  name: string
  type: string
  pricePerSlot: number
  slotMinutes: number
  imageUrl?: string
  description?: string
}

interface TenantInfo {
  name: string
}

interface AvailabilitySlot {
  startTime: string
  endTime: string
  available: boolean
  price: number
}

type Step = 'courts' | 'date' | 'slots' | 'form' | 'success'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [courts, setCourts] = useState<PublicCourt[]>([])

  const [step, setStep] = useState<Step>('courts')
  const [selectedCourt, setSelectedCourt] = useState<PublicCourt | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    publicApi.get(`/public/booking/${slug}`)
      .then(res => {
        setTenant(res.data.tenant)
        setCourts(res.data.courts)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const loadSlots = useCallback(async () => {
    if (!selectedCourt || !selectedDate || !slug) return
    setSlotsLoading(true)
    try {
      const res = await publicApi.get(`/public/booking/${slug}/availability`, {
        params: { courtId: selectedCourt.id, date: selectedDate },
      })
      setSlots(res.data.slots ?? [])
    } catch {
      toast.error('Erro ao carregar horários')
    } finally {
      setSlotsLoading(false)
    }
  }, [selectedCourt, selectedDate, slug])

  useEffect(() => {
    if (step === 'slots' && selectedCourt && selectedDate) {
      loadSlots()
    }
  }, [step, loadSlots])

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }
    if (!selectedSlot || !selectedCourt || !slug) return
    setSubmitting(true)
    try {
      await publicApi.post(`/public/booking/${slug}`, {
        courtId: selectedCourt.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        customerName: name.trim(),
        customerPhone: phone,
        customerEmail: email.trim() || undefined,
        totalPrice: selectedSlot.price,
      })
      setStep('success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao confirmar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" className="text-orange-500" />
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-500">
        <MapPin size={48} className="text-gray-300" />
        <p className="text-xl font-semibold">Página não encontrada</p>
        <p className="text-sm">Este link de agendamento não existe ou foi desativado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center mx-auto mb-2">
          <CalendarDays size={20} className="text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">{tenant.name}</h1>
        <p className="text-sm text-gray-500">Agendamento online</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Step: Choose court */}
        {step === 'courts' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700">Escolha a quadra</h2>
            {courts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Nenhuma quadra disponível no momento.</p>
            ) : (
              courts.map((court) => (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => { setSelectedCourt(court); setStep('date') }}
                  className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:shadow-md transition-all"
                >
                  {court.imageUrl && (
                    <img src={court.imageUrl} alt={court.name} className="w-full h-32 object-contain rounded-lg mb-3 bg-gray-50" />
                  )}
                  <p className="font-semibold text-gray-900">{court.name}</p>
                  <p className="text-sm text-gray-500">{court.type}</p>
                  {court.pricePerSlot > 0 && (
                    <p className="text-sm font-medium text-orange-600 mt-1">
                      R$ {court.pricePerSlot.toFixed(2)} / {court.slotMinutes} min
                    </p>
                  )}
                  {court.description && (
                    <p className="text-xs text-gray-400 mt-1">{court.description}</p>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Choose date */}
        {step === 'date' && selectedCourt && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep('courts')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit"
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500 mb-0.5">Quadra selecionada</p>
              <p className="font-semibold text-gray-900">{selectedCourt.name}</p>
            </div>

            <h2 className="text-base font-semibold text-gray-700">Escolha a data</h2>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none bg-white"
            />
            <Button onClick={() => { if (selectedDate) setStep('slots') }} disabled={!selectedDate}>
              Ver horários disponíveis
            </Button>
          </div>
        )}

        {/* Step: Choose slot */}
        {step === 'slots' && selectedCourt && selectedDate && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => { setSlots([]); setStep('date') }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit"
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Quadra</p>
                <p className="font-semibold text-gray-900">{selectedCourt.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">Data</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            </div>

            <h2 className="text-base font-semibold text-gray-700">Horários disponíveis</h2>

            {slotsLoading ? (
              <div className="flex justify-center py-8"><Spinner size="lg" className="text-orange-500" /></div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum horário disponível para esta data.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => { setSelectedSlot(slot); setStep('form') }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      slot.available
                        ? 'bg-white border-gray-200 hover:border-orange-400 hover:shadow-sm cursor-pointer'
                        : 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Clock size={12} className="text-orange-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">{slot.startTime} – {slot.endTime}</span>
                    </div>
                    {slot.price > 0 && (
                      <p className="text-xs text-orange-600 font-medium">R$ {slot.price.toFixed(2)}</p>
                    )}
                    {!slot.available && (
                      <p className="text-xs text-red-400">Ocupado</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Fill form */}
        {step === 'form' && selectedCourt && selectedSlot && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep('slots')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit"
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Resumo do agendamento</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Quadra</p>
                  <p className="font-medium text-gray-900">{selectedCourt.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Data</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Horário</p>
                  <p className="font-medium text-gray-900">{selectedSlot.startTime} – {selectedSlot.endTime}</p>
                </div>
                {selectedSlot.price > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs">Valor</p>
                    <p className="font-semibold text-orange-600">R$ {selectedSlot.price.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-base font-semibold text-gray-700">Seus dados</h2>

            <div className="flex flex-col gap-3">
              <Input
                label="Nome completo *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
              <Input
                label="Telefone *"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
              <Input
                label="E-mail (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                type="email"
              />
            </div>

            <Button onClick={handleSubmit} loading={submitting} disabled={!name.trim() || !phone.trim()}>
              Confirmar agendamento
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Agendamento confirmado!</h2>
              <p className="text-gray-500 text-sm">
                Seu horário foi reservado com sucesso. Em breve entraremos em contato para confirmar.
              </p>
            </div>
            {selectedCourt && selectedSlot && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 w-full text-left">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Quadra</p>
                    <p className="font-medium text-gray-900">{selectedCourt.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Data</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Horário</p>
                    <p className="font-medium text-gray-900">{selectedSlot.startTime} – {selectedSlot.endTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Nome</p>
                    <p className="font-medium text-gray-900">{name}</p>
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => { setStep('courts'); setSelectedCourt(null); setSelectedDate(''); setSelectedSlot(null); setName(''); setPhone(''); setEmail('') }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Fazer outro agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
