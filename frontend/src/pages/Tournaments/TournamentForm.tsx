import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Download, RefreshCw, Sparkles, Copy, Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { DatePicker } from '../../components/ui/DatePicker'
import { useBrandingStore } from '../../store/branding.store'
import { generateTournamentImage } from '../../utils/generateTournamentImage'
import { generateTournamentConcept, type TournamentConcept } from '../../api/ai.api'
import type { Tournament } from '../../types/tournament'
import type { Court } from '../../types/court'
import * as tournamentsApi from '../../api/tournaments.api'
import * as courtsApi from '../../api/courts.api'

const MATCH_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Individual', description: 'Cada participante compete individualmente' },
  { value: 'DOUBLES', label: 'Duplas', description: 'Pares de dois jogadores' },
  { value: 'TEAM', label: 'Equipes', description: 'Times com múltiplos jogadores' },
] as const

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  sport: z.string().min(1, 'Esporte obrigatório'),
  startDate: z.string().min(1, 'Data início obrigatória'),
  endDate: z.string().min(1, 'Data fim obrigatória'),
  matchType: z.enum(['INDIVIDUAL', 'DOUBLES', 'TEAM']),
  maxTeams: z.coerce.number().int().positive('Mínimo 1'),
  courtId: z.string().optional().nullable(),
  description: z.string().optional(),
  prizeInfo: z.string().optional(),
  pointsFirst: z.coerce.number().int().min(0).default(3),
  pointsSecond: z.coerce.number().int().min(0).default(2),
  pointsThird: z.coerce.number().int().min(0).default(1),
})

type FormData = z.infer<typeof schema>

interface TournamentFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  tournament?: Tournament
}

