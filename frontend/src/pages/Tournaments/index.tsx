import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trophy, Search, Crown, Medal, ChevronDown, ChevronUp } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { TournamentForm } from './TournamentForm'
import type { Tournament } from '../../types/tournament'
import * as tournamentsApi from '../../api/tournaments.api'
import type { PlayerRankingEntry } from '../../api/tournaments.api'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'
import { formatDate } from '../../utils/date'

const MATCH_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  DOUBLES: 'Duplas',
  TEAM: 'Equipes',
}

export default function TournamentsPage() {
  const [tab, setTab] = useState<'list' | 'ranking'>('list')
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

  const filtered = search.trim()
    ? tournaments.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.sport.toLowerCase().includes(search.toLowerCase())
      )
    : tournaments

  return (
    <Layout title="Torneios">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 border-b border-gray-200 w-full sm:w-auto">
            {(['list', 'ranking'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'list' ? 'Torneios' : 'Ranking de Jogadores'}
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

        {tab === 'ranking' && <PlayerRankingTab />}
      </div>

      <TournamentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
      />
    </Layout>
  )
}

function PlayerRankingTab() {
  const [ranking, setRanking] = useState<PlayerRankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  useEffect(() => {
    tournamentsApi.getPlayerRanking()
      .then(setRanking)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" className="text-orange-500" />
      </div>
    )
  }

  if (ranking.length === 0) {
    return (
      <EmptyState
        icon={<Medal size={48} />}
        title="Nenhum dado de ranking"
        description="O ranking é calculado a partir de torneios finalizados com posições definidas."
      />
    )
  }

  const medalColors: Record<number, string> = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-orange-600',
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        Ranking calculado com base nas posições finais de torneios encerrados.
      </p>

      {ranking.map((player) => {
        const isExpanded = expandedPlayer === player.name
        const medal = player.rank <= 3 ? '🥇🥈🥉'[player.rank - 1] : null

        return (
          <div key={player.name} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedPlayer(isExpanded ? null : player.name)}
            >
              {/* Rank */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                player.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                player.rank === 2 ? 'bg-gray-100 text-gray-600' :
                player.rank === 3 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-50 text-gray-500'
              }`}>
                {medal ?? `#${player.rank}`}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 border-2 border-orange-200 shrink-0">
                {player.name.charAt(0).toUpperCase()}
              </div>

              {/* Name and points */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-gray-900 truncate ${medalColors[player.rank] ?? ''}`}>
                  {player.name}
                </p>
                <p className="text-sm text-gray-500">
                  {player.tournaments.length} torneio{player.tournaments.length !== 1 ? 's' : ''} · {player.points} pts
                </p>
              </div>

              {/* Points badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  player.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  player.rank === 2 ? 'bg-gray-100 text-gray-600' :
                  player.rank === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-orange-50 text-orange-600'
                }`}>
                  {player.points} pts
                </span>
                {isExpanded
                  ? <ChevronUp size={16} className="text-gray-400" />
                  : <ChevronDown size={16} className="text-gray-400" />
                }
              </div>
            </button>

            {/* Expanded history */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico de torneios</p>
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
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
