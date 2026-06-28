import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Maximize2, RefreshCw } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import * as tournamentsApi from '../../api/tournaments.api'
import type { Tournament, TournamentTeam } from '../../types/tournament'
import { parsePlayers } from '../../types/tournament'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'
import { formatDate } from '../../utils/date'

const GROUP_COLORS = [
  { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  { bg: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700' },
  { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
]

const MATCH_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  DOUBLES: 'Duplas',
  TEAM: 'Equipes',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  FINISHED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function TournamentTVPage() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const now = useNow()

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await tournamentsApi.getTournament(id)
      setTournament(data)
      setLastRefresh(new Date())
    } catch {
      // silently keep old data
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  function enterFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Spinner size="lg" className="text-orange-500" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-lg">
        Torneio não encontrado
      </div>
    )
  }

  const teamsWithGroup = tournament.teams.filter((t) => t.groupNumber)
  const grouped = teamsWithGroup.reduce<Record<number, TournamentTeam[]>>((acc, t) => {
    const g = t.groupNumber!
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  const groups = Object.entries(grouped)
    .filter(([g]) => Number(g) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))

  const noGroupTeams = tournament.teams.filter((t) => !t.groupNumber)

  const secondsSinceRefresh = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-8 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-none">{tournament.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-gray-400 text-sm">{tournament.sport}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400 text-sm">{MATCH_TYPE_LABELS[tournament.matchType] ?? 'Equipes'}</span>
              {tournament.court && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-orange-400 text-sm font-medium">{tournament.court.name}</span>
                </>
              )}
              <span className="text-gray-600">·</span>
              <span className="text-gray-400 text-sm">{formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[tournament.status] ?? 'bg-gray-700 text-gray-300'}`}>
            {TOURNAMENT_STATUS_LABELS[tournament.status]}
          </span>

          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <RefreshCw size={13} className={secondsSinceRefresh < 5 ? 'text-green-400 animate-spin' : ''} />
            <span>Atualizado há {secondsSinceRefresh}s</span>
          </div>

          <button
            onClick={enterFullscreen}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Tela cheia"
          >
            <Maximize2 size={18} />
          </button>

          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-orange-400">
              {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-gray-500">
              {now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8">
        {groups.length === 0 && noGroupTeams.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="text-6xl">🏆</div>
            <p className="text-2xl font-medium">Aguardando início do torneio</p>
            <p className="text-gray-600">{tournament.teams.length} participante(s) inscrito(s)</p>
          </div>
        )}

        {groups.length === 0 && noGroupTeams.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-300 mb-6">
              Participantes inscritos — {noGroupTeams.length} / {tournament.maxTeams}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {noGroupTeams.map((team, idx) => {
                const players = parsePlayers(team.players)
                const photo = players[0]?.photo
                return (
                  <div key={team.id} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col items-center text-center">
                    {photo ? (
                      <img src={photo} alt={team.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-600 mb-3" />
                    ) : (
                      <div className="text-3xl font-bold text-gray-500 mb-2">#{idx + 1}</div>
                    )}
                    <p className="text-lg font-bold text-white">{team.name}</p>
                    {players.length > 1 && (
                      <p className="text-sm text-gray-400 mt-1">{players.map(p => p.name).join(', ')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div
            className="grid gap-6 h-full"
            style={{
              gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, 1fr)`,
            }}
          >
            {groups.map(([groupNum, groupTeams], idx) => {
              const color = GROUP_COLORS[idx % GROUP_COLORS.length]
              return (
                <div
                  key={groupNum}
                  className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col"
                >
                  {/* Group header */}
                  <div className={`${color.bg} px-6 py-4`}>
                    <h3 className="text-2xl font-bold text-white">Grupo {groupNum}</h3>
                    <p className="text-white/70 text-sm mt-0.5">{groupTeams.length} participante(s)</p>
                  </div>

                  {/* Participants */}
                  <div className="flex-1 p-4 flex flex-col gap-3">
                    {groupTeams.map((team, pos) => {
                      const players = parsePlayers(team.players)
                      const photo = players[0]?.photo
                      return (
                        <div
                          key={team.id}
                          className="bg-gray-800 rounded-xl px-5 py-4 flex items-center gap-4 border border-gray-700"
                        >
                          {photo ? (
                            <img src={photo} alt={team.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-600 shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                              {pos + 1}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-lg font-bold text-white truncate">{team.name}</p>
                            {players.length > 1 && (
                              <p className="text-sm text-gray-400 truncate">{players.map(p => p.name).join(' · ')}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-8 py-3 flex items-center justify-between text-xs text-gray-600">
        <span>MT Quadras — May Tecnologia · Sistema de Gestão de Quadras Esportivas</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
          Atualização automática a cada 30 segundos
        </span>
      </div>
    </div>
  )
}