export function TournamentForm({ open, onClose, onSuccess, tournament }: TournamentFormProps) {
  const isEdit = !!tournament
  const [courts, setCourts] = useState<Court[]>([])
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [concept, setConcept] = useState<TournamentConcept | null>(null)
  const [generatingConcept, setGeneratingConcept] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const branding = useBrandingStore()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { matchType: 'TEAM', courtId: null },
  })

  const matchType = watch('matchType')
  const selectedCourtId = watch('courtId')
  const watchedName = watch('name')
  const watchedSport = watch('sport')
  const watchedStartDate = watch('startDate')
  const watchedEndDate = watch('endDate')
  const watchedMaxTeams = watch('maxTeams')
  const watchedPrizeInfo = watch('prizeInfo')
  const watchedDescription = watch('description')

  useEffect(() => {
    courtsApi.listCourts({ active: true }).then(setCourts).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      setGeneratedImage('')
      setConcept(null)
      reset(
        tournament
          ? {
              name: tournament.name,
              sport: tournament.sport,
              startDate: tournament.startDate.slice(0, 10),
              endDate: tournament.endDate.slice(0, 10),
              matchType: tournament.matchType ?? 'TEAM',
              maxTeams: tournament.maxTeams,
              courtId: tournament.courtId ?? null,
              description: tournament.description ?? '',
              prizeInfo: tournament.prizeInfo ?? '',
              pointsFirst: (tournament as any).pointsFirst ?? 3,
              pointsSecond: (tournament as any).pointsSecond ?? 2,
              pointsThird: (tournament as any).pointsThird ?? 1,
            }
          : { name: '', sport: '', startDate: '', endDate: '', matchType: 'TEAM', maxTeams: 8, courtId: null, description: '', prizeInfo: '', pointsFirst: 3, pointsSecond: 2, pointsThird: 1 },
      )
    }
  }, [open, tournament, reset])

  // Debounce auto-generation when key fields change
  useEffect(() => {
    if (!open || !watchedName || !watchedSport) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { triggerAll() }, 1000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName, watchedSport, watchedStartDate, watchedEndDate, watchedMaxTeams, watchedPrizeInfo, matchType])

  async function triggerAll() {
    const values = {
      name: watchedName,
      sport: watchedSport,
      startDate: watchedStartDate || '',
      endDate: watchedEndDate || '',
      maxTeams: watchedMaxTeams || 8,
      matchType: matchType || 'TEAM',
      prizeInfo: watchedPrizeInfo || '',
      description: watchedDescription || '',
    }
    if (!values.name || !values.sport) return

    // Run AI concept + image generation in parallel
    setGeneratingConcept(true)
    setGeneratingImage(true)

    let freshConcept: TournamentConcept | null = null

    const [conceptResult] = await Promise.allSettled([
      generateTournamentConcept({ ...values, companyName: branding.companyName ?? undefined }),
    ])

    if (conceptResult.status === 'fulfilled') {
      freshConcept = conceptResult.value
      setConcept(freshConcept)
    }
    setGeneratingConcept(false)

    // Now generate image — with AI data if we got it
    try {
      const dataUrl = await generateTournamentImage(
        {
          ...values,
          headline: freshConcept?.headline,
          subtitle: freshConcept?.subtitle,
          accentColor: freshConcept?.accentColor,
        },
        {
          primaryColor: branding.primaryColor,
          logoUrl: branding.logoUrl,
          companyName: branding.companyName,
        },
      )
      setGeneratedImage(dataUrl)
    } catch {
      // silently ignore
    } finally {
      setGeneratingImage(false)
    }
  }

  function downloadImage() {
    if (!generatedImage) return
    const a = document.createElement('a')
    a.href = generatedImage
    a.download = `torneio-${(watchedName || 'post').toLowerCase().replace(/\s+/g, '-')}.jpg`
    a.click()
  }

  async function copyCaption() {
    if (!concept?.instagramCaption) return
    const full = concept.instagramCaption + '\n\n' + (concept.hashtags?.join(' ') ?? '')
    await navigator.clipboard.writeText(full)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = { ...data, imageUrl: generatedImage || undefined }
      if (isEdit) {
        await tournamentsApi.updateTournament(tournament.id, payload)
        toast.success('Torneio atualizado')
      } else {
        await tournamentsApi.createTournament(payload)
        toast.success('Torneio criado')
      }
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao salvar torneio')
    }
  }

  const maxTeamsLabel = matchType === 'INDIVIDUAL'
    ? 'Máximo de participantes'
    : matchType === 'DOUBLES'
    ? 'Máximo de duplas'
    : 'Máximo de equipes'

  const isGenerating = generatingImage || generatingConcept

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Torneio' : 'Novo Torneio'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* ── Arte gerada por IA ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-orange-500" />
              <p className="text-sm font-medium text-gray-700">Arte gerada por IA</p>
              {concept && (
                <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                  {concept.style}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {generatedImage && (
                <button
                  type="button"
                  onClick={downloadImage}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <Download size={13} />
                  Baixar 1080×1080
                </button>
              )}
              <button
                type="button"
                onClick={triggerAll}
                disabled={!watchedName || !watchedSport || isGenerating}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
                Regenerar
              </button>
            </div>
          </div>

          {/* Image preview */}
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 h-52">
            {generatedImage ? (
              <img src={generatedImage} alt="Arte do torneio" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                {isGenerating ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <p className="text-xs">
                      {generatingConcept ? 'Criando conceito com IA...' : 'Gerando arte...'}
                    </p>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} className="text-orange-300" />
                    <p className="text-xs text-center px-6 leading-relaxed">
                      Preencha o nome e o esporte — a IA cria o conceito<br />visual e gera a arte automaticamente
                    </p>
                  </>
                )}
              </div>
            )}
            {isGenerating && generatedImage && (
              <div className="absolute inset-0 bg-white/50 flex flex-col items-center justify-center gap-1.5">
                <RefreshCw size={18} className="animate-spin text-orange-500" />
                <p className="text-xs text-gray-600">
                  {generatingConcept ? 'Criando conceito...' : 'Gerando arte...'}
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Arte 1080×1080 • Diretor de Arte IA + branding da arena • Pronta para Instagram
          </p>
        </div>

        {/* ── Instagram Caption (shown when AI concept is ready) ── */}
        {concept && (
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📸</span>
                <p className="text-sm font-semibold text-gray-800">Legenda para Instagram</p>
              </div>
              <button
                type="button"
                onClick={copyCaption}
                className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 bg-white border border-orange-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {captionCopied ? <Check size={12} /> : <Copy size={12} />}
                {captionCopied ? 'Copiado!' : 'Copiar tudo'}
              </button>
            </div>

            {/* Caption text */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                {concept.instagramCaption}
              </p>
            </div>

            {/* Hashtags */}
            {concept.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {concept.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-white border border-orange-200 text-orange-600 px-2 py-0.5 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <Input label="Nome" error={errors.name?.message} {...register('name')} />
        <Input label="Esporte" placeholder="ex: Beach Tennis, Futebol" error={errors.sport?.message} {...register('sport')} />

        {/* Match type selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Tipo de confronto</p>
          <div className="grid grid-cols-3 gap-2">
            {MATCH_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('matchType', opt.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                  matchType === opt.value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs text-gray-400 leading-tight hidden sm:block">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Court selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Arena / Quadra</p>
          {courts.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma quadra ativa cadastrada</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
              <label className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                !selectedCourtId ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" className="accent-orange-500" checked={!selectedCourtId} onChange={() => setValue('courtId', null)} />
                <p className={`text-sm font-medium ${!selectedCourtId ? 'text-orange-700' : 'text-gray-700'}`}>Sem arena definida</p>
              </label>
              {courts.map((court) => (
                <label key={court.id} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                  selectedCourtId === court.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" className="accent-orange-500" checked={selectedCourtId === court.id} onChange={() => setValue('courtId', court.id)} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${selectedCourtId === court.id ? 'text-orange-700' : 'text-gray-900'}`}>{court.name}</p>
                    <p className="text-xs text-gray-400">{court.type}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DatePicker label="Data início" error={errors.startDate?.message} {...register('startDate')} />
          <DatePicker label="Data fim" error={errors.endDate?.message} {...register('endDate')} />
        </div>
        <Input label={maxTeamsLabel} type="number" error={errors.maxTeams?.message} {...register('maxTeams')} />
        <Textarea label="Descrição (opcional)" {...register('description')} />
        <Textarea label="Premiação (opcional)" {...register('prizeInfo')} />

        {/* Scoring config */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Pontuação do ranking</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">🥇 1º lugar</label>
              <Input type="number" min="0" error={errors.pointsFirst?.message} {...register('pointsFirst')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">🥈 2º lugar</label>
              <Input type="number" min="0" error={errors.pointsSecond?.message} {...register('pointsSecond')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">🥉 3º lugar</label>
              <Input type="number" min="0" error={errors.pointsThird?.message} {...register('pointsThird')} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
