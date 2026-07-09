import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, ChevronRight, Pencil, Save, Check, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import type { Court } from '../../types/court'
import * as courtsApi from '../../api/courts.api'
import { formatCurrency } from '../../utils/format'

interface CourtPriceEdit {
  pricePerSlot: string
  slotMinutes: string
}

export function CourtsConfigTab({ reloadSignal }: { reloadSignal?: number }) {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [nameEditing, setNameEditing] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [priceEdits, setPriceEdits] = useState<Record<string, CourtPriceEdit>>({})
  const [priceSaving, setPriceSaving] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await courtsApi.listCourts()
      setCourts(data)
      const initial: Record<string, CourtPriceEdit> = {}
      for (const court of data) {
        initial[court.id] = {
          pricePerSlot: String(Number(court.pricePerSlot)),
          slotMinutes: String(court.slotMinutes),
        }
      }
      setPriceEdits(initial)
    } finally {
      setLoading(false)
    }
  }, [])

  // Recarrega ao montar E sempre que o sinal externo mudar (ex: nova quadra criada).
  useEffect(() => { load() }, [load, reloadSignal])

  useEffect(() => {
    if (nameEditing) setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [nameEditing])

  function startNameEdit(court: Court, e: React.MouseEvent) {
    e.stopPropagation()
    setNameEditing(court.id)
    setNameDraft(court.name)
  }

  async function saveName() {
    if (!nameEditing) return
    const name = nameDraft.trim()
    if (!name) { toast.error('Nome não pode estar vazio'); return }
    setNameSaving(true)
    try {
      await courtsApi.updateCourt(nameEditing, { name })
      toast.success('Nome atualizado')
      setNameEditing(null)
      await load()
    } catch {
      toast.error('Erro ao salvar nome')
    } finally {
      setNameSaving(false)
    }
  }

  function cancelNameEdit(e?: React.MouseEvent) {
    e?.stopPropagation()
    setNameEditing(null)
  }

  function setPriceField(courtId: string, field: keyof CourtPriceEdit, value: string) {
    setPriceEdits((prev) => ({ ...prev, [courtId]: { ...prev[courtId], [field]: value } }))
  }

  async function savePrice(court: Court) {
    const edit = priceEdits[court.id]
    if (!edit) return
    const price = Number(edit.pricePerSlot)
    const minutes = Number(edit.slotMinutes)
    if (isNaN(price) || price < 0) { toast.error('Preço inválido'); return }
    if (!minutes || minutes <= 0 || !Number.isInteger(minutes)) {
      toast.error('Intervalo inválido (use minutos inteiros)')
      return
    }
    setPriceSaving((prev) => new Set(prev).add(court.id))
    try {
      await courtsApi.updateCourt(court.id, { pricePerSlot: price, slotMinutes: minutes })
      toast.success('Quadra atualizada')
      await load()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setPriceSaving((prev) => { const n = new Set(prev); n.delete(court.id); return n })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho com botão de atualizar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Preços e duração das quadras</p>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-orange-600 border border-gray-200 hover:border-orange-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
      ) : courts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Nenhuma quadra cadastrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {courts.map((court) => {
        const isExpanded = expanded === court.id
        const isNameEditing = nameEditing === court.id
        const edit = priceEdits[court.id] ?? { pricePerSlot: '0', slotMinutes: '60' }
        const isSaving = priceSaving.has(court.id)
        const isDirty =
          Number(edit.pricePerSlot) !== Number(court.pricePerSlot) ||
          Number(edit.slotMinutes) !== court.slotMinutes

        return (
          <div
            key={court.id}
            className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-orange-200 shadow-sm' : 'border-gray-200'}`}
          >
            <button
              type="button"
              onClick={() => !isNameEditing && setExpanded(isExpanded ? null : court.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
            >
              <div className="flex-1 min-w-0">
                {isNameEditing ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName()
                        if (e.key === 'Escape') cancelNameEdit()
                      }}
                      className="flex-1 min-w-0 rounded-lg border border-orange-400 ring-1 ring-orange-200 px-3 py-1.5 text-sm font-medium text-gray-900 outline-none"
                    />
                    <button
                      onClick={saveName}
                      disabled={nameSaving}
                      className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {nameSaving ? <Spinner size="sm" /> : <Check size={14} />}
                    </button>
                    <button
                      onClick={cancelNameEdit}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">{court.name}</span>
                      {!court.active && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full shrink-0">Inativa</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {!isNameEditing && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{court.type}</span>
                  <span className="text-xs text-gray-500">{formatCurrency(Number(court.pricePerSlot))} · {court.slotMinutes} min</span>
                  <button
                    onClick={(e) => startNameEdit(court, e)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-colors"
                    title="Editar nome da quadra"
                  >
                    <Pencil size={14} />
                  </button>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
                <p className="text-sm font-medium text-gray-700">Preço e duração do slot</p>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Valor por slot (R$)</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">R$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={edit.pricePerSlot}
                        onChange={(e) => setPriceField(court.id, 'pricePerSlot', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Duração do slot</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={edit.slotMinutes}
                        onChange={(e) => setPriceField(court.id, 'slotMinutes', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">min</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => savePrice(court)}
                    loading={isSaving}
                    disabled={!isDirty || isSaving}
                    variant={isDirty ? 'primary' : 'ghost'}
                  >
                    <Save size={13} />
                    {isDirty ? 'Salvar' : 'Salvo'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
        </div>
      )}
    </div>
  )
}
