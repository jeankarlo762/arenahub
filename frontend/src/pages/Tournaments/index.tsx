import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trophy, Search, Crown, Users, ChevronDown, ChevronUp, Pencil, Trash2, UserPlus } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TournamentForm } from './TournamentForm'
import { PlayerForm } from './PlayerForm'
import type { Tournament } from '../../types/tournament'
import * as tournamentsApi from '../../api/tournaments.api'
import * as playersApi from '../../api/players.api'
import type { Player } from '../../api/players.api'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'
import { formatDate } from '../../utils/date'
import toast from 'react-hot-toast'

const MATCH_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  DOUBLES: 'Duplas',
  TEAM: 'Equipes',
}

export default function TournamentsPage() {
  const [tab, setTab] = useState<'list' | 'players'>('list')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tournamentsApi.listTournaments()
      setTournaments(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function normalize(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  }

  const filtered = search.trim()
    ? tournaments.filter(t => {
        const q = normalize(search)
        return normalize(t.name).includes(q) || normalize(t.sport).includes(q)
      })
    : tournaments

  return (
    <Layout title="Torneios">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 border-b border-gray-200 w-full sm:w-auto">
            {(['list', 'players'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'list' ? 'Torneios' : 'Jogadores'}
              </button>
            ))}
          </div>
          {tab === 'list' && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Novo Torneio
            </Button>
          )}
        </div>

        {tab === 'list' && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar torneio ou esporte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" className="text-orange-500" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Trophy size={48} />}
                title={search ? 'Nenhum torneio encontrado' : 'Nenhum torneio cadastrado'}
                action={!search ? { label: 'Novo Torneio', onClick: () => setFormOpen(true) } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col cursor-pointer hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
                    onClick={() => navigate(`/tournaments/${t.id}`)}
                  >
                    {t.imageUrl ? (
                      <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={t.imageUrl} alt={t.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-20 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                        <Trophy size={32} className="text-white opacity-60" />
                      </div>
                    )}

                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                          <p className="text-sm text-gray-500">{t.sport} · {MATCH_TYPE_LABELS[t.matchType] ?? 'Equipes'}</p>
                        </div>
                        <Badge label={TOURNAMENT_STATUS_LABELS[t.status]} status={t.status} />
                      </div>

                      <div className="text-sm text-gray-600 flex flex-col gap-1">
                        <p>{formatDate(t.startDate)} – {formatDate(t.endDate)}</p>
                        <p>{t._count?.teams ?? t.teams?.length ?? 0} / {t.maxTeams} participantes</p>
                        {t.prizeInfo && <p className="text-xs text-gray-400 truncate">{t.prizeInfo}</p>}
                      </div>

                      {t.champion && (
                        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                          <Crown size={14} className="text-yellow-500 shrink-0" />
                          <span className="text-sm font-semibold text-yellow-700 truncate">{t.champion}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'players' && <PlayersTab />}
      </div>

      <TournamentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
      />
    </Layout>
  )
}

const MATCH_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'DOUBLES', label: 'Duplas' },
  { value: 'TEAM', label: 'Equipes' },
]

function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sportFilter, setSportFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [removing, setRemoving] = useState<Player | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    playersApi.listPlayers()
      .then(setPlayers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    if (!removing) return
    try {
      await playersApi.deletePlayer(removing.id)
      toast.success('Jogador removido')
      setRemoving(null)
      load()
    } catch {
      toast.error('Erro ao remover')
    }
  }

  // Distinct sports (modalidades) across all players' tournament history
  const sports = Array.from(
    new Set(players.flatMap((p) => p.tournaments.map((t) => t.sport)).filter(Boolean)),
  ).sort()

  const filtered = players.filter((p) => {
    if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && !p.tournaments.some((t) => t.matchType === typeFilter)) return false
    if (sportFilter !== 'all' && !p.tournaments.some((t) => t.sport === sportFilter)) return false
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-gray-500 flex-1">
          Lista de jogadores com ranking e pontuação de torneios encerrados.
        </p>
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <UserPlus size={16} /> Novo Jogador
        </Button>
      </div>

      {/* Filtros tipo + modalidade */}
      <div className="flex items-end gap-3 flex-wrap">
        <Select
          label="Tipo"
          options={MATCH_TYPE_FILTERS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-44"
        />
        <Select
          label="Modalidade"
          options={[{ value: 'all', label: 'Todas as modalidades' }, ...sports.map((s) => ({ value: s, label: s }))]}
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="w-52"
        />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title={search ? 'Nenhum jogador encontrado' : 'Nenhum jogador cadastrado'}
          description={!search ? 'Cadastre jogadores para acompanhar seu ranking e pontuação.' : undefined}
          action={!search ? { label: 'Novo Jogador', onClick: () => { setEditing(null); setFormOpen(true) } } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((player, idx) => {
            const isExpanded = expanded === player.id
            const rank = idx + 1
            const medal = rank <= 3 && player.points > 0 ? '🥇🥈🥉'[rank - 1] : null
            return (
              <div key={player.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div
                  className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : player.id)}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    medal && rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    medal && rank === 2 ? 'bg-gray-100 text-gray-600' :
                    medal && rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {medal ?? `#${rank}`}
                  </div>

                  {/* Avatar */}
                  {player.photo ? (
                    <img src={player.photo} alt={player.name} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-orange-200 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 border-2 border-orange-200 shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{player.name}</p>
                      {!player.registered && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline">não cadastrado</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {player.age != null ? `${player.age} anos · ` : ''}
                      {player.tournamentCount} torneio{player.tournamentCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Points */}
                  <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold shrink-0 ${
                    player.points > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {player.points} pts
                  </span>

                  {/* Actions (desktop only — mobile actions appear inside expanded section) */}
                  {player.registered && (
                    <div className="hidden sm:flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditing(player); setFormOpen(true) }}
                        className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setRemoving(player)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}

                  <span className="p-1 text-gray-400 shrink-0 pointer-events-none">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 pb-4 pt-3">
                    {/* Mobile actions */}
                    {player.registered && (
                      <div className="sm:hidden flex gap-2 mb-3">
                        <button
                          onClick={() => { setEditing(player); setFormOpen(true) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:border-orange-400 hover:text-orange-500 transition-colors"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                        <button
                          onClick={() => setRemoving(player)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} /> Remover
                        </button>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico de torneios</p>
                    {player.tournaments.length === 0 ? (
                      <p className="text-sm text-gray-400">Ainda não participou de torneios encerrados.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {player.tournaments.map((entry, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{entry.tournamentName}</p>
                              <p className="text-xs text-gray-400">{formatDate(entry.date)}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {entry.position ? (
                                <span className="text-sm text-gray-600">
                                  {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `${entry.position}º`}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Posição não definida</span>
                              )}
                              <span className={`text-sm font-semibold ${entry.points > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                +{entry.points} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <PlayerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        player={editing}
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleDelete}
        title="Remover jogador"
        message={`Deseja remover ${removing?.name}? O histórico em torneios não será afetado.`}
        confirmLabel="Remover"
      />
    </div>
  )
}
