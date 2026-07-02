import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, CalendarDays, Clock, MapPin, Loader2 } from 'lucide-react'
import axios from 'axios'
import { Spinner } from '../../components/ui/Spinner'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
})

interface PresenceInfo {
  customerName: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  status: string
  confirmed: boolean
}

type Result = 'confirmed' | 'no_show' | null

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function ConfirmPresencePage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<PresenceInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState<'yes' | 'no' | null>(null)
  const [result, setResult] = useState<Result>(null)

  const load = useCallback(async () => {
    try {
      const res = await publicApi.get<PresenceInfo>(`/public/presence/${id}`)
      setInfo(res.data)
      // Estado já definido anteriormente
      if (res.data.status === 'NO_SHOW') setResult('no_show')
      else if (res.data.confirmed) setResult('confirmed')
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function respond(confirm: boolean) {
    setSubmitting(confirm ? 'yes' : 'no')
    try {
      const res = await publicApi.post<{ result: Result }>(`/public/presence/${id}`, { confirm })
      setResult(res.data.result)
    } catch {
      setResult(null)
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-6 text-center">
          <p className="text-white font-bold text-xl tracking-tight">ArenaHub</p>
          <p className="text-white/80 text-sm mt-0.5">Confirmação de presença</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" className="text-orange-500" /></div>
          ) : notFound ? (
            <div className="text-center py-8">
              <XCircle size={44} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-700 font-medium">Agendamento não encontrado</p>
              <p className="text-sm text-gray-400 mt-1">O link pode ter expirado ou o agendamento foi removido.</p>
            </div>
          ) : (
            <>
              {/* Detalhes */}
              <div className="mb-5">
                <p className="text-gray-500 text-sm">Olá, <span className="font-semibold text-gray-800">{info?.customerName}</span>!</p>
                <div className="mt-4 flex flex-col gap-2.5 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin size={15} className="text-orange-500 shrink-0" /> {info?.courtName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CalendarDays size={15} className="text-orange-500 shrink-0" /> {info && formatDate(info.date)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock size={15} className="text-orange-500 shrink-0" /> {info?.startTime} às {info?.endTime}
                  </div>
                </div>
              </div>

              {/* Resultado ou botões */}
              {result === 'confirmed' ? (
                <div className="text-center py-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
                  <p className="text-green-800 font-semibold">Presença confirmada!</p>
                  <p className="text-sm text-green-600 mt-1">Te esperamos no horário. Até lá! 👋</p>
                </div>
              ) : result === 'no_show' ? (
                <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <XCircle size={40} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-700 font-semibold">Agendamento cancelado</p>
                  <p className="text-sm text-gray-500 mt-1">Tudo bem! O horário foi liberado. Esperamos você numa próxima. 🙌</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-center text-sm text-gray-600 mb-1">Você vai comparecer?</p>
                  <button
                    onClick={() => respond(true)}
                    disabled={submitting !== null}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                  >
                    {submitting === 'yes' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Sim, vou comparecer
                  </button>
                  <button
                    onClick={() => respond(false)}
                    disabled={submitting !== null}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-red-50 border border-red-200 text-red-600 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting === 'no' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                    Não poderei ir
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 py-3 text-center">
          <p className="text-xs text-gray-400">Powered by <span className="font-semibold text-gray-500">ArenaHub</span></p>
        </div>
      </div>
    </div>
  )
}
