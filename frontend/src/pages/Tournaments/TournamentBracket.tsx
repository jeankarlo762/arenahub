import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Maximize2, RefreshCw, Trophy } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { Spinner } from '../../components/ui/Spinner'
import * as tournamentsApi from '../../api/tournaments.api'
import type { Tournament } from '../../types/tournament'
import { parsePlayers } from '../../types/tournament'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'
import { formatDate } from '../../utils/date'

const SLOT_H = 64

const ROUND_NAMES: Record<number, string> = {
  2: 'Final',
  4: 'Semifinal',
  8: 'Quartas de Final',
  16: 'Oitavas de Final',
  32: 'Round de 32',
}

interface BracketResult {
  round: number
  matchIndex: number
  winnerId: string | null
}

interface InteractiveBracketMatch {
  team1: Tournament['teams'][0] | null
  team2: Tournament['teams'][0] | null
  winnerId: string | null
  round: number
  matchIndex: number
}

interface BracketRound {
  name: string
  matches: InteractiveBracketMatch[]
  roundIndex: number
}

function parseBracketData(bracketData?: string | null): BracketResult[] {
  if (!bracketData) return []
  try { return JSON.parse(bracketData) as BracketResult[] } catch { return [] }
}

function buildRounds(teams: Tournament['teams'], bracketData: BracketResult[]): BracketRound[] {
  const winnerMap = new Map<string, string | null>()
  for (const b of bracketData) {
    winnerMap.set(`${b.round}_${b.matchIndex}`, b.winnerId)
  }

  const seeded = [...teams].sort((a, b) => (a.groupNumber ?? 999) - (b.groupNumber ?? 999))
  let size = 1
  while (size < seeded.length) size *= 2
  const numRounds = Math.log2(size)
  const rounds: BracketRound[] = []

  for (let r = 0; r < numRounds; r++) {
    const matchCount = size / Math.pow(2, r + 1)
    const teamsInRound = size / Math.pow(2, r)
    const matches: InteractiveBracketMatch[] = []

    for (let m = 0; m < matchCount; m++) {
      let team1: Tournament['teams'][0] | null = null
      let team2: Tournament['teams'][0] | null = null

      if (r === 0) {
        team1 = seeded[m * 2] ?? null
        team2 = seeded[m * 2 + 1] ?? null
      } else {
        const w1Id = winnerMap.get(`${r - 1}_${m * 2}`) ?? null
        const w2Id = winnerMap.get(`${r - 1}_${m * 2 + 1}`) ?? null
        team1 = w1Id ? (teams.find(t => t.id === w1Id) ?? null) : null
        team2 = w2Id ? (teams.find(t => t.id === w2Id) ?? null) : null
      }

      const winnerId = winnerMap.get(`${r}_${m}`) ?? null
      matches.push({ team1, team2, winnerId, round: r, matchIndex: m })
    }

    rounds.push({ name: ROUND_NAMES[teamsInRound] ?? `Round ${r + 1}`, matches, roundIndex: r })
  }

  return rounds
}

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function TournamentBracketPage() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const now = useNow()

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await tournamentsApi.getTournament(id)
      setTournament(data)
      setLastRefresh(new Date())
    } catch {
      // keep old data silently
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [load])

  async function handleClickTeam(match: InteractiveBracketMatch, clicked: Tournament['teams'][0]) {
    if (!id) return
    const newWinnerId = match.winnerId === clicked.id ? null : clicked.id
    const key = `${match.round}_${match.matchIndex}`
    setSavingKey(key)
    try {
      const updated = await tournamentsApi.saveBracketMatch(id, {
        round: match.round,
        matchIndex: match.matchIndex,
        winnerId: newWinnerId,
      })
      setTournament(updated)
    } catch {
      toast.error('Erro ao salvar resultado')
    } finally {
      setSavingKey(null)
    }
  }

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

  const bracketData = parseBracketData(tournament.bracketData)
  const rounds = buildRounds(tournament.teams, bracketData)
  const secondsSinceRefresh = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          {tournament.imageUrl ? (
            <img src={tournament.imageUrl} alt={tournament.name} className="w-12 h-12 rounded-xl object-contain bg-gray-800 border border-gray-700 shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Trophy size={24} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{tournament.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm">{tournament.sport}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400 text-sm">{formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}</span>
              {tournament.court && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-orange-400 text-sm font-medium">{tournament.court.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tournament.status === 'FINISHED' ? 'bg-green-900/50 text-green-400 border border-green-700' :
            tournament.status === 'IN_PROGRESS' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
            'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {TOURNAMENT_STATUS_LABELS[tournament.status]}
          </span>
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <RefreshCw size={12} className={secondsSinceRefresh < 5 ? 'text-green-400 animate-spin' : ''} />
            <span>{secondsSinceRefresh}s</span>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-lg font-mono font-bold text-orange-400">
              {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={enterFullscreen} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Tela cheia">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* Champion banner */}
      {tournament.champion && (
        <div className="bg-gradient-to-r from-yellow-900/40 via-yellow-800/30 to-yellow-900/40 border-b border-yellow-700/50 px-6 py-3 flex items-center justify-center gap-3">
          <span className="text-2xl">🏆</span>
          <div className="text-center">
            <p className="text-xs text-yellow-400/70 uppercase tracking-widest font-semibold">Campeão</p>
            <p className="text-2xl font-bold text-yellow-300">{tournament.champion}</p>
          </div>
          <span className="text-2xl">🏆</span>
        </div>
      )}

      {/* Bracket — centered in viewport */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-6 sm:p-10">
          {tournament.teams.length === 0 ? (
            <div className="flex flex-col items-center gap-4 text-gray-500">
              <Trophy size={56} className="text-gray-700" />
              <p className="text-xl font-medium">Aguardando participantes</p>
              <p className="text-gray-600">{tournament.maxTeams} vagas disponíveis</p>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              {rounds.map((round) => (
                <BracketRoundColumn
                  key={round.roundIndex}
                  round={round}
                  savingKey={savingKey}
                  onClickTeam={handleClickTeam}
                />
              ))}

              {/* Champion slot */}
              <div
                className="flex flex-col shrink-0 ml-2"
                style={{ paddingTop: SLOT_H * (Math.pow(2, rounds.length) - 1) }}
              >
                <div className="text-center text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3 whitespace-nowrap">
                  🏆 Campeão
                </div>
                <div className="w-56 border-2 border-yellow-500 rounded-xl bg-yellow-900/20 px-4 py-4 text-center min-h-[56px] flex items-center justify-center">
                  {tournament.champion
                    ? <p className="font-bold text-yellow-300 text-sm">{tournament.champion}</p>
                    : <p className="text-gray-600 text-xs italic">A definir</p>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-2.5 flex items-center justify-between text-xs text-gray-600 shrink-0">
        <span>ArenaHub — Chaveamento · {tournament.name}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
          Clique em um participante para avançá-lo de fase · Auto-refresh a cada 30s
        </span>
      </div>
    </div>
  )
}

function BracketRoundColumn({
  round,
  savingKey,
  onClickTeam,
}: {
  round: BracketRound
  savingKey: string | null
  onClickTeam: (match: InteractiveBracketMatch, team: Tournament['teams'][0]) => void
}) {
  const paddingTop = SLOT_H * (Math.pow(2, round.roundIndex) - 1)
  const gap = 2 * SLOT_H * (Math.pow(2, round.roundIndex) - 1)

  return (
    <div className="flex flex-col shrink-0" style={{ paddingTop }}>
      <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 whitespace-nowrap">
        {round.name}
      </div>

      <div className="flex flex-col" style={{ gap }}>
        {round.matches.map((match, mIdx) => {
          const key = `${match.round}_${match.matchIndex}`
          const isSaving = savingKey === key
          return (
            <div key={mIdx} className="flex items-center">
              <div className={`w-56 border rounded-xl overflow-hidden bg-gray-900 shadow-lg transition-opacity ${isSaving ? 'opacity-60' : ''} ${
                match.winnerId ? 'border-gray-700' : 'border-gray-700'
              }`}>
                <MatchSlot match={match} teamSlot="team1" onClickTeam={onClickTeam} />
                <div className="border-t border-gray-700" />
                <MatchSlot match={match} teamSlot="team2" onClickTeam={onClickTeam} />
              </div>
              <div className="w-4 h-px bg-gray-700 shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MatchSlot({
  match,
  teamSlot,
  onClickTeam,
}: {
  match: InteractiveBracketMatch
  teamSlot: 'team1' | 'team2'
  onClickTeam: (match: InteractiveBracketMatch, team: Tournament['teams'][0]) => void
}) {
  const team = match[teamSlot]
  const isWinner = !!team && match.winnerId === team.id
  const isLoser = !!team && !!match.winnerId && match.winnerId !== team.id
  const canClick = !!team

  // Pending slot (later round, no winner yet)
  if (!team) {
    return (
      <div className="flex items-center gap-3 px-4 text-gray-600 text-xs italic" style={{ height: SLOT_H }}>
        Aguardando vencedor
      </div>
    )
  }

  const players = parsePlayers(team.players)
  const photo = players[0]?.photo

  return (
    <button
      type="button"
      onClick={() => canClick && onClickTeam(match, team)}
      disabled={!canClick}
      className={`w-full flex items-center gap-3 px-4 text-left transition-all ${
        isWinner
          ? 'bg-green-900/30 hover:bg-green-900/40'
          : isLoser
          ? 'opacity-30 hover:opacity-50'
          : 'hover:bg-gray-800'
      } ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ height: SLOT_H }}
    >
      {/* Avatar */}
      {photo ? (
        <img src={photo} alt={team.name} className="w-9 h-9 rounded-full object-cover border-2 border-gray-600 shrink-0" />
      ) : (
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${
          isWinner
            ? 'bg-green-500/20 border-green-500/60 text-green-400'
            : 'bg-orange-500/20 border-orange-500/40 text-orange-400'
        }`}>
          {team.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${isWinner ? 'text-green-300' : 'text-white'}`}>
          {team.name}
        </p>
        {players.length > 1 && (
          <p className="text-[11px] text-gray-500 truncate">{players.map(p => p.name).join(' · ')}</p>
        )}
        {players.length === 1 && players[0].name !== team.name && (
          <p className="text-[11px] text-gray-500 truncate">{players[0].name}</p>
        )}
      </div>

      {/* Winner indicator */}
      {isWinner && (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}
