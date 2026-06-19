import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ImagePlus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { DatePicker } from '../../components/ui/DatePicker'
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
  const [imagePreview, setImagePreview] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    courtsApi.listCourts({ active: true }).then(setCourts).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      setImagePreview(tournament?.imageUrl ?? '')
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

  function loadImageFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas'); return }
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadImageFile(file)
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = { ...data, imageUrl: imagePreview || undefined }
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
        {/* Image upload */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Imagem do torneio</p>
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-40 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setImagePreview('')}
                className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow border border-gray-200 text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) loadImageFile(file)
                }
                input.click()
              }}
              className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                dragging
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              <ImagePlus size={24} className="text-gray-400" />
              <p className="text-sm text-gray-500">Arraste uma imagem ou clique para selecionar</p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF, WEBP, etc.</p>
            </div>
          )}
        </div>

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
