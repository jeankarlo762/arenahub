import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Camera } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import * as tournamentsApi from '../../api/tournaments.api'
import type { MatchType, TournamentPlayer } from '../../types/tournament'

interface TeamFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  tournamentId: string
  matchType: MatchType
}

interface PlayerEntry {
  name: string
  photo: string
}

function PlayerPhotoInput({
  player,
  label,
  onChange,
}: {
  player: PlayerEntry
  label: string
  onChange: (p: PlayerEntry) => void
}) {
  function loadPhoto(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens'); return }
    const reader = new FileReader()
    reader.onload = (e) => onChange({ ...player, photo: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <button
        type="button"
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) loadPhoto(file)
          }
          input.click()
        }}
        className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors group"
        title="Foto do jogador"
      >
        {player.photo ? (
          <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 group-hover:bg-orange-50">
            <Camera size={16} className="text-gray-400 group-hover:text-orange-400" />
          </div>
        )}
      </button>

      <input
        type="text"
        placeholder={label}
        value={player.name}
        onChange={(e) => onChange({ ...player, name: e.target.value })}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
      />

      {player.photo && (
        <button
          type="button"
          onClick={() => onChange({ ...player, photo: '' })}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="Remover foto"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function TeamForm({ open, onClose, onSuccess, tournamentId, matchType }: TeamFormProps) {
  const [name, setName] = useState('')
  const [doubles, setDoubles] = useState<[PlayerEntry, PlayerEntry]>([
    { name: '', photo: '' },
    { name: '', photo: '' },
  ])
  const [individual, setIndividual] = useState<PlayerEntry>({ name: '', photo: '' })
  const [players, setPlayers] = useState<PlayerEntry[]>([{ name: '', photo: '' }, { name: '', photo: '' }])
  const [saving, setSaving] = useState(false)

  function addPlayer() { setPlayers((p) => [...p, { name: '', photo: '' }]) }
  function removePlayer(i: number) { setPlayers((p) => p.filter((_, idx) => idx !== i)) }
  function updatePlayer(i: number, val: PlayerEntry) {
    setPlayers((p) => p.map((v, idx) => (idx === i ? val : v)))
  }

  function reset() {
    setName('')
    setIndividual({ name: '', photo: '' })
    setDoubles([{ name: '', photo: '' }, { name: '', photo: '' }])
    setPlayers([{ name: '', photo: '' }, { name: '', photo: '' }])
  }

  function toPlayer(p: PlayerEntry): TournamentPlayer {
    return { name: p.name.trim(), ...(p.photo ? { photo: p.photo } : {}) }
  }

  async function handleSave() {
    let teamName = ''
    let teamPlayers: TournamentPlayer[] = []

    if (matchType === 'INDIVIDUAL') {
      if (!individual.name.trim()) { toast.error('Nome do participante obrigatório'); return }
      teamName = individual.name.trim()
      teamPlayers = [toPlayer(individual)]
    } else if (matchType === 'DOUBLES') {
      if (!doubles[0].name.trim() || !doubles[1].name.trim()) {
        toast.error('Informe os dois jogadores da dupla')
        return
      }
      teamName = `${doubles[0].name.trim()} / ${doubles[1].name.trim()}`
      teamPlayers = doubles.map(toPlayer)
    } else {
      const valid = players.filter((p) => p.name.trim())
      if (!name.trim()) { toast.error('Nome da equipe obrigatório'); return }
      if (valid.length === 0) { toast.error('Adicione pelo menos um jogador'); return }
      teamName = name.trim()
      teamPlayers = valid.map(toPlayer)
    }

    setSaving(true)
    try {
      await tournamentsApi.addTeam(tournamentId, { name: teamName, players: teamPlayers })
      toast.success(
        matchType === 'INDIVIDUAL' ? 'Participante adicionado'
        : matchType === 'DOUBLES' ? 'Dupla adicionada'
        : 'Equipe adicionada',
      )
      reset()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg ?? 'Erro ao adicionar')
    } finally {
      setSaving(false)
    }
  }

  const title =
    matchType === 'INDIVIDUAL' ? 'Adicionar Participante'
    : matchType === 'DOUBLES' ? 'Adicionar Dupla'
    : 'Adicionar Equipe'

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose() }} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Adicionar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* INDIVIDUAL */}
        {matchType === 'INDIVIDUAL' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">Clique no círculo para adicionar foto</p>
            <PlayerPhotoInput
              player={individual}
              label="Nome do participante"
              onChange={setIndividual}
            />
          </div>
        )}

        {/* DOUBLES */}
        {matchType === 'DOUBLES' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">Os nomes serão combinados. Clique no círculo para foto.</p>
            <PlayerPhotoInput player={doubles[0]} label="Jogador 1" onChange={(v) => setDoubles([v, doubles[1]])} />
            <PlayerPhotoInput player={doubles[1]} label="Jogador 2" onChange={(v) => setDoubles([doubles[0], v])} />
          </div>
        )}

        {/* TEAM */}
        {matchType === 'TEAM' && (
          <>
            <Input
              label="Nome da Equipe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Areia Quente"
            />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Jogadores (nome + foto)</p>
              <div className="flex flex-col gap-2">
                {players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <PlayerPhotoInput
                      player={p}
                      label={`Jogador ${i + 1}`}
                      onChange={(v) => updatePlayer(i, v)}
                    />
                    {players.length > 1 && (
                      <button onClick={() => removePlayer(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addPlayer}
                className="mt-2 flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
              >
                + Adicionar jogador
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
