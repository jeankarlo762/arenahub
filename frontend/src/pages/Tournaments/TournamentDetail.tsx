import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Shuffle, Trash2, ArrowLeft, Tv, Crown, Network, Users } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TeamForm } from './TeamForm'
import type { Tournament, TournamentStatus } from '../../types/tournament'
import { parsePlayers } from '../../types/tournament'
import * as tournamentsApi from '../../api/tournaments.api'
import { formatDate } from '../../utils/date'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'

interface TournamentDetailProps {
  tournament: Tournament
  onRefresh: () => void
}

const STATUS_FLOW: Record<TournamentStatus, TournamentStatus | null> = {
  DRAFT: 'OPEN',
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'FINISHED',
  FINISHED: null,
  CANCELLED: null,
}

const STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: 'Abrir Inscrições',
  OPEN: 'Iniciar Torneio',
  IN_PROGRESS: 'Finalizar Torneio',
  FINISHED: '',
  CANCELLED: '',
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  DOUBLES: 'Duplas',
  TEAM: 'Equipes',
}

export function TournamentDetail({ tournament, onRefresh }: TournamentDetailProps) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'teams' | 'bracket'>('teams')
  const [teamFormOpen, setTeamFormOpen] = useState(false)
  const [removeTeamId, setRemoveTeamId] = useState<string | null>(null)
  const [drawingBracket, setDrawingBracket] = useState(false)
  const [drawingPairs, setDrawingPairs] = useState(false)
  const [playersPerTeam, setPlayersPerTeam] = useState('5')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [championInput, setChampionInput] = useState(tournament.champion ?? '')
  const [savingChampion, setSavingChampion] = useState(false)

  const matchType = tournament.matchType ?? 'TEAM'
  const hasBracketDraw = tournament.teams.some((t) => t.groupNumber)
  const nextStatus = STATUS_FLOW[tournament.status]
  const canSetChampion = tournament.status === 'IN_PROGRESS' || tournament.status === 'FINISHED'
  const isEditable = tournament.status !== 'FINISHED' && tournament.status !== 'CANCELLED'

  const participantLabel =
    matchType === 'INDIVIDUAL' ? 'Participantes'
    : matchType === 'DOUBLES' ? 'Duplas'
    : 'Equipes'

  const addLabel =
    matchType === 'INDIVIDUAL' ? 'Adicionar Participante'
    : matchType === 'DOUBLES' ? 'Adicionar Jogador'
    : 'Adicionar Equipe'

  async function handleStatusChange() {
    if (!nextStatus) return
    setUpdatingStatus(true)
    try {
      await tournamentsApi.updateTournamentStatus(tournament.id, nextStatus)
      toast.success('Status atualizado')
      onRefresh()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleDrawBracket() {
    setDrawingBracket(true)
    try {
      await tournamentsApi.performDraw(tournament.id)
      toast.success('Confrontos sorteados!')
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao sortear')
    } finally {
      setDrawingBracket(false)
    }
  }

  async function handleDrawPairs() {
    setDrawingPairs(true)
    try {
      await tournamentsApi.drawPairs(tournament.id)
      toast.success('Duplas sorteadas!')
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao sortear duplas')
    } finally {
      setDrawingPairs(false)
    }
  }

  async function handleDrawTeams() {
    const n = parseInt(playersPerTeam, 10)
    if (!n || n < 2) { toast.error('Mínimo 2 jogadores por equipe'); return }
    setDrawingPairs(true)
    try {
      await tournamentsApi.drawTeamGroups(tournament.id, n)
      toast.success('Equipes sorteadas!')
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao sortear equipes')
    } finally {
      setDrawingPairs(false)
    }
  }

  async function handleRemoveTeam() {
    if (!removeTeamId) return
    try {
      await tournamentsApi.removeTeam(tournament.id, removeTeamId)
      toast.success('Removido')
      setRemoveTeamId(null)
      onRefresh()
    } catch {
      toast.error('Erro ao remover')
    }
  }

  async function handleSaveChampion() {
    setSavingChampion(true)
    try {
      await tournamentsApi.setChampion(tournament.id, championInput.trim() || null)
      toast.success('Campeão definido')
      onRefresh()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSavingChampion(false)
    }
  }

  function openBracket() {
    window.open(`/tournaments/${tournament.id}/bracket`, '_blank', 'width=1400,height=900')
  }

  return (
    <Layout title={tournament.name} breadcrumb="Torneios">
      <div className="flex flex-col gap-6">

        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/tournaments')}>
            <ArrowLeft size={16} /> Voltar
          </Button>
          <Badge label={TOURNAMENT_STATUS_LABELS[tournament.status]} status={tournament.status} />
          {nextStatus && (
            <Button size="sm" loading={updatingStatus} onClick={handleStatusChange}>
              {STATUS_LABELS[tournament.status]}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={openBracket}>
              <Network size={15} /> Exibir Chaveamento
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.open(`/tournaments/${tournament.id}/tv`, '_blank')}>
              <Tv size={15} /> TV
            </Button>
          </div>
        </div>

        {/* Tournament info card */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            {tournament.imageUrl && (
              <div className="w-full sm:w-40 h-32 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                <img src={tournament.imageUrl} alt={tournament.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500 text-xs">Esporte</p><p className="font-semibold">{tournament.sport}</p></div>
              <div><p className="text-gray-500 text-xs">Formato</p><p className="font-semibold">{MATCH_TYPE_LABELS[matchType]}</p></div>
              {tournament.court && (
                <div>
                  <p className="text-gray-500 text-xs">Arena</p>
                  <p className="font-semibold">{tournament.court.name}</p>
                  <p className="text-xs text-gray-400">{tournament.court.type}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs">Período</p>
                <p className="font-semibold">{formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">{participantLabel}</p>
                <p className="font-semibold">{tournament.teams.length} / {tournament.maxTeams}</p>
              </div>
              {tournament.prizeInfo && (
                <div><p className="text-gray-500 text-xs">Premiação</p><p className="font-semibold">{tournament.prizeInfo}</p></div>
              )}
            </div>
          </div>
        </Card>

        {/* Champion section */}
        {canSetChampion && (
          <Card>
            <div className="flex items-start gap-3 flex-wrap">
              <Crown size={18} className="text-yellow-500 shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Campeão</p>
                {tournament.champion && (
                  <p className="text-lg font-bold text-yellow-600 mt-0.5">{tournament.champion}</p>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Nome do campeão..."
                  value={championInput}
                  onChange={(e) => setChampionInput(e.target.value)}
                  className="flex-1 sm:w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveChampion()}
                />
                <Button size="sm" loading={savingChampion} onClick={handleSaveChampion}>Salvar</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          {(['teams', 'bracket'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'teams' ? participantLabel : 'Chaveamento'}
            </button>
          ))}
        </div>

        {/* ── Tab: Participantes/Duplas/Equipes ── */}
        {tab === 'teams' && (
          <div className="flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-gray-600 flex-1">
                {tournament.teams.length} {participantLabel.toLowerCase()} inscrito(s)
              </p>

              {/* Sortear Duplas / Equipes */}
              {isEditable && matchType === 'DOUBLES' && tournament.teams.length >= 2 && (
                <Button variant="secondary" size="sm" loading={drawingPairs} onClick={handleDrawPairs}>
                  <Shuffle size={14} /> Sortear Duplas
                </Button>
              )}
              {isEditable && matchType === 'TEAM' && tournament.teams.length >= 2 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                    <span className="text-xs text-gray-500 px-2 whitespace-nowrap">
                      <Users size={12} className="inline mr-1" />p/equipe
                    </span>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={playersPerTeam}
                      onChange={(e) => setPlayersPerTeam(e.target.value)}
                      className="w-12 py-1.5 text-sm text-center border-l border-gray-300 outline-none focus:border-orange-400"
                    />
                  </div>
                  <Button variant="secondary" size="sm" loading={drawingPairs} onClick={handleDrawTeams}>
                    <Shuffle size={14} /> Sortear Equipes
                  </Button>
                </div>
              )}

              {isEditable && (
                <Button size="sm" onClick={() => setTeamFormOpen(true)} disabled={tournament.teams.length >= tournament.maxTeams}>
                  <Plus size={14} /> {addLabel}
                </Button>
              )}
            </div>

            {tournament.teams.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                {matchType === 'INDIVIDUAL' ? 'Nenhum participante inscrito'
                  : matchType === 'DOUBLES' ? 'Nenhum jogador inscrito — adicione jogadores individualmente para sortear duplas'
                  : 'Nenhuma equipe inscrita'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tournament.teams.map((team) => {
                  const players = parsePlayers(team.players)
                  const isChampion = tournament.champion === team.name
                  return (
                    <div key={team.id} className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-3 ${isChampion ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {players[0]?.photo && (
                            <img src={players[0].photo} alt={team.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
                          )}
                          <p className="font-medium text-gray-900">{team.name}</p>
                          {isChampion && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Crown size={10} /> Campeão
                            </span>
                          )}
                        </div>
                        {matchType === 'TEAM' && players.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {players.map((p, i) => (
                              <div key={i} className="flex items-center gap-1">
                                {p.photo
                                  ? <img src={p.photo} alt={p.name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                                  : <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">{p.name.charAt(0).toUpperCase()}</div>
                                }
                                <span className="text-xs text-gray-500">{p.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {matchType === 'DOUBLES' && players.length === 2 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {players.map((p, i) => (
                              <div key={i} className="flex items-center gap-1">
                                {p.photo
                                  ? <img src={p.photo} alt={p.name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                                  : <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">{p.name.charAt(0).toUpperCase()}</div>
                                }
                                <span className="text-xs text-gray-500">{p.name}</span>
                                {i === 0 && <span className="text-gray-300 text-xs">/</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {team.groupNumber && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                            Seed #{team.groupNumber}
                          </span>
                        )}
                      </div>
                      {isEditable && (
                        <button onClick={() => setRemoveTeamId(team.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Chaveamento ── */}
        {tab === 'bracket' && (
          <div className="flex flex-col gap-6">
            {/* Sortear Confronto */}
            {isEditable && (
              <div className="flex items-center gap-3">
                <Button loading={drawingBracket} onClick={handleDrawBracket}>
                  <Shuffle size={16} />
                  {hasBracketDraw ? 'Refazer Sorteio de Confrontos' : 'Sortear Confrontos'}
                </Button>
                <p className="text-sm text-gray-500">
                  {hasBracketDraw
                    ? 'Sorteio realizado — clique para refazer'
                    : 'Sorteia aleatoriamente quem enfrenta quem na 1ª rodada'}
                </p>
              </div>
            )}

            {!hasBracketDraw ? (
              <div className="text-center py-12 text-gray-400">
                <Network size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Nenhum sorteio de confrontos realizado ainda.</p>
                {isEditable && <p className="text-xs mt-1">Clique em "Sortear Confrontos" para definir os confrontos da 1ª rodada.</p>}
              </div>
            ) : (
              <>
                {/* Confrontos 1ª rodada */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Confrontos da 1ª Rodada</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {buildFirstRoundMatches(tournament.teams).map((match, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Jogo {i + 1}</div>
                        <MatchSlotRow team={match.team1} seed={match.seed1} matchType={matchType} />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-xs font-bold text-gray-400">VS</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <MatchSlotRow team={match.team2} seed={match.seed2} matchType={matchType} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual bracket */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">Chaveamento Completo</h3>
                  <BracketPreview teams={tournament.teams} champion={tournament.champion ?? null} matchType={matchType} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <TeamForm
        open={teamFormOpen}
        onClose={() => setTeamFormOpen(false)}
        onSuccess={onRefresh}
        tournamentId={tournament.id}
        matchType={matchType}
      />

      <ConfirmDialog
        open={!!removeTeamId}
        onClose={() => setRemoveTeamId(null)}
        onConfirm={handleRemoveTeam}
        title="Remover"
        message="Deseja remover este registro do torneio?"
        confirmLabel="Remover"
      />
    </Layout>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FirstRoundMatch {
  team1: Tournament['teams'][0]
  team2: Tournament['teams'][0] | null
  seed1: number
  seed2: number
}

function buildFirstRoundMatches(teams: Tournament['teams']): FirstRoundMatch[] {
  const seeded = [...teams]
    .filter(t => t.groupNumber)
    .sort((a, b) => (a.groupNumber ?? 0) - (b.groupNumber ?? 0))
  const unseeded = teams.filter(t => !t.groupNumber)
  const ordered = [...seeded, ...unseeded]

  const matches: FirstRoundMatch[] = []
  for (let i = 0; i < ordered.length; i += 2) {
    matches.push({
      team1: ordered[i],
      team2: ordered[i + 1] ?? null,
      seed1: i + 1,
      seed2: i + 2,
    })
  }
  return matches
}

function MatchSlotRow({ team, seed, matchType }: { team: Tournament['teams'][0] | null; seed: number; matchType: string }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 text-gray-300 text-sm italic">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-300">{seed}</div>
        <span>BYE</span>
      </div>
    )
  }
  const players = parsePlayers(team.players)
  const photo = players[0]?.photo
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">{seed}</div>
      {photo
        ? <img src={photo} alt={team.name} className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0" />
        : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{team.name.charAt(0).toUpperCase()}</div>
      }
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{team.name}</p>
        {matchType === 'TEAM' && players.length > 1 && (
          <p className="text-[11px] text-gray-400 truncate">{players.map(p => p.name).join(', ')}</p>
        )}
      </div>
    </div>
  )
}

// ─── Bracket preview ──────────────────────────────────────────────────────────

const SLOT_H = 48

interface BracketPreviewProps {
  teams: Tournament['teams']
  champion: string | null
  matchType: string
}

function BracketPreview({ teams, champion, matchType }: BracketPreviewProps) {
  if (teams.length === 0) return null
  const rounds = buildBracketRounds(teams)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start gap-1 min-w-max">
        {rounds.map((round, rIdx) => (
          <div key={rIdx} className="flex flex-col shrink-0" style={{ paddingTop: SLOT_H * (Math.pow(2, rIdx) - 1) }}>
            <div className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 whitespace-nowrap">
              {round.name}
            </div>
            <div className="flex flex-col" style={{ gap: 2 * SLOT_H * (Math.pow(2, rIdx) - 1) }}>
              {round.matches.map((match, mIdx) => (
                <div key={mIdx} className="flex items-center">
                  <div className="w-44 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <BracketSlotCell team={match.team1} isPending={rIdx > 0} seed={mIdx * 2 + 1} matchType={matchType} />
                    <div className="border-t border-gray-200" />
                    <BracketSlotCell team={match.team2} isPending={rIdx > 0} seed={mIdx * 2 + 2} matchType={matchType} />
                  </div>
                  {rIdx < rounds.length - 1 && <div className="w-4 border-t border-gray-300" />}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Champion slot */}
        <div className="flex flex-col shrink-0 ml-1" style={{ paddingTop: SLOT_H * (Math.pow(2, rounds.length) - 1) }}>
          <div className="text-center text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-2 whitespace-nowrap">🏆 Campeão</div>
          <div className="w-44 border-2 border-yellow-400 rounded-lg px-3 py-3 bg-yellow-50 text-center min-h-[40px] flex items-center justify-center">
            {champion
              ? <p className="text-sm font-bold text-yellow-700">{champion}</p>
              : <p className="text-xs text-gray-400">A definir</p>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

interface BracketMatch { team1: Tournament['teams'][0] | null; team2: Tournament['teams'][0] | null }
interface BracketRound { name: string; matches: BracketMatch[] }

const ROUND_NAMES: Record<number, string> = { 2: 'Final', 4: 'Semifinal', 8: 'Quartas', 16: 'Oitavas', 32: 'Round 32' }

function buildBracketRounds(teams: Tournament['teams']): BracketRound[] {
  const seeded = [...teams].sort((a, b) => (a.groupNumber ?? 999) - (b.groupNumber ?? 999))
  let size = 1
  while (size < seeded.length) size *= 2
  const rounds: BracketRound[] = []
  for (let r = 0; r < Math.log2(size); r++) {
    const matchCount = size / Math.pow(2, r + 1)
    const teamsInRound = size / Math.pow(2, r)
    const matches: BracketMatch[] = []
    for (let m = 0; m < matchCount; m++) {
      matches.push(r === 0
        ? { team1: seeded[m * 2] ?? null, team2: seeded[m * 2 + 1] ?? null }
        : { team1: null, team2: null }
      )
    }
    rounds.push({ name: ROUND_NAMES[teamsInRound] ?? `R${r + 1}`, matches })
  }
  return rounds
}

function BracketSlotCell({ team, isPending, seed, matchType }: { team: Tournament['teams'][0] | null; isPending: boolean; seed: number; matchType: string }) {
  if (isPending) {
    return (
      <div className="flex items-center gap-2 px-3 text-gray-400 italic text-xs" style={{ height: SLOT_H }}>
        Vencedor #{seed}
      </div>
    )
  }
  if (!team) {
    return <div className="flex items-center px-3 text-gray-300 text-xs italic" style={{ height: SLOT_H }}>BYE</div>
  }
  const players = parsePlayers(team.players)
  const photo = players[0]?.photo
  return (
    <div className="flex items-center gap-2 px-3" style={{ height: SLOT_H }}>
      {photo
        ? <img src={photo} alt={team.name} className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0" />
        : <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">{team.name.charAt(0).toUpperCase()}</div>
      }
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">{team.name}</p>
        {matchType === 'TEAM' && players.length > 1 && (
          <p className="text-[10px] text-gray-400 truncate">{players.map(p => p.name).join(', ')}</p>
        )}
      </div>
    </div>
  )
}
