import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Clock, ChevronLeft, CalendarDays, CheckCircle, Check } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast, { Toaster } from 'react-hot-toast'
import axios from 'axios'
import { formatPhone } from '../../utils/format'

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


function brl(v: number): string {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

// A slot is "past" only when the chosen date is today (in the customer's local
// timezone) and its start time has already elapsed. Uses the browser clock so
// it's correct regardless of the server timezone.
function isSlotPast(dateStr: string, startTime: string): boolean {
  const now = new Date()
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (dateStr !== localToday) return false
  const [h, m] = startTime.split(':').map(Number)
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes()
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [courts, setCourts] = useState<PublicCourt[]>([])

  const [step, setStep] = useState<Step>('courts')
  const [selectedCourt, setSelectedCourt] = useState<PublicCourt | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(0)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)
    setNetworkError(false)
    publicApi.get(`/public/booking/${slug}`)
      .then(res => {
        // If VITE_API_URL is not set the static server returns HTML (200) instead of JSON
        if (!res.data?.tenant) {
          setNetworkError(true)
          return
        }
        setTenant(res.data.tenant)
        setCourts(res.data.courts ?? [])
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setNotFound(true)
        } else {
          setNetworkError(true)
        }
      })
      .finally(() => setLoading(false))
  }, [slug, retryKey])

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

  function toggleTime(startTime: string) {
    setSelectedTimes((prev) =>
      prev.includes(startTime) ? prev.filter((t) => t !== startTime) : [...prev, startTime],
    )
  }

  const chosenSlots = slots.filter((s) => selectedTimes.includes(s.startTime))
  const totalPrice = chosenSlots.reduce((sum, s) => sum + Number(s.price || 0), 0)

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }
    if (chosenSlots.length === 0 || !selectedCourt || !slug) return
    setSubmitting(true)
    try {
      // One booking per selected slot — same behaviour as the internal form
      const results = await Promise.allSettled(
        chosenSlots.map((slot) =>
          publicApi.post(`/public/booking/${slug}`, {
            courtId: selectedCourt.id,
            date: selectedDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            customerName: name.trim(),
            customerPhone: phone,
            customerEmail: email.trim() || undefined,
            totalPrice: slot.price,
          }),
        ),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - ok
      if (ok === 0) {
        toast.error('Não foi possível confirmar os horários. Tente novamente.')
        return
      }
      setConfirmedCount(ok)
      if (failed > 0) toast.error(`${failed} horário(s) não puderam ser reservados`)
      setStep('success')
    } catch {
      toast.error('Erro ao confirmar agendamento')
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

  if (networkError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-500 px-6 text-center">
        <MapPin size={48} className="text-gray-300" />
        <p className="text-xl font-semibold">Erro de conexão</p>
        <p className="text-sm">Não foi possível conectar ao servidor. Tente novamente em instantes.</p>
        <button
          onClick={() => setRetryKey(k => k + 1)}
          className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-500 px-6 text-center">
        <MapPin size={48} className="text-gray-300" />
        <p className="text-xl font-semibold">Página não encontrada</p>
        <p className="text-sm">Este link de agendamento não existe ou foi desativado.</p>
      </div>
    )
  }

  function resetAll() {
    setStep('courts'); setSelectedCourt(null); setSelectedDate(''); setSlots([])
    setSelectedTimes([]); setName(''); setPhone(''); setEmail(''); setConfirmedCount(0)
  }

  const steps: Step[] = ['courts', 'date', 'slots', 'form']
  const stepIndex = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-gray-50 to-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-6 text-center text-white shadow-md">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-2">
          <CalendarDays size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold">{tenant.name}</h1>
        <p className="text-sm text-white/80">Agendamento online</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress steps */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < stepIndex ? 'bg-orange-500 text-white' : i === stepIndex ? 'bg-orange-500 text-white ring-4 ring-orange-200' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i < stepIndex ? <Check size={14} /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < stepIndex ? 'bg-orange-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step: Choose court */}
        {step === 'courts' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-800">Escolha a quadra</h2>
            {courts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Nenhuma quadra disponível no momento.</p>
            ) : (
              courts.map((court) => (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => { setSelectedCourt(court); setStep('date') }}
                  className="bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  {court.imageUrl && (
                    <img src={court.imageUrl} alt={court.name} className="w-full h-36 object-cover rounded-xl mb-3 bg-gray-50" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{court.name}</p>
                      <p className="text-sm text-gray-500">{court.type}</p>
                    </div>
                    {Number(court.pricePerSlot) > 0 && (
                      <span className="shrink-0 bg-orange-50 text-orange-600 text-sm font-bold px-2.5 py-1 rounded-full">
                        {brl(Number(court.pricePerSlot))}
                      </span>
                    )}
                  </div>
                  {court.description && <p className="text-xs text-gray-400 mt-2">{court.description}</p>}
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Choose date */}
        {step === 'date' && selectedCourt && (
          <div className="flex flex-col gap-4">
            <BackButton onClick={() => setStep('courts')} />
            <SummaryChip label="Quadra" value={selectedCourt.name} />
            <h2 className="text-lg font-bold text-gray-800">Escolha a data</h2>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
            />
            <Button onClick={() => { if (selectedDate) { setSelectedTimes([]); setStep('slots') } }} disabled={!selectedDate}>
              Ver horários disponíveis
            </Button>
          </div>
        )}

        {/* Step: Choose slots (multi) */}
        {step === 'slots' && selectedCourt && selectedDate && (
          <div className="flex flex-col gap-4 pb-24">
            <BackButton onClick={() => { setSelectedTimes([]); setStep('date') }} />

            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Quadra</p>
                <p className="font-semibold text-gray-900">{selectedCourt.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-400 uppercase">Data</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Horários</h2>
              <span className="text-xs text-gray-400">Selecione um ou mais</span>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-8"><Spinner size="lg" className="text-orange-500" /></div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum horário disponível para esta data.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot, i) => {
                  const isSelected = selectedTimes.includes(slot.startTime)
                  const isPast = isSlotPast(selectedDate, slot.startTime)
                  const disabled = !slot.available || isPast
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleTime(slot.startTime)}
                      className={`relative p-2.5 rounded-xl border text-center transition-all ${
                        disabled
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-orange-400'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </span>
                      )}
                      <span className="flex items-center justify-center gap-1 text-sm font-semibold">
                        <Clock size={11} /> {slot.startTime}
                      </span>
                      {Number(slot.price) > 0 && !isPast && (
                        <span className={`block text-[11px] font-medium ${isSelected ? 'text-white/90' : 'text-orange-600'}`}>
                          {brl(Number(slot.price))}
                        </span>
                      )}
                      {isPast
                        ? <span className="block text-[10px]">Encerrado</span>
                        : !slot.available && <span className="block text-[10px]">Ocupado</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Sticky summary bar */}
            {selectedTimes.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">{selectedTimes.length} horário(s) · {brl(totalPrice)}</p>
                    <p className="text-sm font-semibold text-gray-900">Total selecionado</p>
                  </div>
                  <Button onClick={() => setStep('form')}>Continuar</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && selectedCourt && chosenSlots.length > 0 && (
          <div className="flex flex-col gap-4">
            <BackButton onClick={() => setStep('slots')} />

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Resumo do agendamento</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Quadra</span><span className="font-medium text-gray-900">{selectedCourt.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Data</span><span className="font-medium text-gray-900">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">Horários</span>
                  <span className="font-medium text-gray-900 text-right">{chosenSlots.map((s) => `${s.startTime}`).join(', ')}</span>
                </div>
                {totalPrice > 0 && (
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
                    <span className="text-gray-500">Total</span>
                    <span className="font-bold text-orange-600">{brl(totalPrice)}</span>
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-800">Seus dados</h2>
            <div className="flex flex-col gap-3">
              <Input label="Nome completo *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              <Input label="Telefone *" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" inputMode="tel" />
              <Input label="E-mail (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" type="email" />
            </div>

            {/* Consentimento LGPD */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-orange-500 shrink-0"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Li e concordo com a{' '}
                <Link to="/privacidade" target="_blank" className="text-orange-600 underline hover:text-orange-700">
                  Política de Privacidade
                </Link>{' '}
                e autorizo o uso dos meus dados para finalizar este agendamento, conforme a LGPD (Lei nº 13.709/2018).
              </span>
            </label>

            <Button onClick={handleSubmit} loading={submitting} disabled={!name.trim() || !phone.trim() || !consentGiven}>
              Confirmar {chosenSlots.length > 1 ? `${chosenSlots.length} horários` : 'agendamento'}
              {totalPrice > 0 ? ` · ${brl(totalPrice)}` : ''}
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {confirmedCount > 1 ? `${confirmedCount} agendamentos confirmados!` : 'Agendamento confirmado!'}
              </h2>
              <p className="text-gray-500 text-sm">
                Seu horário foi reservado com sucesso. Em breve entraremos em contato para confirmar.
              </p>
            </div>
            {selectedCourt && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 w-full text-left">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Quadra</span><span className="font-medium text-gray-900">{selectedCourt.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Data</span><span className="font-medium text-gray-900">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 shrink-0">Horários</span><span className="font-medium text-gray-900 text-right">{chosenSlots.map((s) => s.startTime).join(', ')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Nome</span><span className="font-medium text-gray-900">{name}</span></div>
                </div>
              </div>
            )}
            <button type="button" onClick={resetAll} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Fazer outro agendamento
            </button>
          </div>
        )}
      </div>

      {/* Footer LGPD */}
      <div className="border-t border-gray-100 mt-8 py-5 text-center space-y-1">
        <p className="text-xs text-gray-400">Powered by <span className="font-semibold text-gray-500">MT Quadras</span> · May Tecnologia</p>
        <p className="text-xs text-gray-300 space-x-2">
          <Link to="/privacidade" className="hover:text-gray-500 underline transition-colors">Política de Privacidade</Link>
          <span>·</span>
          <Link to="/termos" className="hover:text-gray-500 underline transition-colors">Termos de Uso</Link>
        </p>
      </div>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit">
      <ChevronLeft size={16} /> Voltar
    </button>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-400 uppercase mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}
